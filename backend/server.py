from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Form, Depends, Request
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Literal
import uuid
from datetime import datetime, timezone, timedelta
from emergentintegrations.llm.chat import LlmChat, UserMessage
import json
import re
import aiofiles
import httpx
import ipaddress
from urllib.parse import urlparse
from auth import OptionalUserId, RequiredUserId, ClerkAuthError
from engagement_hub import create_engagement_router
from subscription import (
    get_default_subscription,
    get_default_usage,
    get_usage_limit,
    has_feature_access,
    get_effective_tier,
    is_in_grace_period,
    get_grace_period_hours_remaining,
    should_reset_monthly_usage,
    get_reset_usage_data,
    get_pricing_for_currency,
    get_price_amount,
    USAGE_LIMITS,
    FEATURE_ACCESS,
    CURRENCY_CONFIG,
    DEFAULT_CURRENCY,
    CheckoutRequest,
    SubscriptionResponse,
    UsageResponse,
)
from stripe_service import (
    SubscriptionStripeService,
    get_subscription_update_from_checkout,
    get_subscription_cancellation_update,
    get_subscription_reactivation_update,
    get_payment_failed_update,
    get_payment_succeeded_update,
    get_subscription_expired_update,
)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create uploads directory
UPLOAD_DIR = ROOT_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

# Create the main app
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============== Security: SSRF Protection ==============

# File upload configuration
ALLOWED_FILE_EXTENSIONS = {'txt', 'md', 'pdf', 'doc', 'docx'}
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10MB max file size

def is_safe_url(url: str) -> tuple[bool, str]:
    """
    Validate URL for SSRF protection.
    Returns (is_safe, error_message).
    Blocks internal IPs, localhost, and potentially dangerous schemes.
    """
    try:
        parsed = urlparse(url)

        # Only allow http and https schemes
        if parsed.scheme not in ('http', 'https'):
            return False, "Only HTTP and HTTPS URLs are allowed"

        hostname = parsed.hostname
        if not hostname:
            return False, "Invalid URL: no hostname"

        # Block localhost variations
        localhost_patterns = [
            'localhost',
            '127.0.0.1',
            '0.0.0.0',
            '::1',
            '[::1]',
        ]
        if hostname.lower() in localhost_patterns:
            return False, "Localhost URLs are not allowed"

        # Try to resolve hostname to check for internal IPs
        # First check if hostname is already an IP address
        try:
            ip = ipaddress.ip_address(hostname)
            if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved:
                return False, "Internal or reserved IP addresses are not allowed"
        except ValueError:
            # Not a direct IP, it's a hostname - this is fine
            # DNS rebinding attacks are possible but this provides basic protection
            pass

        # Block cloud metadata endpoints
        metadata_hosts = [
            '169.254.169.254',  # AWS/GCP/Azure metadata
            'metadata.google.internal',
            'metadata.gcp.internal',
        ]
        if hostname.lower() in metadata_hosts or hostname.startswith('169.254.'):
            return False, "Cloud metadata endpoints are not allowed"

        return True, ""

    except Exception as e:
        return False, f"Invalid URL: {str(e)}"

def validate_file_extension(filename: str) -> tuple[bool, str]:
    """Validate file extension against whitelist."""
    if '.' not in filename:
        return False, "File must have an extension"
    ext = filename.rsplit('.', 1)[-1].lower()
    if ext not in ALLOWED_FILE_EXTENSIONS:
        return False, f"File type '.{ext}' not allowed. Allowed types: {', '.join(ALLOWED_FILE_EXTENSIONS)}"
    return True, ext

def mask_sensitive_value(value: Optional[str], visible_chars: int = 4) -> Optional[str]:
    """Mask a sensitive value, showing only the last N characters."""
    if not value:
        return None
    if len(value) <= visible_chars:
        return '*' * len(value)
    return '*' * (len(value) - visible_chars) + value[-visible_chars:]

# ============== Models ==============

class User(BaseModel):
    """User model synced from Clerk"""
    model_config = ConfigDict(extra="ignore")
    id: str  # Clerk user ID
    email: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    image_url: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserSync(BaseModel):
    """Request body for syncing user from Clerk"""
    email: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    image_url: Optional[str] = None

class UserSettings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str  # Clerk user ID - required for multi-user isolation
    ai_provider: Literal["anthropic", "openai", "gemini"] = "anthropic"
    ai_model: str = "claude-sonnet-4-5-20250929"
    api_key: Optional[str] = None
    use_emergent_key: bool = True
    # LinkedIn Integration
    linkedin_connected: bool = False
    linkedin_access_token: Optional[str] = None
    linkedin_user_id: Optional[str] = None
    linkedin_name: Optional[str] = None
    linkedin_token_expires: Optional[str] = None
    # LinkedIn API Credentials (user-provided)
    linkedin_client_id: Optional[str] = None
    linkedin_client_secret: Optional[str] = None
    linkedin_redirect_uri: Optional[str] = None
    # Subscription data
    subscription: dict = Field(default_factory=get_default_subscription)
    # Usage tracking data
    usage: dict = Field(default_factory=get_default_usage)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserSettingsUpdate(BaseModel):
    ai_provider: Optional[Literal["anthropic", "openai", "gemini"]] = None
    ai_model: Optional[str] = None
    api_key: Optional[str] = None
    use_emergent_key: Optional[bool] = None
    linkedin_connected: Optional[bool] = None
    linkedin_access_token: Optional[str] = None
    linkedin_user_id: Optional[str] = None
    linkedin_name: Optional[str] = None
    linkedin_token_expires: Optional[str] = None
    linkedin_client_id: Optional[str] = None
    linkedin_client_secret: Optional[str] = None
    linkedin_redirect_uri: Optional[str] = None

class UserSettingsResponse(BaseModel):
    """Response model for user settings with sensitive data masked"""
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    ai_provider: Literal["anthropic", "openai", "gemini"]
    ai_model: str
    api_key_masked: Optional[str] = None  # Masked version of API key
    has_api_key: bool = False  # Indicates if user has set an API key
    use_emergent_key: bool
    linkedin_connected: bool
    linkedin_user_id: Optional[str] = None
    linkedin_name: Optional[str] = None
    linkedin_token_expires: Optional[str] = None
    linkedin_client_id: Optional[str] = None
    linkedin_client_secret_masked: Optional[str] = None  # Masked
    linkedin_redirect_uri: Optional[str] = None
    subscription: dict
    usage: dict
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_settings(cls, settings: UserSettings) -> "UserSettingsResponse":
        """Create a response model from settings, masking sensitive data"""
        return cls(
            id=settings.id,
            user_id=settings.user_id,
            ai_provider=settings.ai_provider,
            ai_model=settings.ai_model,
            api_key_masked=mask_sensitive_value(settings.api_key) if settings.api_key else None,
            has_api_key=bool(settings.api_key),
            use_emergent_key=settings.use_emergent_key,
            linkedin_connected=settings.linkedin_connected,
            linkedin_user_id=settings.linkedin_user_id,
            linkedin_name=settings.linkedin_name,
            linkedin_token_expires=settings.linkedin_token_expires,
            linkedin_client_id=settings.linkedin_client_id,
            linkedin_client_secret_masked=mask_sensitive_value(settings.linkedin_client_secret) if settings.linkedin_client_secret else None,
            linkedin_redirect_uri=settings.linkedin_redirect_uri,
            subscription=settings.subscription,
            usage=settings.usage,
            created_at=settings.created_at,
            updated_at=settings.updated_at,
        )

