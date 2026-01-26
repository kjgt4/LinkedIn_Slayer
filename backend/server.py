from fastapi import FastAPI, APIRouter, HTTPException
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

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

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
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserSettingsUpdate(BaseModel):
    ai_provider: Optional[Literal["anthropic", "openai", "gemini"]] = None
    ai_model: Optional[str] = None
    api_key: Optional[str] = None
    use_emergent_key: Optional[bool] = None

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
    word_count: int = 0
    hook_word_count: int = 0
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

# ============== AI Content Generation Routes ==============

@api_router.post("/ai/generate-content")
async def generate_content(request: ContentGenerationRequest):
    """Generate LinkedIn post content using AI"""
    
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
async def suggest_topics(context: Optional[str] = None):
    """Generate topic suggestions for LinkedIn posts"""
    
    system_message = """You are an expert LinkedIn content strategist. Generate 5 diverse topic suggestions for LinkedIn posts.

For each topic, specify:
1. The topic/angle
2. Content pillar: growth (broad appeal), tam (niche education), or sales (case study/proof)
3. Recommended framework: slay (story-driven) or pas (problem-solution)
4. A brief angle/hook idea

Output as JSON array with format:
[
  {"topic": "...", "pillar": "growth|tam|sales", "framework": "slay|pas", "angle": "..."},
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
        
        response = await chat.send_message(UserMessage(text=prompt))
        
        # Parse JSON from response
        import json
        import re
        
        # Try to extract JSON from response
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
        # Return fallback suggestions
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
    import re
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

# ============== Root Route ==============

@api_router.get("/")
async def root():
    return {"message": "LinkedIn Authority Engine API", "version": "1.0.0"}

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
