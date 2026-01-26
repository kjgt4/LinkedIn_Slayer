from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Form
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

# ============== Models ==============

class UserSettings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
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

# Voice Profile Model
class VoiceProfile(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str = "Default Voice"
    tone: str = "professional"  # professional, casual, authoritative, friendly
    vocabulary_style: str = "business"  # business, technical, conversational, academic
    sentence_structure: str = "varied"  # short, varied, complex
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
    # LinkedIn integration
    linkedin_post_id: Optional[str] = None
    linkedin_post_url: Optional[str] = None
    # Performance metrics
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

async def get_user_settings():
    """Get or create default user settings"""
    settings = await db.user_settings.find_one({}, {"_id": 0})
    if not settings:
        default_settings = UserSettings()
        doc = default_settings.model_dump()
        doc['created_at'] = serialize_datetime(doc['created_at'])
        doc['updated_at'] = serialize_datetime(doc['updated_at'])
        await db.user_settings.insert_one(doc)
        return default_settings
    return UserSettings(**deserialize_datetime(settings))

async def get_llm_chat(session_id: str, system_message: str):
    """Initialize LLM chat with user's configured provider"""
    settings = await get_user_settings()
    
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

# ============== Settings Routes ==============

@api_router.get("/settings", response_model=UserSettings)
async def get_settings():
    return await get_user_settings()

@api_router.put("/settings", response_model=UserSettings)
async def update_settings(update: UserSettingsUpdate):
    settings = await get_user_settings()
    update_data = update.model_dump(exclude_unset=True)
    
    if update_data:
        update_data['updated_at'] = serialize_datetime(datetime.now(timezone.utc))
        await db.user_settings.update_one(
            {"id": settings.id},
            {"$set": update_data}
        )
    
    return await get_user_settings()

# ============== Posts Routes ==============

@api_router.get("/posts", response_model=List[Post])
async def get_posts(status: Optional[str] = None):
    query = {}
    if status:
        query["status"] = status
    posts = await db.posts.find(query, {"_id": 0}).to_list(1000)
    return [Post(**deserialize_datetime(p)) for p in posts]

@api_router.get("/posts/{post_id}", response_model=Post)
async def get_post(post_id: str):
    post = await db.posts.find_one({"id": post_id}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return Post(**deserialize_datetime(post))

@api_router.post("/posts", response_model=Post)
async def create_post(post_create: PostCreate):
    post = Post(**post_create.model_dump())
    post.word_count = len(post.content.split()) if post.content else 0
    post.hook_word_count = len(post.hook.split()) if post.hook else 0
    
    doc = post.model_dump()
    doc['created_at'] = serialize_datetime(doc['created_at'])
    doc['updated_at'] = serialize_datetime(doc['updated_at'])
    
    await db.posts.insert_one(doc)
    return post

@api_router.put("/posts/{post_id}", response_model=Post)
async def update_post(post_id: str, update: PostUpdate):
    post = await db.posts.find_one({"id": post_id}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    update_data = update.model_dump(exclude_unset=True)
    if update_data:
        update_data['updated_at'] = serialize_datetime(datetime.now(timezone.utc))
        
        # Recalculate word counts if content/hook changed
        if 'content' in update_data:
            update_data['word_count'] = len(update_data['content'].split()) if update_data['content'] else 0
        if 'hook' in update_data:
            update_data['hook_word_count'] = len(update_data['hook'].split()) if update_data['hook'] else 0
        
        await db.posts.update_one({"id": post_id}, {"$set": update_data})
    
    updated_post = await db.posts.find_one({"id": post_id}, {"_id": 0})
    return Post(**deserialize_datetime(updated_post))

@api_router.delete("/posts/{post_id}")
async def delete_post(post_id: str):
    result = await db.posts.delete_one({"id": post_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Post not found")
    return {"message": "Post deleted successfully"}

# ============== Post Scheduling Routes ==============

@api_router.post("/posts/{post_id}/schedule")
async def schedule_post(post_id: str, scheduled_date: str, scheduled_slot: int, scheduled_time: Optional[str] = None):
    """Schedule a post to a specific date and slot"""
    post = await db.posts.find_one({"id": post_id}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    # Check if slot is available
    existing = await db.posts.find_one({
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
    
    await db.posts.update_one({"id": post_id}, {"$set": update_data})
    updated_post = await db.posts.find_one({"id": post_id}, {"_id": 0})
    return Post(**deserialize_datetime(updated_post))

@api_router.post("/posts/{post_id}/publish")
async def publish_post(post_id: str):
    """Mark a post as published and start engagement timer"""
    post = await db.posts.find_one({"id": post_id}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    now = datetime.now(timezone.utc)
    update_data = {
        "status": "published",
        "published_at": serialize_datetime(now),
        "engagement_timer_start": serialize_datetime(now),
        "updated_at": serialize_datetime(now)
    }
    
    await db.posts.update_one({"id": post_id}, {"$set": update_data})
    updated_post = await db.posts.find_one({"id": post_id}, {"_id": 0})
    return Post(**deserialize_datetime(updated_post))

@api_router.post("/posts/{post_id}/unschedule")
async def unschedule_post(post_id: str):
    """Remove scheduling from a post"""
    post = await db.posts.find_one({"id": post_id}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    update_data = {
        "scheduled_date": None,
        "scheduled_slot": None,
        "scheduled_time": None,
        "status": "draft",
        "updated_at": serialize_datetime(datetime.now(timezone.utc))
    }
    
    await db.posts.update_one({"id": post_id}, {"$set": update_data})
    updated_post = await db.posts.find_one({"id": post_id}, {"_id": 0})
    return Post(**deserialize_datetime(updated_post))

# ============== Engagement Timer Routes ==============

@api_router.get("/engagement/active")
async def get_active_engagement():
    """Get posts with active engagement timers (published in last 30 minutes)"""
    thirty_mins_ago = datetime.now(timezone.utc) - timedelta(minutes=30)
    
    posts = await db.posts.find({
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
async def update_engagement_metrics(post_id: str, views: int = 0, likes: int = 0, comments: int = 0, shares: int = 0):
    """Update engagement metrics for a post"""
    post = await db.posts.find_one({"id": post_id}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    update_data = {
        "views": views,
        "likes": likes,
        "comments": comments,
        "shares": shares,
        "updated_at": serialize_datetime(datetime.now(timezone.utc))
    }
    
    await db.posts.update_one({"id": post_id}, {"$set": update_data})
    updated_post = await db.posts.find_one({"id": post_id}, {"_id": 0})
    return Post(**deserialize_datetime(updated_post))

# ============== Calendar Routes ==============

@api_router.get("/calendar/week")
async def get_week_calendar(week_offset: int = 0):
    """Get posts for a specific week (0 = current week)"""
    today = datetime.now(timezone.utc)
    start_of_week = today - timedelta(days=today.weekday()) + timedelta(weeks=week_offset)
    
    week_dates = []
    for i in range(7):
        date = start_of_week + timedelta(days=i)
        week_dates.append(date.strftime("%Y-%m-%d"))
    
    posts = await db.posts.find(
        {"scheduled_date": {"$in": week_dates}},
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
async def get_knowledge_items(source_type: Optional[str] = None):
    """Get all knowledge items"""
    query = {}
    if source_type:
        query["source_type"] = source_type
    items = await db.knowledge_vault.find(query, {"_id": 0}).to_list(1000)
    return [KnowledgeItem(**deserialize_datetime(i)) for i in items]

@api_router.get("/knowledge/{item_id}", response_model=KnowledgeItem)
async def get_knowledge_item(item_id: str):
    """Get a single knowledge item"""
    item = await db.knowledge_vault.find_one({"id": item_id}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Knowledge item not found")
    return KnowledgeItem(**deserialize_datetime(item))

@api_router.post("/knowledge", response_model=KnowledgeItem)
async def create_knowledge_item(item_create: KnowledgeItemCreate):
    """Create a new knowledge item"""
    item = KnowledgeItem(**item_create.model_dump())
    
    doc = item.model_dump()
    doc['created_at'] = serialize_datetime(doc['created_at'])
    doc['updated_at'] = serialize_datetime(doc['updated_at'])
    
    await db.knowledge_vault.insert_one(doc)
    return item

@api_router.post("/knowledge/upload")
async def upload_knowledge_file(
    file: UploadFile = File(...),
    title: str = Form(...),
    source_type: str = Form("pdf"),
    tags: str = Form("")
):
    """Upload a file to the knowledge vault"""
    # Save file
    file_id = str(uuid.uuid4())
    file_ext = file.filename.split('.')[-1] if '.' in file.filename else 'txt'
    file_path = UPLOAD_DIR / f"{file_id}.{file_ext}"
    
    async with aiofiles.open(file_path, 'wb') as f:
        content = await file.read()
        await f.write(content)
    
    # Extract text content based on file type
    text_content = ""
    if file_ext in ['txt', 'md']:
        text_content = content.decode('utf-8', errors='ignore')
    elif file_ext == 'pdf':
        # For PDFs, store the path - extraction would need a PDF library
        text_content = f"[PDF file uploaded: {file.filename}]"
    
    # Create knowledge item
    tag_list = [t.strip() for t in tags.split(',') if t.strip()]
    item = KnowledgeItem(
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
async def add_knowledge_from_url(url: str, title: str, tags: List[str] = []):
    """Add content from a URL to the knowledge vault"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, timeout=30.0)
            response.raise_for_status()
            content = response.text[:50000]  # Limit content size
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch URL: {str(e)}")
    
    item = KnowledgeItem(
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
async def update_knowledge_item(item_id: str, update: KnowledgeItemUpdate):
    """Update a knowledge item"""
    item = await db.knowledge_vault.find_one({"id": item_id}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Knowledge item not found")
    
    update_data = update.model_dump(exclude_unset=True)
    if update_data:
        update_data['updated_at'] = serialize_datetime(datetime.now(timezone.utc))
        await db.knowledge_vault.update_one({"id": item_id}, {"$set": update_data})
    
    updated_item = await db.knowledge_vault.find_one({"id": item_id}, {"_id": 0})
    return KnowledgeItem(**deserialize_datetime(updated_item))

@api_router.delete("/knowledge/{item_id}")
async def delete_knowledge_item(item_id: str):
    """Delete a knowledge item"""
    item = await db.knowledge_vault.find_one({"id": item_id}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Knowledge item not found")
    
    # Delete associated file if exists
    if item.get('file_path'):
        file_path = Path(item['file_path'])
        if file_path.exists():
            file_path.unlink()
    
    await db.knowledge_vault.delete_one({"id": item_id})
    return {"message": "Knowledge item deleted successfully"}

@api_router.post("/knowledge/{item_id}/extract-gems")
async def extract_gems(item_id: str):
    """Use AI to extract monetizable expertise gems from a knowledge item"""
    item = await db.knowledge_vault.find_one({"id": item_id}, {"_id": 0})
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
            session_id=f"gem-extract-{uuid.uuid4()}",
            system_message=system_message
        )
        
        content = item.get('content', '')[:10000]  # Limit content
        response = await chat.send_message(UserMessage(text=f"Extract monetizable expertise gems from this content:\n\n{content}"))
        
        # Parse JSON from response
        json_match = re.search(r'\[[\s\S]*\]', response)
        if json_match:
            gems_data = json.loads(json_match.group())
            gems = [g.get('gem', '') for g in gems_data if g.get('gem')]
            
            # Update the knowledge item with extracted gems
            await db.knowledge_vault.update_one(
                {"id": item_id},
                {"$set": {
                    "extracted_gems": gems,
                    "updated_at": serialize_datetime(datetime.now(timezone.utc))
                }}
            )
            
            return {"gems": gems_data}
        
        return {"gems": []}
    except Exception as e:
        logger.error(f"Gem extraction error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Gem extraction failed: {str(e)}")

# ============== Performance Analytics Routes ==============

@api_router.get("/analytics/performance", response_model=PerformanceMetrics)
async def get_performance_metrics():
    """Get comprehensive performance analytics"""
    all_posts = await db.posts.find({}, {"_id": 0}).to_list(1000)
    published_posts = [p for p in all_posts if p.get('status') == 'published']
    
    # Calculate pillar performance
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
    
    # Get best performing posts
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
    
    # Weekly trend (last 4 weeks)
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
async def get_pillar_recommendation():
    """Get AI recommendation for optimal pillar distribution based on performance"""
    metrics = await get_performance_metrics()
    
    pillar_perf = metrics.pillar_performance
    
    # Calculate optimal distribution based on performance
    total_engagement = sum(p.get('total_engagement', 0) for p in pillar_perf.values())
    
    if total_engagement == 0:
        return {
            "recommendation": "Start with the 4-3-2-1 balanced strategy",
            "suggested_distribution": {"growth": 40, "tam": 35, "sales": 25},
            "insight": "Not enough data yet. Follow the standard 4-3-2-1 framework."
        }
    
    # Recommend based on what's working
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
async def generate_content(request: ContentGenerationRequest):
    """Generate LinkedIn post content using AI"""
    
    # Get knowledge vault content for context
    knowledge_items = await db.knowledge_vault.find({}, {"_id": 0, "content": 1, "extracted_gems": 1}).to_list(10)
    knowledge_context = ""
    if knowledge_items:
        gems = []
        for item in knowledge_items:
            gems.extend(item.get('extracted_gems', []))
        if gems:
            knowledge_context = f"\n\nUser's expertise gems to potentially incorporate: {', '.join(gems[:5])}"
    
    # Get active voice profile
    voice_context = ""
    voice_profile = await db.voice_profiles.find_one({"is_active": True}, {"_id": 0})
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
        raise HTTPException(status_code=500, detail=f"AI generation failed: {str(e)}")

@api_router.post("/ai/suggest-topics", response_model=List[TopicSuggestion])
async def suggest_topics(context: Optional[str] = None, inspiration_url: Optional[str] = None):
    """Generate topic suggestions for LinkedIn posts"""
    
    # Fetch inspiration content from URL if provided
    inspiration_content = ""
    if inspiration_url:
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(inspiration_url, timeout=15.0, follow_redirects=True)
                response.raise_for_status()
                # Get text content and limit size
                raw_content = response.text[:15000]
                # Clean up HTML if present
                import re as regex
                # Remove script and style tags
                raw_content = regex.sub(r'<script[^>]*>.*?</script>', '', raw_content, flags=regex.DOTALL)
                raw_content = regex.sub(r'<style[^>]*>.*?</style>', '', raw_content, flags=regex.DOTALL)
                # Remove HTML tags
                raw_content = regex.sub(r'<[^>]+>', ' ', raw_content)
                # Clean up whitespace
                raw_content = regex.sub(r'\s+', ' ', raw_content).strip()
                inspiration_content = f"\n\nINSPIRATION CONTENT from {inspiration_url}:\n{raw_content[:8000]}\n\nUse this content as inspiration to generate topic ideas that align with and relate to this material."
        except Exception as e:
            logger.warning(f"Failed to fetch inspiration URL: {str(e)}")
    
    # Get knowledge vault gems for personalized suggestions
    knowledge_items = await db.knowledge_vault.find({}, {"_id": 0, "extracted_gems": 1, "tags": 1}).to_list(20)
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
            session_id=f"topic-suggest-{uuid.uuid4()}",
            system_message=system_message
        )
        
        prompt = "Generate 5 LinkedIn post topic suggestions"
        if context:
            prompt += f" based on this context: {context}"
        if inspiration_url:
            prompt += f". Topics should be inspired by and relevant to the content from the provided URL."
        
        response = await chat.send_message(UserMessage(text=prompt))
        
        # Parse JSON from response
        json_match = re.search(r'\[[\s\S]*\]', response)
        if json_match:
            suggestions = json.loads(json_match.group())
            return [TopicSuggestion(**s) for s in suggestions[:5]]
        
        # Fallback default suggestions
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
async def improve_hook(request: HookValidationRequest):
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
            session_id=f"hook-improve-{uuid.uuid4()}",
            system_message=system_message
        )
        
        response = await chat.send_message(UserMessage(text=f"Improve this hook: {request.hook}"))
        
        return {"suggestions": response}
    except Exception as e:
        logger.error(f"Hook improvement error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Hook improvement failed: {str(e)}")

# ============== Hook Validation Route ==============

@api_router.post("/validate-hook", response_model=HookValidationResponse)
async def validate_hook(request: HookValidationRequest):
    """Validate a hook against the 8-word rule"""
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
    
    # Check for weak starts
    weak_starts = ["how to", "why you", "what you", "the best", "top 10"]
    hook_lower = request.hook.lower()
    for weak in weak_starts:
        if hook_lower.startswith(weak):
            suggestions.append(f"Consider replacing '{weak}' with 'How I' for more authority.")
            score -= 15
            break
    
    # Check for specific numbers
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

# LinkedIn OAuth Configuration
LINKEDIN_CLIENT_ID = os.environ.get('LINKEDIN_CLIENT_ID', '')
LINKEDIN_CLIENT_SECRET = os.environ.get('LINKEDIN_CLIENT_SECRET', '')
LINKEDIN_REDIRECT_URI = os.environ.get('LINKEDIN_REDIRECT_URI', '')
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:3000')

@api_router.get("/linkedin/auth")
async def get_linkedin_auth_url():
    """Generate LinkedIn OAuth authorization URL"""
    if not LINKEDIN_CLIENT_ID:
        raise HTTPException(status_code=400, detail="LinkedIn Client ID not configured. Please add your LinkedIn API credentials in settings.")
    
    scopes = "r_emailaddress profile w_member_social openid"
    state = str(uuid.uuid4())
    
    auth_url = (
        f"https://www.linkedin.com/oauth/v2/authorization?"
        f"response_type=code&"
        f"client_id={LINKEDIN_CLIENT_ID}&"
        f"redirect_uri={LINKEDIN_REDIRECT_URI}&"
        f"scope={scopes}&"
        f"state={state}"
    )
    
    return {"auth_url": auth_url, "state": state}

@api_router.get("/linkedin/callback")
async def linkedin_callback(code: str, state: Optional[str] = None):
    """Handle LinkedIn OAuth callback and exchange code for access token"""
    if not LINKEDIN_CLIENT_ID or not LINKEDIN_CLIENT_SECRET:
        raise HTTPException(status_code=400, detail="LinkedIn API credentials not configured")
    
    # Exchange code for access token
    async with httpx.AsyncClient() as client:
        token_response = await client.post(
            "https://www.linkedin.com/oauth/v2/accessToken",
            data={
                "grant_type": "authorization_code",
                "code": code,
                "client_id": LINKEDIN_CLIENT_ID,
                "client_secret": LINKEDIN_CLIENT_SECRET,
                "redirect_uri": LINKEDIN_REDIRECT_URI
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        
        if token_response.status_code != 200:
            logger.error(f"LinkedIn token exchange failed: {token_response.text}")
            raise HTTPException(status_code=400, detail="Failed to exchange code for token")
        
        token_data = token_response.json()
        access_token = token_data.get("access_token")
        expires_in = token_data.get("expires_in", 5184000)  # Default 60 days
        
        # Get user profile
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
    
    # Update user settings with LinkedIn connection
    settings = await get_user_settings()
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)
    
    await db.user_settings.update_one(
        {"id": settings.id},
        {"$set": {
            "linkedin_connected": True,
            "linkedin_access_token": access_token,
            "linkedin_user_id": linkedin_user_id,
            "linkedin_name": linkedin_name,
            "linkedin_token_expires": serialize_datetime(expires_at),
            "updated_at": serialize_datetime(datetime.now(timezone.utc))
        }}
    )
    
    # Redirect to frontend with success
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url=f"{FRONTEND_URL}/settings?linkedin=connected")

@api_router.post("/linkedin/disconnect")
async def disconnect_linkedin():
    """Disconnect LinkedIn account"""
    settings = await get_user_settings()
    
    await db.user_settings.update_one(
        {"id": settings.id},
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
async def publish_to_linkedin(post_id: str):
    """Publish a post directly to LinkedIn"""
    settings = await get_user_settings()
    
    if not settings.linkedin_connected or not settings.linkedin_access_token:
        raise HTTPException(status_code=400, detail="LinkedIn account not connected")
    
    # Check if token is expired
    if settings.linkedin_token_expires:
        expires_at = datetime.fromisoformat(settings.linkedin_token_expires.replace('Z', '+00:00'))
        if expires_at < datetime.now(timezone.utc):
            raise HTTPException(status_code=401, detail="LinkedIn token expired. Please reconnect your account.")
    
    # Get the post
    post = await db.posts.find_one({"id": post_id}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    # Format post content for LinkedIn
    full_content = f"{post.get('hook', '')}\n\n{post.get('rehook', '')}\n\n{post.get('content', '')}"
    full_content = full_content.strip()
    
    # Prepare LinkedIn post payload
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
    
    # Update post with LinkedIn details
    now = datetime.now(timezone.utc)
    await db.posts.update_one(
        {"id": post_id},
        {"$set": {
            "status": "published",
            "published_at": serialize_datetime(now),
            "engagement_timer_start": serialize_datetime(now),
            "linkedin_post_id": linkedin_post_id,
            "linkedin_post_url": f"https://www.linkedin.com/feed/update/{linkedin_post_id}",
            "updated_at": serialize_datetime(now)
        }}
    )
    
    updated_post = await db.posts.find_one({"id": post_id}, {"_id": 0})
    return {
        "success": True,
        "linkedin_post_id": linkedin_post_id,
        "post": Post(**deserialize_datetime(updated_post))
    }

# ============== Voice Profile Routes ==============

@api_router.get("/voice-profiles", response_model=List[VoiceProfile])
async def get_voice_profiles():
    """Get all voice profiles"""
    profiles = await db.voice_profiles.find({}, {"_id": 0}).to_list(100)
    return [VoiceProfile(**deserialize_datetime(p)) for p in profiles]

@api_router.get("/voice-profiles/active", response_model=Optional[VoiceProfile])
async def get_active_voice_profile():
    """Get the currently active voice profile"""
    profile = await db.voice_profiles.find_one({"is_active": True}, {"_id": 0})
    if profile:
        return VoiceProfile(**deserialize_datetime(profile))
    return None

@api_router.get("/voice-profiles/{profile_id}", response_model=VoiceProfile)
async def get_voice_profile(profile_id: str):
    """Get a specific voice profile"""
    profile = await db.voice_profiles.find_one({"id": profile_id}, {"_id": 0})
    if not profile:
        raise HTTPException(status_code=404, detail="Voice profile not found")
    return VoiceProfile(**deserialize_datetime(profile))

@api_router.post("/voice-profiles", response_model=VoiceProfile)
async def create_voice_profile(profile_create: VoiceProfileCreate):
    """Create a new voice profile"""
    profile = VoiceProfile(**profile_create.model_dump())
    
    doc = profile.model_dump()
    doc['created_at'] = serialize_datetime(doc['created_at'])
    doc['updated_at'] = serialize_datetime(doc['updated_at'])
    
    await db.voice_profiles.insert_one(doc)
    return profile

@api_router.put("/voice-profiles/{profile_id}", response_model=VoiceProfile)
async def update_voice_profile(profile_id: str, update: VoiceProfileUpdate):
    """Update a voice profile"""
    profile = await db.voice_profiles.find_one({"id": profile_id}, {"_id": 0})
    if not profile:
        raise HTTPException(status_code=404, detail="Voice profile not found")
    
    update_data = update.model_dump(exclude_unset=True)
    if update_data:
        update_data['updated_at'] = serialize_datetime(datetime.now(timezone.utc))
        
        # If setting this profile as active, deactivate others
        if update_data.get('is_active'):
            await db.voice_profiles.update_many(
                {"id": {"$ne": profile_id}},
                {"$set": {"is_active": False}}
            )
        
        await db.voice_profiles.update_one({"id": profile_id}, {"$set": update_data})
    
    updated_profile = await db.voice_profiles.find_one({"id": profile_id}, {"_id": 0})
    return VoiceProfile(**deserialize_datetime(updated_profile))

@api_router.delete("/voice-profiles/{profile_id}")
async def delete_voice_profile(profile_id: str):
    """Delete a voice profile"""
    result = await db.voice_profiles.delete_one({"id": profile_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Voice profile not found")
    return {"message": "Voice profile deleted successfully"}

@api_router.post("/voice-profiles/{profile_id}/activate")
async def activate_voice_profile(profile_id: str):
    """Set a voice profile as the active one"""
    profile = await db.voice_profiles.find_one({"id": profile_id}, {"_id": 0})
    if not profile:
        raise HTTPException(status_code=404, detail="Voice profile not found")
    
    # Deactivate all profiles
    await db.voice_profiles.update_many({}, {"$set": {"is_active": False}})
    
    # Activate selected profile
    await db.voice_profiles.update_one(
        {"id": profile_id},
        {"$set": {"is_active": True, "updated_at": serialize_datetime(datetime.now(timezone.utc))}}
    )
    
    updated_profile = await db.voice_profiles.find_one({"id": profile_id}, {"_id": 0})
    return VoiceProfile(**deserialize_datetime(updated_profile))

@api_router.post("/voice-profiles/analyze-samples")
async def analyze_writing_samples(samples: List[str]):
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
            session_id=f"voice-analyze-{uuid.uuid4()}",
            system_message=system_message
        )
        
        samples_text = "\n\n---SAMPLE---\n\n".join(samples)
        response = await chat.send_message(UserMessage(text=f"Analyze these writing samples:\n\n{samples_text}"))
        
        # Parse JSON from response
        json_match = re.search(r'\{[\s\S]*\}', response)
        if json_match:
            analysis = json.loads(json_match.group())
            return analysis
        
        return {"error": "Could not parse analysis"}
    except Exception as e:
        logger.error(f"Voice analysis error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Voice analysis failed: {str(e)}")

# ============== Root Route ==============

@api_router.get("/")
async def root():
    return {"message": "LinkedIn Authority Engine API", "version": "3.0.0"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