# Inspiration URL Model
class InspirationUrl(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str  # Clerk user ID
    url: str
    title: Optional[str] = None
    is_favorite: bool = False
    use_count: int = 1
    last_used: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Voice Profile Model
class VoiceProfile(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str  # Clerk user ID
    name: str = "Default Voice"
    tone: str = "professional"
    vocabulary_style: str = "business"
    sentence_structure: str = "varied"
    personality_traits: List[str] = Field(default_factory=lambda: ["confident", "helpful"])
    avoid_phrases: List[str] = Field(default_factory=list)
    preferred_phrases: List[str] = Field(default_factory=list)
    signature_expressions: List[str] = Field(default_factory=list)
    example_posts: List[str] = Field(default_factory=list)
    industry_context: str = ""
    target_audience: str = ""
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class VoiceProfileCreate(BaseModel):
    name: str
    tone: str = "professional"
    vocabulary_style: str = "business"
    sentence_structure: str = "varied"
    personality_traits: List[str] = Field(default_factory=list)
    avoid_phrases: List[str] = Field(default_factory=list)
    preferred_phrases: List[str] = Field(default_factory=list)
    signature_expressions: List[str] = Field(default_factory=list)
    example_posts: List[str] = Field(default_factory=list)
    industry_context: str = ""
    target_audience: str = ""

class VoiceProfileUpdate(BaseModel):
    name: Optional[str] = None
    tone: Optional[str] = None
    vocabulary_style: Optional[str] = None
    sentence_structure: Optional[str] = None
    personality_traits: Optional[List[str]] = None
    avoid_phrases: Optional[List[str]] = None
    preferred_phrases: Optional[List[str]] = None
    signature_expressions: Optional[List[str]] = None
    example_posts: Optional[List[str]] = None
    industry_context: Optional[str] = None
    target_audience: Optional[str] = None
    is_active: Optional[bool] = None

class Post(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str  # Clerk user ID
    title: str = ""
    content: str = ""
    hook: str = ""
    rehook: str = ""
    framework: Literal["slay", "pas"] = "slay"
    framework_sections: dict = Field(default_factory=dict)
    pillar: Literal["growth", "tam", "sales"] = "growth"
    status: Literal["draft", "scheduled", "published"] = "draft"
    scheduled_date: Optional[str] = None
    scheduled_slot: Optional[int] = None
    scheduled_time: Optional[str] = None
    published_at: Optional[str] = None
    engagement_timer_start: Optional[str] = None
    word_count: int = 0
    hook_word_count: int = 0
    linkedin_post_id: Optional[str] = None
    linkedin_post_url: Optional[str] = None
    views: int = 0
    likes: int = 0
    comments: int = 0
    shares: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PostCreate(BaseModel):
    title: str = ""
    content: str = ""
    hook: str = ""
    rehook: str = ""
    framework: Literal["slay", "pas"] = "slay"
    framework_sections: dict = Field(default_factory=dict)
    pillar: Literal["growth", "tam", "sales"] = "growth"
    status: Literal["draft", "scheduled", "published"] = "draft"
    scheduled_date: Optional[str] = None
    scheduled_slot: Optional[int] = None
    scheduled_time: Optional[str] = None

class PostUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    hook: Optional[str] = None
    rehook: Optional[str] = None
    framework: Optional[Literal["slay", "pas"]] = None
    framework_sections: Optional[dict] = None
    pillar: Optional[Literal["growth", "tam", "sales"]] = None
    status: Optional[Literal["draft", "scheduled", "published"]] = None
    scheduled_date: Optional[str] = None
    scheduled_slot: Optional[int] = None
    scheduled_time: Optional[str] = None
    published_at: Optional[str] = None
    engagement_timer_start: Optional[str] = None
    views: Optional[int] = None
    likes: Optional[int] = None
    comments: Optional[int] = None
    shares: Optional[int] = None

class ContentGenerationRequest(BaseModel):
    topic: str
    framework: Literal["slay", "pas"] = "slay"
    pillar: Literal["growth", "tam", "sales"] = "growth"
    context: Optional[str] = None

class HookValidationRequest(BaseModel):
    hook: str

class HookValidationResponse(BaseModel):
    is_valid: bool
    word_count: int
    suggestions: List[str]
    score: int

class TopicSuggestion(BaseModel):
    topic: str
    pillar: Literal["growth", "tam", "sales"]
    framework: Literal["slay", "pas"]
    angle: str

# Knowledge Vault Models
class KnowledgeItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str  # Clerk user ID
    title: str
    content: str = ""
    source_type: Literal["text", "url", "pdf", "transcript", "voice_note", "sop"] = "text"
    source_url: Optional[str] = None
    file_path: Optional[str] = None
    extracted_gems: List[str] = Field(default_factory=list)
    tags: List[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class KnowledgeItemCreate(BaseModel):
    title: str
    content: str = ""
    source_type: Literal["text", "url", "pdf", "transcript", "voice_note", "sop"] = "text"
    source_url: Optional[str] = None
    tags: List[str] = Field(default_factory=list)

class KnowledgeItemUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    tags: Optional[List[str]] = None
    extracted_gems: Optional[List[str]] = None

# Performance Analytics Models
class PerformanceMetrics(BaseModel):
    total_posts: int = 0
    published_posts: int = 0
    avg_engagement: float = 0.0
    pillar_performance: dict = Field(default_factory=dict)
    framework_performance: dict = Field(default_factory=dict)
    best_performing_posts: List[dict] = Field(default_factory=list)
    weekly_trend: List[dict] = Field(default_factory=list)

# ============== Helper Functions ==============

def serialize_datetime(obj):
    """Convert datetime to ISO string for MongoDB"""
    if isinstance(obj, datetime):
        return obj.isoformat()
    return obj

def deserialize_datetime(doc):
    """Convert ISO string back to datetime"""
    if doc and 'created_at' in doc and isinstance(doc['created_at'], str):
        doc['created_at'] = datetime.fromisoformat(doc['created_at'])
    if doc and 'updated_at' in doc and isinstance(doc['updated_at'], str):
        doc['updated_at'] = datetime.fromisoformat(doc['updated_at'])
    return doc

async def get_user_settings(user_id: str):
    """Get or create user settings for a specific user"""
    settings = await db.user_settings.find_one({"user_id": user_id}, {"_id": 0})
    if not settings:
        default_settings = UserSettings(user_id=user_id)
        doc = default_settings.model_dump()
        doc['created_at'] = serialize_datetime(doc['created_at'])
        doc['updated_at'] = serialize_datetime(doc['updated_at'])
        await db.user_settings.insert_one(doc)
        return default_settings
    return UserSettings(**deserialize_datetime(settings))

async def get_llm_chat(user_id: str, session_id: str, system_message: str):
    """Initialize LLM chat with user's configured provider"""
    settings = await get_user_settings(user_id)
    
    if settings.use_emergent_key:
        api_key = os.environ.get('EMERGENT_LLM_KEY')
    else:
        api_key = settings.api_key
    
    if not api_key:
        raise HTTPException(status_code=400, detail="No API key configured. Please set your API key in settings or enable Emergent Key.")
    
    chat = LlmChat(
        api_key=api_key,
        session_id=session_id,
        system_message=system_message
    )
    chat.with_model(settings.ai_provider, settings.ai_model)
    return chat

# ============== Auth Routes ==============

@api_router.get("/auth/me")
async def get_current_user(user_id: RequiredUserId):
    """Get current authenticated user info"""
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@api_router.post("/auth/sync")
async def sync_user(user_data: UserSync, user_id: RequiredUserId):
    """Sync user data from Clerk to database"""
    existing_user = await db.users.find_one({"id": user_id}, {"_id": 0})
    
    now = datetime.now(timezone.utc)
    if existing_user:
        # Update existing user
        update_data = {
            "email": user_data.email,
            "first_name": user_data.first_name,
            "last_name": user_data.last_name,
            "image_url": user_data.image_url,
            "updated_at": serialize_datetime(now)
        }
        await db.users.update_one({"id": user_id}, {"$set": update_data})
    else:
        # Create new user
        user = User(
            id=user_id,
            email=user_data.email,
            first_name=user_data.first_name,
            last_name=user_data.last_name,
            image_url=user_data.image_url,
            created_at=now,
            updated_at=now
        )
        doc = user.model_dump()
        doc['created_at'] = serialize_datetime(doc['created_at'])
        doc['updated_at'] = serialize_datetime(doc['updated_at'])
        await db.users.insert_one(doc)
    
    # Ensure user has settings
    await get_user_settings(user_id)
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    return {"success": True, "user": user}

# ============== Settings Routes ==============

@api_router.get("/settings", response_model=UserSettingsResponse)
async def get_settings(user_id: RequiredUserId):
    """Get user settings with sensitive data masked for security"""
    settings = await get_user_settings(user_id)
    return UserSettingsResponse.from_settings(settings)

@api_router.put("/settings", response_model=UserSettingsResponse)
async def update_settings(update: UserSettingsUpdate, user_id: RequiredUserId):
    """Update user settings. Sensitive fields can be updated but will be masked in response."""
    settings = await get_user_settings(user_id)
    update_data = update.model_dump(exclude_unset=True)

    if update_data:
        update_data['updated_at'] = serialize_datetime(datetime.now(timezone.utc))
        await db.user_settings.update_one(
            {"user_id": user_id},
            {"$set": update_data}
        )

    updated_settings = await get_user_settings(user_id)
    return UserSettingsResponse.from_settings(updated_settings)

# ============== Posts Routes ==============

@api_router.get("/posts", response_model=List[Post])
async def get_posts(user_id: RequiredUserId, status: Optional[str] = None):
    query = {"user_id": user_id}
    if status:
        query["status"] = status
    posts = await db.posts.find(query, {"_id": 0}).to_list(1000)
    return [Post(**deserialize_datetime(p)) for p in posts]

@api_router.get("/posts/{post_id}", response_model=Post)
async def get_post(post_id: str, user_id: RequiredUserId):
    post = await db.posts.find_one({"id": post_id, "user_id": user_id}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return Post(**deserialize_datetime(post))

@api_router.post("/posts", response_model=Post)
async def create_post(post_create: PostCreate, user_id: RequiredUserId):
    post = Post(user_id=user_id, **post_create.model_dump())
    post.word_count = len(post.content.split()) if post.content else 0
    post.hook_word_count = len(post.hook.split()) if post.hook else 0
    
    doc = post.model_dump()
    doc['created_at'] = serialize_datetime(doc['created_at'])
    doc['updated_at'] = serialize_datetime(doc['updated_at'])
    
    await db.posts.insert_one(doc)
    return post

@api_router.put("/posts/{post_id}", response_model=Post)
async def update_post(post_id: str, update: PostUpdate, user_id: RequiredUserId):
    post = await db.posts.find_one({"id": post_id, "user_id": user_id}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    update_data = update.model_dump(exclude_unset=True)
    if update_data:
        update_data['updated_at'] = serialize_datetime(datetime.now(timezone.utc))
        
        if 'content' in update_data:
            update_data['word_count'] = len(update_data['content'].split()) if update_data['content'] else 0
        if 'hook' in update_data:
            update_data['hook_word_count'] = len(update_data['hook'].split()) if update_data['hook'] else 0
        
        await db.posts.update_one({"id": post_id, "user_id": user_id}, {"$set": update_data})
    
    updated_post = await db.posts.find_one({"id": post_id, "user_id": user_id}, {"_id": 0})
    return Post(**deserialize_datetime(updated_post))

@api_router.delete("/posts/{post_id}")
async def delete_post(post_id: str, user_id: RequiredUserId):
    result = await db.posts.delete_one({"id": post_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Post not found")
    return {"message": "Post deleted successfully"}

# ============== Post Scheduling Routes ==============

@api_router.post("/posts/{post_id}/schedule")
async def schedule_post(post_id: str, scheduled_date: str, scheduled_slot: int, user_id: RequiredUserId, scheduled_time: Optional[str] = None):
    """Schedule a post to a specific date and slot"""
    post = await db.posts.find_one({"id": post_id, "user_id": user_id}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    # Check if slot is available for this user
    existing = await db.posts.find_one({
        "user_id": user_id,
        "scheduled_date": scheduled_date,
        "scheduled_slot": scheduled_slot,
        "id": {"$ne": post_id}
    }, {"_id": 0})
    
    if existing:
        raise HTTPException(status_code=400, detail="This slot is already taken")
    
    update_data = {
        "scheduled_date": scheduled_date,
        "scheduled_slot": scheduled_slot,
        "scheduled_time": scheduled_time,
        "status": "scheduled",
        "updated_at": serialize_datetime(datetime.now(timezone.utc))
    }
    
    await db.posts.update_one({"id": post_id, "user_id": user_id}, {"$set": update_data})
    updated_post = await db.posts.find_one({"id": post_id, "user_id": user_id}, {"_id": 0})
    return Post(**deserialize_datetime(updated_post))

@api_router.post("/posts/{post_id}/publish")
async def publish_post(post_id: str, user_id: RequiredUserId):
    """Mark a post as published and start engagement timer"""
    post = await db.posts.find_one({"id": post_id, "user_id": user_id}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    now = datetime.now(timezone.utc)
    update_data = {
        "status": "published",
        "published_at": serialize_datetime(now),
        "engagement_timer_start": serialize_datetime(now),
        "updated_at": serialize_datetime(now)
    }
    
    await db.posts.update_one({"id": post_id, "user_id": user_id}, {"$set": update_data})
    updated_post = await db.posts.find_one({"id": post_id, "user_id": user_id}, {"_id": 0})
    return Post(**deserialize_datetime(updated_post))

@api_router.post("/posts/{post_id}/unschedule")
async def unschedule_post(post_id: str, user_id: RequiredUserId):
    """Remove scheduling from a post"""
    post = await db.posts.find_one({"id": post_id, "user_id": user_id}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    update_data = {
        "scheduled_date": None,
        "scheduled_slot": None,
        "scheduled_time": None,
        "status": "draft",
        "updated_at": serialize_datetime(datetime.now(timezone.utc))
    }
    
    await db.posts.update_one({"id": post_id, "user_id": user_id}, {"$set": update_data})
    updated_post = await db.posts.find_one({"id": post_id, "user_id": user_id}, {"_id": 0})
    return Post(**deserialize_datetime(updated_post))

# ============== Engagement Timer Routes ==============

@api_router.get("/engagement/active")
async def get_active_engagement(user_id: RequiredUserId):
    """Get posts with active engagement timers (published in last 30 minutes)"""
    thirty_mins_ago = datetime.now(timezone.utc) - timedelta(minutes=30)
    
    posts = await db.posts.find({
        "user_id": user_id,
        "status": "published",
        "engagement_timer_start": {"$exists": True, "$ne": None}
    }, {"_id": 0}).to_list(100)
    
    active_posts = []
    for post in posts:
        timer_start = post.get("engagement_timer_start")
        if timer_start:
            if isinstance(timer_start, str):
                timer_start = datetime.fromisoformat(timer_start.replace('Z', '+00:00'))
            if timer_start > thirty_mins_ago:
                remaining = 30 - (datetime.now(timezone.utc) - timer_start).total_seconds() / 60
                post['engagement_remaining_minutes'] = max(0, remaining)
                active_posts.append(Post(**deserialize_datetime(post)))
    
    return active_posts

@api_router.post("/posts/{post_id}/engagement-metrics")
async def update_engagement_metrics(post_id: str, user_id: RequiredUserId, views: int = 0, likes: int = 0, comments: int = 0, shares: int = 0):
    """Update engagement metrics for a post"""
    post = await db.posts.find_one({"id": post_id, "user_id": user_id}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    update_data = {
        "views": views,
        "likes": likes,
        "comments": comments,
        "shares": shares,
        "updated_at": serialize_datetime(datetime.now(timezone.utc))
    }
    
    await db.posts.update_one({"id": post_id, "user_id": user_id}, {"$set": update_data})
    updated_post = await db.posts.find_one({"id": post_id, "user_id": user_id}, {"_id": 0})
    return Post(**deserialize_datetime(updated_post))

# ============== Calendar Routes ==============

@api_router.get("/calendar/week")
async def get_week_calendar(user_id: RequiredUserId, week_offset: int = 0):
    """Get posts for a specific week (0 = current week)"""
    today = datetime.now(timezone.utc)
    start_of_week = today - timedelta(days=today.weekday()) + timedelta(weeks=week_offset)
    
    week_dates = []
    for i in range(7):
        date = start_of_week + timedelta(days=i)
        week_dates.append(date.strftime("%Y-%m-%d"))
    
    posts = await db.posts.find(
        {"user_id": user_id, "scheduled_date": {"$in": week_dates}},
        {"_id": 0}
    ).to_list(100)
    
    calendar = {}
    for date in week_dates:
        calendar[date] = {"slots": [None, None, None, None], "date": date}
    
    for post in posts:
        date = post.get("scheduled_date")
        slot = post.get("scheduled_slot", 0)
        if date in calendar and 0 <= slot < 4:
            calendar[date]["slots"][slot] = Post(**deserialize_datetime(post))
    
    return {
        "week_start": week_dates[0],
        "week_end": week_dates[6],
        "days": list(calendar.values())
    }

# ============== Knowledge Vault Routes ==============

@api_router.get("/knowledge", response_model=List[KnowledgeItem])
async def get_knowledge_items(user_id: RequiredUserId, source_type: Optional[str] = None):
    """Get all knowledge items for the user"""
    query = {"user_id": user_id}
    if source_type:
        query["source_type"] = source_type
    items = await db.knowledge_vault.find(query, {"_id": 0}).to_list(1000)
    return [KnowledgeItem(**deserialize_datetime(i)) for i in items]

@api_router.get("/knowledge/{item_id}", response_model=KnowledgeItem)
async def get_knowledge_item(item_id: str, user_id: RequiredUserId):
    """Get a single knowledge item"""
    item = await db.knowledge_vault.find_one({"id": item_id, "user_id": user_id}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Knowledge item not found")
    return KnowledgeItem(**deserialize_datetime(item))

@api_router.post("/knowledge", response_model=KnowledgeItem)
async def create_knowledge_item(item_create: KnowledgeItemCreate, user_id: RequiredUserId):
    """Create a new knowledge item"""
    item = KnowledgeItem(user_id=user_id, **item_create.model_dump())
    
    doc = item.model_dump()
    doc['created_at'] = serialize_datetime(doc['created_at'])
    doc['updated_at'] = serialize_datetime(doc['updated_at'])
    
    await db.knowledge_vault.insert_one(doc)
    return item

@api_router.post("/knowledge/upload")
async def upload_knowledge_file(
    user_id: RequiredUserId,
    file: UploadFile = File(...),
    title: str = Form(...),
    source_type: str = Form("pdf"),
    tags: str = Form("")
):
    """Upload a file to the knowledge vault"""
    # Security: Validate filename exists
    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename is required")

    # Security: Validate file extension against whitelist
    is_valid, ext_or_error = validate_file_extension(file.filename)
    if not is_valid:
        raise HTTPException(status_code=400, detail=ext_or_error)
    file_ext = ext_or_error

    # Security: Check file size before reading entire file into memory
    # Read in chunks to enforce size limit
    file_id = str(uuid.uuid4())
    file_path = UPLOAD_DIR / f"{user_id}_{file_id}.{file_ext}"

    content = b""
    total_size = 0
    chunk_size = 64 * 1024  # 64KB chunks

    while True:
        chunk = await file.read(chunk_size)
        if not chunk:
            break
        total_size += len(chunk)
        if total_size > MAX_FILE_SIZE_BYTES:
            raise HTTPException(
                status_code=413,
                detail=f"File too large. Maximum size is {MAX_FILE_SIZE_BYTES // (1024 * 1024)}MB"
            )
        content += chunk

    # Write validated file
    async with aiofiles.open(file_path, 'wb') as f:
        await f.write(content)

    text_content = ""
    if file_ext in ['txt', 'md']:
        text_content = content.decode('utf-8', errors='ignore')
    elif file_ext == 'pdf':
        text_content = f"[PDF file uploaded: {file.filename}]"

    tag_list = [t.strip() for t in tags.split(',') if t.strip()]
    item = KnowledgeItem(
        user_id=user_id,
        title=title,
        content=text_content,
        source_type=source_type,
        file_path=str(file_path),
        tags=tag_list
    )

    doc = item.model_dump()
    doc['created_at'] = serialize_datetime(doc['created_at'])
    doc['updated_at'] = serialize_datetime(doc['updated_at'])

    await db.knowledge_vault.insert_one(doc)
    return item

@api_router.post("/knowledge/url")
async def add_knowledge_from_url(url: str, title: str, user_id: RequiredUserId, tags: List[str] = []):
    """Add content from a URL to the knowledge vault"""
    # SSRF Protection: Validate URL before fetching
    is_safe, error_msg = is_safe_url(url)
    if not is_safe:
        raise HTTPException(status_code=400, detail=f"Invalid URL: {error_msg}")

    try:
        async with httpx.AsyncClient(follow_redirects=False) as client:
            response = await client.get(url, timeout=30.0)
            # Check for redirects to internal IPs
            if response.is_redirect:
                redirect_url = str(response.headers.get('location', ''))
                is_redirect_safe, _ = is_safe_url(redirect_url)
                if not is_redirect_safe:
                    raise HTTPException(status_code=400, detail="URL redirects to disallowed location")
            response.raise_for_status()
            content = response.text[:50000]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch URL {url}: {str(e)}")
        raise HTTPException(status_code=400, detail="Failed to fetch URL. Please check the URL and try again.")
    
    item = KnowledgeItem(
        user_id=user_id,
        title=title,
        content=content,
        source_type="url",
        source_url=url,
        tags=tags
    )
    
    doc = item.model_dump()
    doc['created_at'] = serialize_datetime(doc['created_at'])
    doc['updated_at'] = serialize_datetime(doc['updated_at'])
    
    await db.knowledge_vault.insert_one(doc)
    return item

@api_router.put("/knowledge/{item_id}", response_model=KnowledgeItem)
async def update_knowledge_item(item_id: str, update: KnowledgeItemUpdate, user_id: RequiredUserId):
    """Update a knowledge item"""
    item = await db.knowledge_vault.find_one({"id": item_id, "user_id": user_id}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Knowledge item not found")
    
    update_data = update.model_dump(exclude_unset=True)
    if update_data:
        update_data['updated_at'] = serialize_datetime(datetime.now(timezone.utc))
        await db.knowledge_vault.update_one({"id": item_id, "user_id": user_id}, {"$set": update_data})
    
    updated_item = await db.knowledge_vault.find_one({"id": item_id, "user_id": user_id}, {"_id": 0})
    return KnowledgeItem(**deserialize_datetime(updated_item))

@api_router.delete("/knowledge/{item_id}")
async def delete_knowledge_item(item_id: str, user_id: RequiredUserId):
    """Delete a knowledge item"""
    item = await db.knowledge_vault.find_one({"id": item_id, "user_id": user_id}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Knowledge item not found")
    
    if item.get('file_path'):
        file_path = Path(item['file_path'])
        if file_path.exists():
            file_path.unlink()
    
    await db.knowledge_vault.delete_one({"id": item_id, "user_id": user_id})
    return {"message": "Knowledge item deleted successfully"}

@api_router.post("/knowledge/{item_id}/extract-gems")
async def extract_gems(item_id: str, user_id: RequiredUserId):
    """Use AI to extract monetizable expertise gems from a knowledge item"""
    item = await db.knowledge_vault.find_one({"id": item_id, "user_id": user_id}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Knowledge item not found")
    
    system_message = """You are an expert at identifying monetizable expertise from content.
    
Analyze the provided content and extract 5-7 "gems" - specific insights, experiences, or expertise that could be turned into LinkedIn posts.

For each gem, provide:
1. A specific insight or story angle
2. The type of post it would make (authority, story, how-to, case study)
3. A potential hook

Output as JSON array:
[
  {"gem": "...", "post_type": "...", "potential_hook": "..."},
  ...
]
"""

    try:
        chat = await get_llm_chat(
            user_id=user_id,
            session_id=f"gem-extract-{uuid.uuid4()}",
            system_message=system_message
        )
        
        content = item.get('content', '')[:10000]
        response = await chat.send_message(UserMessage(text=f"Extract monetizable expertise gems from this content:\n\n{content}"))
        
        json_match = re.search(r'\[[\s\S]*\]', response)
        if json_match:
            gems_data = json.loads(json_match.group())
            gems = [g.get('gem', '') for g in gems_data if g.get('gem')]
            
            await db.knowledge_vault.update_one(
                {"id": item_id, "user_id": user_id},
                {"$set": {
                    "extracted_gems": gems,
                    "updated_at": serialize_datetime(datetime.now(timezone.utc))
                }}
            )
            
            return {"gems": gems_data}
        
        return {"gems": []}
    except Exception as e:
        logger.error(f"Gem extraction error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to extract gems. Please try again.")

# ============== Inspiration URL Routes ==============

@api_router.get("/inspiration-urls", response_model=List[InspirationUrl])
async def get_inspiration_urls(user_id: RequiredUserId, favorites_only: bool = False):
    """Get inspiration URL history for the user"""
    query = {"user_id": user_id}
    if favorites_only:
        query["is_favorite"] = True
    urls = await db.inspiration_urls.find(query, {"_id": 0}).sort("last_used", -1).to_list(50)
    return [InspirationUrl(**u) for u in urls]

@api_router.post("/inspiration-urls")
async def save_inspiration_url(url: str, user_id: RequiredUserId, title: Optional[str] = None):
    """Save or update an inspiration URL"""
    existing = await db.inspiration_urls.find_one({"url": url, "user_id": user_id}, {"_id": 0})
    
    if existing:
        await db.inspiration_urls.update_one(
            {"url": url, "user_id": user_id},
            {"$set": {"last_used": serialize_datetime(datetime.now(timezone.utc))}, "$inc": {"use_count": 1}}
        )
        updated = await db.inspiration_urls.find_one({"url": url, "user_id": user_id}, {"_id": 0})
        return InspirationUrl(**updated)
    
    inspiration = InspirationUrl(user_id=user_id, url=url, title=title)
    doc = inspiration.model_dump()
    doc['last_used'] = serialize_datetime(doc['last_used'])
    doc['created_at'] = serialize_datetime(doc['created_at'])
    
    await db.inspiration_urls.insert_one(doc)
    return inspiration

@api_router.put("/inspiration-urls/{url_id}/favorite")
async def toggle_favorite_url(url_id: str, user_id: RequiredUserId):
    """Toggle favorite status for an inspiration URL"""
    url_doc = await db.inspiration_urls.find_one({"id": url_id, "user_id": user_id}, {"_id": 0})
    if not url_doc:
        raise HTTPException(status_code=404, detail="URL not found")
    
    new_status = not url_doc.get("is_favorite", False)
    await db.inspiration_urls.update_one(
        {"id": url_id, "user_id": user_id},
        {"$set": {"is_favorite": new_status}}
    )
    
    updated = await db.inspiration_urls.find_one({"id": url_id, "user_id": user_id}, {"_id": 0})
    return InspirationUrl(**updated)

@api_router.delete("/inspiration-urls/{url_id}")
async def delete_inspiration_url(url_id: str, user_id: RequiredUserId):
    """Delete an inspiration URL from history"""
    result = await db.inspiration_urls.delete_one({"id": url_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="URL not found")
    return {"message": "URL deleted"}

@api_router.post("/inspiration-urls/{url_id}/to-vault")
async def save_inspiration_to_vault(url_id: str, user_id: RequiredUserId):
    """Save an inspiration URL to the Knowledge Vault"""
    url_doc = await db.inspiration_urls.find_one({"id": url_id, "user_id": user_id}, {"_id": 0})
    if not url_doc:
        raise HTTPException(status_code=404, detail="URL not found")
    
    url = url_doc.get("url")
    title = url_doc.get("title") or f"Inspiration: {url[:50]}..."
    
    existing = await db.knowledge_vault.find_one({"source_url": url, "user_id": user_id}, {"_id": 0})
    if existing:
        return {"message": "URL already in Knowledge Vault", "item": KnowledgeItem(**deserialize_datetime(existing))}
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, timeout=30.0, follow_redirects=True)
            response.raise_for_status()
            content = response.text[:50000]
    except Exception as e:
        logger.error(f"Failed to fetch inspiration URL {url}: {str(e)}")
        raise HTTPException(status_code=400, detail="Failed to fetch URL. Please check the URL and try again.")
    
    item = KnowledgeItem(
        user_id=user_id,
        title=title,
        content=content,
        source_type="url",
        source_url=url,
        tags=["inspiration"]
    )
    
    doc = item.model_dump()
    doc['created_at'] = serialize_datetime(doc['created_at'])
    doc['updated_at'] = serialize_datetime(doc['updated_at'])
    
    await db.knowledge_vault.insert_one(doc)
    return {"message": "Saved to Knowledge Vault", "item": item}

# ============== Performance Analytics Routes ==============

@api_router.get("/analytics/performance", response_model=PerformanceMetrics)
async def get_performance_metrics(user_id: RequiredUserId):
    """Get comprehensive performance analytics for the user"""
    all_posts = await db.posts.find({"user_id": user_id}, {"_id": 0}).to_list(1000)
    published_posts = [p for p in all_posts if p.get('status') == 'published']
    
    pillar_stats = {"growth": [], "tam": [], "sales": []}
    framework_stats = {"slay": [], "pas": []}
    
    for post in published_posts:
        engagement = post.get('likes', 0) + post.get('comments', 0) * 2 + post.get('shares', 0) * 3
        pillar = post.get('pillar', 'growth')
        framework = post.get('framework', 'slay')
        
        pillar_stats[pillar].append(engagement)
        framework_stats[framework].append(engagement)
    
    def calc_avg(arr):
        return sum(arr) / len(arr) if arr else 0
    
    pillar_performance = {
        pillar: {
            "count": len(stats),
            "avg_engagement": calc_avg(stats),
            "total_engagement": sum(stats)
        }
        for pillar, stats in pillar_stats.items()
    }
    
    framework_performance = {
        framework: {
            "count": len(stats),
            "avg_engagement": calc_avg(stats),
            "total_engagement": sum(stats)
        }
        for framework, stats in framework_stats.items()
    }
    
    sorted_posts = sorted(
        published_posts,
        key=lambda p: p.get('likes', 0) + p.get('comments', 0) * 2 + p.get('shares', 0) * 3,
        reverse=True
    )[:5]
    
    best_posts = [{
        "id": p.get('id'),
        "hook": p.get('hook', ''),
        "pillar": p.get('pillar'),
        "framework": p.get('framework'),
        "engagement": p.get('likes', 0) + p.get('comments', 0) * 2 + p.get('shares', 0) * 3
    } for p in sorted_posts]
    
    weekly_trend = []
    for week_offset in range(-3, 1):
        today = datetime.now(timezone.utc)
        start_of_week = today - timedelta(days=today.weekday()) + timedelta(weeks=week_offset)
        end_of_week = start_of_week + timedelta(days=6)
        
        week_posts = [
            p for p in published_posts
            if p.get('published_at') and 
            start_of_week.strftime("%Y-%m-%d") <= p.get('published_at', '')[:10] <= end_of_week.strftime("%Y-%m-%d")
        ]
        
        week_engagement = sum(
            p.get('likes', 0) + p.get('comments', 0) * 2 + p.get('shares', 0) * 3
            for p in week_posts
        )
        
        weekly_trend.append({
            "week_start": start_of_week.strftime("%Y-%m-%d"),
            "posts": len(week_posts),
            "total_engagement": week_engagement
        })
    
    total_engagement = sum(
        p.get('likes', 0) + p.get('comments', 0) * 2 + p.get('shares', 0) * 3
        for p in published_posts
    )
    
    return PerformanceMetrics(
        total_posts=len(all_posts),
        published_posts=len(published_posts),
        avg_engagement=total_engagement / len(published_posts) if published_posts else 0,
        pillar_performance=pillar_performance,
        framework_performance=framework_performance,
        best_performing_posts=best_posts,
        weekly_trend=weekly_trend
    )

@api_router.get("/analytics/pillar-recommendation")
async def get_pillar_recommendation(user_id: RequiredUserId):
    """Get AI recommendation for optimal pillar distribution based on performance"""
    metrics = await get_performance_metrics(user_id)
    
    pillar_perf = metrics.pillar_performance
    
    total_engagement = sum(p.get('total_engagement', 0) for p in pillar_perf.values())
    
    if total_engagement == 0:
        return {
            "recommendation": "Start with the 4-3-2-1 balanced strategy",
            "suggested_distribution": {"growth": 40, "tam": 35, "sales": 25},
            "insight": "Not enough data yet. Follow the standard 4-3-2-1 framework."
        }
    
    best_pillar = max(pillar_perf.items(), key=lambda x: x[1].get('avg_engagement', 0))
    
    return {
        "recommendation": f"Double down on {best_pillar[0].upper()} content",
        "suggested_distribution": {
            "growth": 40 if best_pillar[0] == 'growth' else 30,
            "tam": 40 if best_pillar[0] == 'tam' else 30,
            "sales": 40 if best_pillar[0] == 'sales' else 30,
        },
        "insight": f"Your {best_pillar[0]} posts are performing {best_pillar[1].get('avg_engagement', 0):.1f} avg engagement",
        "pillar_performance": pillar_perf
    }

# ============== AI Content Generation Routes ==============

@api_router.post("/ai/generate-content")
async def generate_content(request: ContentGenerationRequest, user_id: RequiredUserId):
    """Generate LinkedIn post content using AI"""
    
    knowledge_items = await db.knowledge_vault.find({"user_id": user_id}, {"_id": 0, "content": 1, "extracted_gems": 1}).to_list(10)
    knowledge_context = ""
    if knowledge_items:
        gems = []
        for item in knowledge_items:
            gems.extend(item.get('extracted_gems', []))
        if gems:
            knowledge_context = f"\n\nUser's expertise gems to potentially incorporate: {', '.join(gems[:5])}"
    
    voice_context = ""
    voice_profile = await db.voice_profiles.find_one({"user_id": user_id, "is_active": True}, {"_id": 0})
    if voice_profile:
        voice_context = f"""
VOICE PROFILE TO MATCH:
- Tone: {voice_profile.get('tone', 'professional')}
- Style: {voice_profile.get('vocabulary_style', 'business')}
- Personality: {', '.join(voice_profile.get('personality_traits', []))}
- Signature expressions to use: {', '.join(voice_profile.get('signature_expressions', [])[:3])}
- Phrases to use: {', '.join(voice_profile.get('preferred_phrases', [])[:3])}
- Phrases to AVOID: {', '.join(voice_profile.get('avoid_phrases', [])[:3])}
- Industry: {voice_profile.get('industry_context', '')}
- Target audience: {voice_profile.get('target_audience', '')}

Match this voice profile closely - the writing should sound like it came from the same person who wrote the example posts.
"""
    
    framework_prompt = ""
    if request.framework == "slay":
        framework_prompt = """
Use the SLAY Framework:
- S (Story): Start with a compelling personal story or situational POV that captures attention
- L (Lesson): Pivot to a broader insight or lesson learned
- A (Advice): Provide 2-3 actionable steps readers can implement
- Y (You): End with an engaging question or call to action

Structure the output with clear sections marked [STORY], [LESSON], [ADVICE], [YOU]
"""
    else:
        framework_prompt = """
Use the PAS Framework:
- P (Problem): Identify a specific, painful issue the reader experiences
- A (Agitate): Explain the emotional or financial cost to create urgency
- S (Solution): Provide a clear, authoritative path forward

Structure the output with clear sections marked [PROBLEM], [AGITATE], [SOLUTION]
"""

    pillar_context = {
        "growth": "This is a Growth post - make it broadly appealing to attract a wide audience",
        "tam": "This is a TAM (Target Audience) post - focus on educating and qualifying leads",
        "sales": "This is a Sales post - include specific results, case studies, or proof points"
    }

    system_message = f"""You are an expert LinkedIn content strategist helping create authority-building posts.

{framework_prompt}

{pillar_context.get(request.pillar, "")}
{knowledge_context}
{voice_context}

Writing rules:
1. Use "How I" instead of "How To" - position as a practitioner
2. Include specific metrics and proof points where possible
3. Use varied sentence lengths for rhythm
4. Keep paragraphs short (1-2 sentences max)
5. No generic AI phrases or clichés
6. Write in first person, conversational but authoritative tone
7. Create a hook that is approximately 8 words or less
8. Include a re-hook (second line) with specific proof or context

Output format:
HOOK: [Your 8-word hook]
REHOOK: [Your compelling second line]

[FRAMEWORK SECTIONS WITH CONTENT]

CTA: [Your call to action]
"""

    try:
        chat = await get_llm_chat(
            user_id=user_id,
            session_id=f"content-gen-{uuid.uuid4()}",
            system_message=system_message
        )
        
        user_prompt = f"Create a LinkedIn post about: {request.topic}"
        if request.context:
            user_prompt += f"\n\nAdditional context: {request.context}"
        
        response = await chat.send_message(UserMessage(text=user_prompt))
        
        return {
            "content": response,
            "framework": request.framework,
            "pillar": request.pillar
        }
    except Exception as e:
        logger.error(f"AI generation error: {str(e)}")
        raise HTTPException(status_code=500, detail="AI content generation failed. Please try again.")

@api_router.post("/ai/suggest-topics", response_model=List[TopicSuggestion])
async def suggest_topics(user_id: RequiredUserId, context: Optional[str] = None, inspiration_url: Optional[str] = None):
    """Generate topic suggestions for LinkedIn posts"""
    
    inspiration_content = ""
    if inspiration_url:
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(inspiration_url, timeout=15.0, follow_redirects=True)
                response.raise_for_status()
                raw_content = response.text[:15000]
                import re as regex
                raw_content = regex.sub(r'<script[^>]*>.*?</script>', '', raw_content, flags=regex.DOTALL)
                raw_content = regex.sub(r'<style[^>]*>.*?</style>', '', raw_content, flags=regex.DOTALL)
                raw_content = regex.sub(r'<[^>]+>', ' ', raw_content)
                raw_content = regex.sub(r'\s+', ' ', raw_content).strip()
                inspiration_content = f"\n\nINSPIRATION CONTENT from {inspiration_url}:\n{raw_content[:8000]}\n\nUse this content as inspiration to generate topic ideas that align with and relate to this material."
        except Exception as e:
            logger.warning(f"Failed to fetch inspiration URL: {str(e)}")
    
    knowledge_items = await db.knowledge_vault.find({"user_id": user_id}, {"_id": 0, "extracted_gems": 1, "tags": 1}).to_list(20)
    expertise_context = ""
    if knowledge_items:
        all_gems = []
        all_tags = []
        for item in knowledge_items:
            all_gems.extend(item.get('extracted_gems', []))
            all_tags.extend(item.get('tags', []))
        if all_gems or all_tags:
            expertise_context = f"\n\nUser's expertise areas: {', '.join(set(all_tags[:10]))}\nExpertise gems: {', '.join(all_gems[:5])}"
    
    system_message = f"""You are an expert LinkedIn content strategist. Generate 5 diverse topic suggestions for LinkedIn posts.
{expertise_context}
{inspiration_content}

For each topic, specify:
1. The topic/angle
2. Content pillar: growth (broad appeal), tam (niche education), or sales (case study/proof)
3. Recommended framework: slay (story-driven) or pas (problem-solution)
4. A brief angle/hook idea

Output as JSON array with format:
[
  {{"topic": "...", "pillar": "growth|tam|sales", "framework": "slay|pas", "angle": "..."}},
  ...
]
"""

    try:
        chat = await get_llm_chat(
            user_id=user_id,
            session_id=f"topic-suggest-{uuid.uuid4()}",
            system_message=system_message
        )
        
        prompt = "Generate 5 LinkedIn post topic suggestions"
        if context:
            prompt += f" based on this context: {context}"
        if inspiration_url:
            prompt += f". Topics should be inspired by and relevant to the content from the provided URL."
        
        response = await chat.send_message(UserMessage(text=prompt))
        
        json_match = re.search(r'\[[\s\S]*\]', response)
        if json_match:
            suggestions = json.loads(json_match.group())
            return [TopicSuggestion(**s) for s in suggestions[:5]]
        
        return [
            TopicSuggestion(topic="The one hiring mistake that cost me $50k", pillar="growth", framework="slay", angle="Personal failure story"),
            TopicSuggestion(topic="Why your LinkedIn posts get 12 views", pillar="tam", framework="pas", angle="Algorithm pain point"),
            TopicSuggestion(topic="How I closed $200k from one LinkedIn post", pillar="sales", framework="slay", angle="Case study"),
            TopicSuggestion(topic="The AI tool nobody is talking about", pillar="growth", framework="pas", angle="Trend jacking"),
            TopicSuggestion(topic="3 signs your content strategy is broken", pillar="tam", framework="pas", angle="Problem identification")
        ]
    except Exception as e:
        logger.error(f"Topic suggestion error: {str(e)}")
        return [
            TopicSuggestion(topic="The one hiring mistake that cost me $50k", pillar="growth", framework="slay", angle="Personal failure story"),
            TopicSuggestion(topic="Why your LinkedIn posts get 12 views", pillar="tam", framework="pas", angle="Algorithm pain point"),
            TopicSuggestion(topic="How I closed $200k from one LinkedIn post", pillar="sales", framework="slay", angle="Case study"),
            TopicSuggestion(topic="The AI tool nobody is talking about", pillar="growth", framework="pas", angle="Trend jacking"),
            TopicSuggestion(topic="3 signs your content strategy is broken", pillar="tam", framework="pas", angle="Problem identification")
        ]

@api_router.post("/ai/improve-hook")
async def improve_hook(request: HookValidationRequest, user_id: RequiredUserId):
    """Get AI suggestions to improve a hook"""
    
    system_message = """You are an expert LinkedIn hook writer. Analyze the given hook and provide 3 improved versions.

Rules for great hooks:
1. Should be 8 words or less
2. Use "How I" instead of "How To"
3. Include specific numbers or metrics when possible
4. Create curiosity or pattern interrupt
5. Avoid generic phrases

Output format:
ANALYSIS: [Brief analysis of current hook]
SUGGESTIONS:
1. [Improved hook 1]
2. [Improved hook 2]
3. [Improved hook 3]
"""

    try:
        chat = await get_llm_chat(
            user_id=user_id,
            session_id=f"hook-improve-{uuid.uuid4()}",
            system_message=system_message
        )
        
        response = await chat.send_message(UserMessage(text=f"Improve this hook: {request.hook}"))
        
        return {"suggestions": response}
    except Exception as e:
        logger.error(f"Hook improvement error: {str(e)}")
        raise HTTPException(status_code=500, detail="Hook improvement failed. Please try again.")

# ============== Hook Validation Route ==============

@api_router.post("/validate-hook", response_model=HookValidationResponse)
async def validate_hook(request: HookValidationRequest):
    """Validate a hook against the 8-word rule (no auth required)"""
    words = request.hook.strip().split()
    word_count = len(words)
    
    suggestions = []
    score = 100
    
    if word_count > 8:
        suggestions.append(f"Hook is {word_count} words. Aim for 8 words or less for mobile visibility.")
        score -= (word_count - 8) * 10
    
    if word_count < 3:
        suggestions.append("Hook seems too short. Add more impact.")
        score -= 20
    
    weak_starts = ["how to", "why you", "what you", "the best", "top 10"]
    hook_lower = request.hook.lower()
    for weak in weak_starts:
        if hook_lower.startswith(weak):
            suggestions.append(f"Consider replacing '{weak}' with 'How I' for more authority.")
            score -= 15
            break
    
    if not re.search(r'\d', request.hook):
        suggestions.append("Consider adding a specific number or metric for credibility.")
        score -= 10
    
    score = max(0, min(100, score))
    
    return HookValidationResponse(
        is_valid=word_count <= 8,
        word_count=word_count,
        suggestions=suggestions,
        score=score
    )

# ============== LinkedIn Integration Routes ==============

LINKEDIN_CLIENT_ID_ENV = os.environ.get('LINKEDIN_CLIENT_ID', '')
LINKEDIN_CLIENT_SECRET_ENV = os.environ.get('LINKEDIN_CLIENT_SECRET', '')
LINKEDIN_REDIRECT_URI_ENV = os.environ.get('LINKEDIN_REDIRECT_URI', '')
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:3000')

async def get_linkedin_credentials(user_id: str):
    """Get LinkedIn credentials from user settings or environment"""
    settings = await get_user_settings(user_id)
    
    client_id = settings.linkedin_client_id or LINKEDIN_CLIENT_ID_ENV
    client_secret = settings.linkedin_client_secret or LINKEDIN_CLIENT_SECRET_ENV
    redirect_uri = settings.linkedin_redirect_uri or LINKEDIN_REDIRECT_URI_ENV
    
    return client_id, client_secret, redirect_uri

@api_router.get("/linkedin/auth")
async def get_linkedin_auth_url(user_id: RequiredUserId):
    """Generate LinkedIn OAuth authorization URL"""
    client_id, client_secret, redirect_uri = await get_linkedin_credentials(user_id)
    
    if not client_id:
        raise HTTPException(status_code=400, detail="LinkedIn Client ID not configured. Please add your LinkedIn API credentials in Settings.")
    
    if not redirect_uri:
        raise HTTPException(status_code=400, detail="LinkedIn Redirect URI not configured. Please add it in Settings.")
    
    scopes = "r_emailaddress profile w_member_social openid"
    state = f"{user_id}:{uuid.uuid4()}"
    
    auth_url = (
        f"https://www.linkedin.com/oauth/v2/authorization?"
        f"response_type=code&"
        f"client_id={client_id}&"
        f"redirect_uri={redirect_uri}&"
        f"scope={scopes}&"
        f"state={state}"
    )
    
    return {"auth_url": auth_url, "state": state}

@api_router.get("/linkedin/callback")
async def linkedin_callback(code: str, state: Optional[str] = None):
    """Handle LinkedIn OAuth callback and exchange code for access token"""
    # Extract user_id from state
    user_id = None
    if state and ":" in state:
        user_id = state.split(":")[0]
    
    if not user_id:
        raise HTTPException(status_code=400, detail="Invalid state parameter")
    
    client_id, client_secret, redirect_uri = await get_linkedin_credentials(user_id)
    
    if not client_id or not client_secret:
        raise HTTPException(status_code=400, detail="LinkedIn API credentials not configured")
    
    async with httpx.AsyncClient() as client:
        token_response = await client.post(
            "https://www.linkedin.com/oauth/v2/accessToken",
            data={
                "grant_type": "authorization_code",
                "code": code,
                "client_id": client_id,
                "client_secret": client_secret,
                "redirect_uri": redirect_uri
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        
        if token_response.status_code != 200:
            logger.error(f"LinkedIn token exchange failed: {token_response.text}")
            raise HTTPException(status_code=400, detail="Failed to exchange code for token")
        
        token_data = token_response.json()
        access_token = token_data.get("access_token")
        expires_in = token_data.get("expires_in", 5184000)
        
        profile_response = await client.get(
            "https://api.linkedin.com/v2/userinfo",
            headers={"Authorization": f"Bearer {access_token}"}
        )
        
        if profile_response.status_code != 200:
            logger.error(f"LinkedIn profile fetch failed: {profile_response.text}")
            raise HTTPException(status_code=400, detail="Failed to get LinkedIn profile")
        
        profile_data = profile_response.json()
        linkedin_user_id = profile_data.get("sub")
        linkedin_name = profile_data.get("name", "")
    
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)
    
    await db.user_settings.update_one(
        {"user_id": user_id},
        {"$set": {
            "linkedin_connected": True,
            "linkedin_access_token": access_token,
            "linkedin_user_id": linkedin_user_id,
            "linkedin_name": linkedin_name,
            "linkedin_token_expires": serialize_datetime(expires_at),
            "updated_at": serialize_datetime(datetime.now(timezone.utc))
        }}
    )
    
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url=f"{FRONTEND_URL}/settings?linkedin=connected")

@api_router.post("/linkedin/disconnect")
async def disconnect_linkedin(user_id: RequiredUserId):
    """Disconnect LinkedIn account"""
    await db.user_settings.update_one(
        {"user_id": user_id},
        {"$set": {
            "linkedin_connected": False,
            "linkedin_access_token": None,
            "linkedin_user_id": None,
            "linkedin_name": None,
            "linkedin_token_expires": None,
            "updated_at": serialize_datetime(datetime.now(timezone.utc))
        }}
    )
    
    return {"message": "LinkedIn disconnected successfully"}

@api_router.post("/linkedin/publish/{post_id}")
async def publish_to_linkedin(post_id: str, user_id: RequiredUserId):
    """Publish a post directly to LinkedIn"""
    settings = await get_user_settings(user_id)
    
    if not settings.linkedin_connected or not settings.linkedin_access_token:
        raise HTTPException(status_code=400, detail="LinkedIn account not connected")
    
    if settings.linkedin_token_expires:
        expires_at = datetime.fromisoformat(settings.linkedin_token_expires.replace('Z', '+00:00'))
        if expires_at < datetime.now(timezone.utc):
            raise HTTPException(status_code=401, detail="LinkedIn token expired. Please reconnect your account.")
    
    post = await db.posts.find_one({"id": post_id, "user_id": user_id}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    full_content = f"{post.get('hook', '')}\n\n{post.get('rehook', '')}\n\n{post.get('content', '')}"
    full_content = full_content.strip()
    
    user_urn = f"urn:li:person:{settings.linkedin_user_id}"
    
    post_data = {
        "author": user_urn,
        "lifecycleState": "PUBLISHED",
        "specificContent": {
            "com.linkedin.ugc.ShareContent": {
                "shareCommentary": {"text": full_content},
                "shareMediaCategory": "NONE"
            }
        },
        "visibility": {
            "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
        }
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.linkedin.com/v2/ugcPosts",
            json=post_data,
            headers={
                "Authorization": f"Bearer {settings.linkedin_access_token}",
                "X-Restli-Protocol-Version": "2.0.0",
                "Content-Type": "application/json",
                "LinkedIn-Version": "202401"
            }
        )
        
        if response.status_code not in [200, 201]:
            logger.error(f"LinkedIn publish failed: {response.text}")
            raise HTTPException(status_code=response.status_code, detail=f"Failed to publish to LinkedIn: {response.text}")
        
        linkedin_response = response.json()
        linkedin_post_id = linkedin_response.get("id", "")
    
    now = datetime.now(timezone.utc)
    await db.posts.update_one(
        {"id": post_id, "user_id": user_id},
        {"$set": {
            "status": "published",
            "published_at": serialize_datetime(now),
            "engagement_timer_start": serialize_datetime(now),
            "linkedin_post_id": linkedin_post_id,
            "linkedin_post_url": f"https://www.linkedin.com/feed/update/{linkedin_post_id}",
            "updated_at": serialize_datetime(now)
        }}
    )
    
    updated_post = await db.posts.find_one({"id": post_id, "user_id": user_id}, {"_id": 0})
    return {
        "success": True,
        "linkedin_post_id": linkedin_post_id,
        "post": Post(**deserialize_datetime(updated_post))
    }

# ============== Voice Profile Routes ==============

@api_router.get("/voice-profiles", response_model=List[VoiceProfile])
async def get_voice_profiles(user_id: RequiredUserId):
    """Get all voice profiles for the user"""
    profiles = await db.voice_profiles.find({"user_id": user_id}, {"_id": 0}).to_list(100)
    return [VoiceProfile(**deserialize_datetime(p)) for p in profiles]

@api_router.get("/voice-profiles/active", response_model=Optional[VoiceProfile])
async def get_active_voice_profile(user_id: RequiredUserId):
    """Get the currently active voice profile"""
    profile = await db.voice_profiles.find_one({"user_id": user_id, "is_active": True}, {"_id": 0})
    if profile:
        return VoiceProfile(**deserialize_datetime(profile))
    return None

@api_router.get("/voice-profiles/{profile_id}", response_model=VoiceProfile)
async def get_voice_profile(profile_id: str, user_id: RequiredUserId):
    """Get a specific voice profile"""
    profile = await db.voice_profiles.find_one({"id": profile_id, "user_id": user_id}, {"_id": 0})
    if not profile:
        raise HTTPException(status_code=404, detail="Voice profile not found")
    return VoiceProfile(**deserialize_datetime(profile))

@api_router.post("/voice-profiles", response_model=VoiceProfile)
async def create_voice_profile(profile_create: VoiceProfileCreate, user_id: RequiredUserId):
    """Create a new voice profile"""
    profile = VoiceProfile(user_id=user_id, **profile_create.model_dump())
    
    doc = profile.model_dump()
    doc['created_at'] = serialize_datetime(doc['created_at'])
    doc['updated_at'] = serialize_datetime(doc['updated_at'])
    
    await db.voice_profiles.insert_one(doc)
    return profile

@api_router.put("/voice-profiles/{profile_id}", response_model=VoiceProfile)
async def update_voice_profile(profile_id: str, update: VoiceProfileUpdate, user_id: RequiredUserId):
    """Update a voice profile"""
    profile = await db.voice_profiles.find_one({"id": profile_id, "user_id": user_id}, {"_id": 0})
    if not profile:
        raise HTTPException(status_code=404, detail="Voice profile not found")
    
    update_data = update.model_dump(exclude_unset=True)
    if update_data:
        update_data['updated_at'] = serialize_datetime(datetime.now(timezone.utc))
        
        if update_data.get('is_active'):
            await db.voice_profiles.update_many(
                {"user_id": user_id, "id": {"$ne": profile_id}},
                {"$set": {"is_active": False}}
            )
        
        await db.voice_profiles.update_one({"id": profile_id, "user_id": user_id}, {"$set": update_data})
    
    updated_profile = await db.voice_profiles.find_one({"id": profile_id, "user_id": user_id}, {"_id": 0})
    return VoiceProfile(**deserialize_datetime(updated_profile))

@api_router.delete("/voice-profiles/{profile_id}")
async def delete_voice_profile(profile_id: str, user_id: RequiredUserId):
    """Delete a voice profile"""
    result = await db.voice_profiles.delete_one({"id": profile_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Voice profile not found")
    return {"message": "Voice profile deleted successfully"}

@api_router.post("/voice-profiles/{profile_id}/activate")
async def activate_voice_profile(profile_id: str, user_id: RequiredUserId):
    """Set a voice profile as the active one"""
    profile = await db.voice_profiles.find_one({"id": profile_id, "user_id": user_id}, {"_id": 0})
    if not profile:
        raise HTTPException(status_code=404, detail="Voice profile not found")
    
    await db.voice_profiles.update_many({"user_id": user_id}, {"$set": {"is_active": False}})
    
    await db.voice_profiles.update_one(
        {"id": profile_id, "user_id": user_id},
        {"$set": {"is_active": True, "updated_at": serialize_datetime(datetime.now(timezone.utc))}}
    )
    
    updated_profile = await db.voice_profiles.find_one({"id": profile_id, "user_id": user_id}, {"_id": 0})
    return VoiceProfile(**deserialize_datetime(updated_profile))

@api_router.post("/voice-profiles/analyze-samples")
async def analyze_writing_samples(samples: List[str], user_id: RequiredUserId):
    """Analyze writing samples to generate a voice profile"""
    if not samples or len(samples) < 2:
        raise HTTPException(status_code=400, detail="Please provide at least 2 writing samples")
    
    system_message = """You are an expert at analyzing writing style and voice. 
    
Analyze the provided writing samples and extract the author's unique voice characteristics.

Provide a JSON response with:
{
    "tone": "professional|casual|authoritative|friendly|inspirational",
    "vocabulary_style": "business|technical|conversational|academic|creative",
    "sentence_structure": "short|varied|complex",
    "personality_traits": ["trait1", "trait2", ...],
    "signature_expressions": ["phrase1", "phrase2", ...],
    "preferred_phrases": ["phrase1", "phrase2", ...],
    "avoid_phrases": ["phrase1", "phrase2", ...],
    "writing_patterns": "summary of unique patterns",
    "recommended_profile_name": "name suggestion"
}
"""

    try:
        chat = await get_llm_chat(
            user_id=user_id,
            session_id=f"voice-analyze-{uuid.uuid4()}",
            system_message=system_message
        )
        
        samples_text = "\n\n---SAMPLE---\n\n".join(samples)
        response = await chat.send_message(UserMessage(text=f"Analyze these writing samples:\n\n{samples_text}"))
        
        json_match = re.search(r'\{[\s\S]*\}', response)
        if json_match:
            analysis = json.loads(json_match.group())
            return analysis
        
        return {"error": "Could not parse analysis"}
    except Exception as e:
        logger.error(f"Voice analysis error: {str(e)}")
        raise HTTPException(status_code=500, detail="Voice analysis failed. Please try again.")

# ============== Subscription Routes ==============

@api_router.get("/subscription")
async def get_subscription(user_id: RequiredUserId):
    """Get current subscription status"""
    settings = await get_user_settings(user_id)
    subscription = settings.subscription if hasattr(settings, 'subscription') else get_default_subscription()
    
    effective_tier = get_effective_tier(subscription)
    in_grace = is_in_grace_period(subscription)
    grace_hours = get_grace_period_hours_remaining(subscription)
    
    return SubscriptionResponse(
        tier=subscription.get("tier", "free"),
        status=subscription.get("status", "active"),
        effective_tier=effective_tier,
        billing_cycle=subscription.get("billing_cycle"),
        currency=subscription.get("currency", DEFAULT_CURRENCY),
        current_period_end=subscription.get("current_period_end"),
        cancel_at_period_end=subscription.get("cancel_at_period_end", False),
        is_in_grace_period=in_grace,
        grace_period_hours_remaining=grace_hours,
        payment_method_last4=subscription.get("payment_method_last4"),
        payment_method_brand=subscription.get("payment_method_brand"),
    )

@api_router.get("/subscription/usage")
async def get_usage(user_id: RequiredUserId):
    """Get current usage against limits"""
    settings = await get_user_settings(user_id)
    subscription = settings.subscription if hasattr(settings, 'subscription') else get_default_subscription()
    usage = settings.usage if hasattr(settings, 'usage') else get_default_usage()
    
    effective_tier = get_effective_tier(subscription)
    limits = USAGE_LIMITS.get(effective_tier, USAGE_LIMITS["free"])
    
    # Check if usage needs reset
    if should_reset_monthly_usage(usage):
        reset_data = get_reset_usage_data()
        # Preserve lifetime stats
        reset_data["lifetime_posts"] = usage.get("lifetime_posts", 0)
        reset_data["lifetime_ai_generations"] = usage.get("lifetime_ai_generations", 0)
        await db.user_settings.update_one(
            {"user_id": user_id},
            {"$set": {"usage": reset_data, "updated_at": serialize_datetime(datetime.now(timezone.utc))}}
        )
        usage = reset_data
    
    # Get current resource counts
    knowledge_count = await db.knowledge_vault.count_documents({"user_id": user_id})
    voice_profile_count = await db.voice_profiles.count_documents({"user_id": user_id})
    influencer_count = await db.influencers.count_documents({"user_id": user_id})
    tracked_post_count = await db.tracked_posts.count_documents({"user_id": user_id})
    
    # Calculate days until reset
    period_end = usage.get("period_end")
    days_until_reset = 30
    if period_end:
        try:
            end_date = datetime.fromisoformat(period_end.replace('Z', '+00:00'))
            days_until_reset = max(0, (end_date - datetime.now(timezone.utc)).days)
        except (ValueError, TypeError):
            pass
    
    return UsageResponse(
        posts_created=usage.get("posts_created", 0),
        posts_limit=limits.get("posts_per_month", 5),
        ai_generations=usage.get("ai_generations", 0),
        ai_generations_limit=limits.get("ai_generations_per_month", 3),
        ai_hook_improvements=usage.get("ai_hook_improvements", 0),
        ai_hook_improvements_limit=limits.get("ai_hook_improvements_per_month", 3),
        knowledge_items=knowledge_count,
        knowledge_items_limit=limits.get("knowledge_items", 10),
        voice_profiles=voice_profile_count,
        voice_profiles_limit=limits.get("voice_profiles", 1),
        tracked_influencers=influencer_count,
        tracked_influencers_limit=limits.get("tracked_influencers", 3),
        tracked_posts=tracked_post_count,
        tracked_posts_limit=limits.get("tracked_posts", 5),
        comment_drafts=usage.get("comment_drafts", 0),
        comment_drafts_limit=limits.get("comment_drafts_per_month", 0),
        period_resets_in_days=days_until_reset,
        tier=effective_tier
    )

@api_router.get("/subscription/feature/{feature_name}")
async def check_feature_access(feature_name: str, user_id: RequiredUserId):
    """Check if user has access to a specific feature"""
    settings = await get_user_settings(user_id)
    subscription = settings.subscription if hasattr(settings, 'subscription') else get_default_subscription()
    effective_tier = get_effective_tier(subscription)
    
    has_access = has_feature_access(effective_tier, feature_name)
    
    return {
        "feature": feature_name,
        "has_access": has_access,
        "tier": effective_tier,
        "required_tier": "basic" if feature_name in FEATURE_ACCESS.get("basic", {}) and FEATURE_ACCESS["basic"].get(feature_name) else "premium"
    }

@api_router.post("/subscription/checkout")
async def create_checkout(request: CheckoutRequest, http_request: Request, user_id: RequiredUserId):
    """Create Stripe checkout session for subscription"""
    stripe_api_key = os.environ.get("STRIPE_API_KEY")
    if not stripe_api_key:
        raise HTTPException(status_code=500, detail="Stripe API key not configured")
    
    # Get user info for metadata
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "email": 1})
    user_email = user.get("email") if user else None
    
    # Build URLs from request origin
    origin = str(http_request.base_url).rstrip('/')
    frontend_url = os.environ.get("FRONTEND_URL", origin.replace(":8001", ":3000"))
    success_url = f"{frontend_url}/settings?subscription=success&session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{frontend_url}/pricing?cancelled=true"
    webhook_url = f"{origin}/api/webhook/stripe"
    
    # Initialize Stripe service
    stripe_service = SubscriptionStripeService(api_key=stripe_api_key, webhook_url=webhook_url)
    
    try:
        session = await stripe_service.create_checkout_session(
            tier=request.tier,
            billing_cycle=request.billing_cycle,
            currency=request.currency,
            success_url=success_url,
            cancel_url=cancel_url,
            user_id=user_id,
            customer_email=user_email
        )
        
        # Store pending transaction
        transaction = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "session_id": session.session_id,
            "tier": request.tier,
            "billing_cycle": request.billing_cycle,
            "currency": request.currency,
            "amount": get_price_amount(request.tier, request.billing_cycle, request.currency),
            "status": "pending",
            "created_at": serialize_datetime(datetime.now(timezone.utc))
        }
        await db.payment_transactions.insert_one(transaction)
        
        return {"checkout_url": session.url, "session_id": session.session_id}
    except Exception as e:
        logger.error(f"Checkout creation failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create checkout session. Please try again.")

@api_router.get("/subscription/checkout/status/{session_id}")
async def get_checkout_status(session_id: str, user_id: RequiredUserId):
    """Get status of checkout session and update subscription if successful"""
    stripe_api_key = os.environ.get("STRIPE_API_KEY")
    if not stripe_api_key:
        raise HTTPException(status_code=500, detail="Stripe API key not configured")
    
    stripe_service = SubscriptionStripeService(api_key=stripe_api_key, webhook_url="")
    
    try:
        status = await stripe_service.get_checkout_status(session_id)
        
        # Check if we already processed this session
        transaction = await db.payment_transactions.find_one(
            {"session_id": session_id, "user_id": user_id},
            {"_id": 0}
        )
        
        if status.payment_status == "paid":
            # Only process if not already completed
            if transaction and transaction.get("status") != "completed":
                metadata = status.metadata
                
                # Update subscription
                update_data = get_subscription_update_from_checkout(status, metadata)
                await db.user_settings.update_one(
                    {"user_id": user_id},
                    {"$set": {**update_data, "updated_at": serialize_datetime(datetime.now(timezone.utc))}}
                )
                
                # Update transaction status
                await db.payment_transactions.update_one(
                    {"session_id": session_id},
                    {"$set": {"status": "completed", "completed_at": serialize_datetime(datetime.now(timezone.utc))}}
                )
                
                # Reset usage for new subscription
                reset_data = get_reset_usage_data()
                await db.user_settings.update_one(
                    {"user_id": user_id},
                    {"$set": {"usage": reset_data}}
                )
        
        return {
            "status": status.status,
            "payment_status": status.payment_status,
            "tier": status.metadata.get("tier"),
            "billing_cycle": status.metadata.get("billing_cycle"),
        }
    except Exception as e:
        logger.error(f"Failed to get checkout status: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve checkout status. Please try again.")

@api_router.post("/subscription/cancel")
async def cancel_subscription(user_id: RequiredUserId):
    """Cancel subscription at period end"""
    stripe_api_key = os.environ.get("STRIPE_API_KEY")
    if not stripe_api_key:
        raise HTTPException(status_code=500, detail="Stripe API key not configured")

    settings = await get_user_settings(user_id)
    subscription = settings.subscription if hasattr(settings, 'subscription') else get_default_subscription()

    if subscription.get("tier") == "free":
        raise HTTPException(status_code=400, detail="No active subscription to cancel")

    # Get Stripe subscription ID to cancel via Stripe API
    stripe_subscription_id = subscription.get("stripe_subscription_id")
    if stripe_subscription_id:
        stripe_service = SubscriptionStripeService(api_key=stripe_api_key, webhook_url="")
        await stripe_service.cancel_subscription(stripe_subscription_id)

    update_data = get_subscription_cancellation_update()
    await db.user_settings.update_one(
        {"user_id": user_id},
        {"$set": {**update_data, "updated_at": serialize_datetime(datetime.now(timezone.utc))}}
    )

    return {"message": "Subscription will be cancelled at the end of the billing period"}

@api_router.post("/subscription/reactivate")
async def reactivate_subscription(user_id: RequiredUserId):
    """Reactivate a cancelled subscription"""
    stripe_api_key = os.environ.get("STRIPE_API_KEY")
    if not stripe_api_key:
        raise HTTPException(status_code=500, detail="Stripe API key not configured")

    settings = await get_user_settings(user_id)
    subscription = settings.subscription if hasattr(settings, 'subscription') else get_default_subscription()

    if not subscription.get("cancel_at_period_end"):
        raise HTTPException(status_code=400, detail="No cancellation to revert")

    # Get Stripe subscription ID to reactivate via Stripe API
    stripe_subscription_id = subscription.get("stripe_subscription_id")
    if stripe_subscription_id:
        stripe_service = SubscriptionStripeService(api_key=stripe_api_key, webhook_url="")
        await stripe_service.reactivate_subscription(stripe_subscription_id)

    update_data = get_subscription_reactivation_update()
    await db.user_settings.update_one(
        {"user_id": user_id},
        {"$set": {**update_data, "updated_at": serialize_datetime(datetime.now(timezone.utc))}}
    )

    return {"message": "Subscription reactivated"}

@api_router.get("/pricing")
async def get_pricing(currency: str = "aud"):
    """Get pricing information for all tiers (public endpoint)"""
    if currency not in CURRENCY_CONFIG:
        currency = DEFAULT_CURRENCY
    
    return get_pricing_for_currency(currency)

# ============== Stripe Webhook ==============

@app.post("/api/webhook/stripe")
async def stripe_webhook(request: Request):
    """Handle Stripe webhook events"""
    stripe_api_key = os.environ.get("STRIPE_API_KEY")
    if not stripe_api_key:
        raise HTTPException(status_code=500, detail="Stripe not configured")
    
    body = await request.body()
    signature = request.headers.get("Stripe-Signature", "")
    
    webhook_url = f"{request.base_url}api/webhook/stripe"
    stripe_service = SubscriptionStripeService(api_key=stripe_api_key, webhook_url=webhook_url)
    
    try:
        webhook_response = await stripe_service.handle_webhook(body, signature)
        
        event_type = webhook_response.event_type
        metadata = webhook_response.metadata
        session_id = webhook_response.session_id
        
        user_id = metadata.get("user_id")
        if not user_id:
            logger.warning(f"Webhook event {event_type} missing user_id in metadata")
            return {"received": True}
        
        if event_type == "checkout.session.completed":
            # Update subscription from successful checkout
            update_data = get_subscription_update_from_checkout(webhook_response, metadata)
            await db.user_settings.update_one(
                {"user_id": user_id},
                {"$set": {**update_data, "updated_at": serialize_datetime(datetime.now(timezone.utc))}}
            )
            
            # Update transaction
            await db.payment_transactions.update_one(
                {"session_id": session_id},
                {"$set": {"status": "completed", "completed_at": serialize_datetime(datetime.now(timezone.utc))}}
            )
            
            logger.info(f"Subscription activated for user {user_id}")
        
        elif event_type == "invoice.payment_failed":
            # Start grace period
            update_data = get_payment_failed_update()
            await db.user_settings.update_one(
                {"user_id": user_id},
                {"$set": {**update_data, "updated_at": serialize_datetime(datetime.now(timezone.utc))}}
            )
            logger.info(f"Payment failed for user {user_id}, grace period started")
        
        elif event_type == "invoice.payment_succeeded":
            # Clear grace period and extend subscription
            settings = await db.user_settings.find_one({"user_id": user_id}, {"_id": 0, "subscription": 1})
            billing_cycle = settings.get("subscription", {}).get("billing_cycle", "monthly") if settings else "monthly"
            update_data = get_payment_succeeded_update(billing_cycle)
            await db.user_settings.update_one(
                {"user_id": user_id},
                {"$set": {**update_data, "updated_at": serialize_datetime(datetime.now(timezone.utc))}}
            )
            
            # Reset usage for new period
            reset_data = get_reset_usage_data()
            await db.user_settings.update_one(
                {"user_id": user_id},
                {"$set": {"usage": reset_data}}
            )
            logger.info(f"Payment succeeded for user {user_id}")
        
        elif event_type == "customer.subscription.deleted":
            # Downgrade to free (keep content)
            update_data = get_subscription_expired_update()
            await db.user_settings.update_one(
                {"user_id": user_id},
                {"$set": {**update_data, "updated_at": serialize_datetime(datetime.now(timezone.utc))}}
            )
            logger.info(f"Subscription expired for user {user_id}, downgraded to free")
        
        return {"received": True}
    except Exception as e:
        logger.error(f"Webhook processing failed: {str(e)}")
        raise HTTPException(status_code=400, detail="Webhook processing failed")

# ============== Usage Increment Helpers ==============

async def increment_usage(user_id: str, field: str, amount: int = 1):
    """Increment a usage counter"""
    await db.user_settings.update_one(
        {"user_id": user_id},
        {
            "$inc": {f"usage.{field}": amount},
            "$set": {"updated_at": serialize_datetime(datetime.now(timezone.utc))}
        }
    )

async def check_usage_limit(user_id: str, usage_type: str) -> bool:
    """Check if user has remaining usage for a specific type"""
    settings = await get_user_settings(user_id)
    subscription = settings.subscription if hasattr(settings, 'subscription') else get_default_subscription()
    usage = settings.usage if hasattr(settings, 'usage') else get_default_usage()
    
    effective_tier = get_effective_tier(subscription)
    limit = get_usage_limit(effective_tier, usage_type)
    
    if limit == -1:  # Unlimited
        return True
    
    # Map usage_type to usage field
    usage_field_map = {
        "posts_per_month": "posts_created",
        "ai_generations_per_month": "ai_generations",
        "ai_hook_improvements_per_month": "ai_hook_improvements",
        "url_imports_per_month": "url_imports",
        "gem_extractions_per_month": "gem_extractions",
        "voice_analyses_per_month": "voice_analyses",
        "comment_drafts_per_month": "comment_drafts",
    }
    
    usage_field = usage_field_map.get(usage_type, usage_type)
    current = usage.get(usage_field, 0)
    
    return current < limit

async def check_resource_limit(user_id: str, resource_type: str, collection: str) -> bool:
    """Check if user can add more of a resource type"""
    settings = await get_user_settings(user_id)
    subscription = settings.subscription if hasattr(settings, 'subscription') else get_default_subscription()
    
    effective_tier = get_effective_tier(subscription)
    limit = get_usage_limit(effective_tier, resource_type)
    
    if limit == -1:  # Unlimited
        return True
    
    current_count = await db[collection].count_documents({"user_id": user_id})
    return current_count < limit

# ============== Root Route ==============

@api_router.get("/")
async def root():
    return {"message": "LinkedIn Authority Engine API", "version": "4.0.0"}

# Include the router in the main app
app.include_router(api_router)

# Include the engagement hub router
engagement_router = create_engagement_router(db, get_llm_chat, get_user_settings)
app.include_router(engagement_router)

# CORS Configuration - Security hardened
# CORS_ORIGINS must be explicitly set in production (no wildcard with credentials)
cors_origins_env = os.environ.get('CORS_ORIGINS', '')
if cors_origins_env and cors_origins_env != '*':
    cors_origins = [origin.strip() for origin in cors_origins_env.split(',') if origin.strip()]
else:
    # Default to empty list in production to prevent misuse
    # Log warning if no origins configured
    logger.warning("CORS_ORIGINS not configured - CORS will block cross-origin requests")
    cors_origins = []

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=cors_origins,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept", "Origin", "X-Requested-With"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
