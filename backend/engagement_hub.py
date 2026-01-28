"""
Strategic Engagement Hub - Models and Routes
Enables tracking influencers, their posts, and AI-assisted comment drafting
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Literal, Annotated
import uuid
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import json
import re
from auth import RequiredUserId

logger = logging.getLogger(__name__)

# ============== Models ==============

class TrackedInfluencer(BaseModel):
    """Influencer tracked for engagement"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str  # Clerk user ID for workspace isolation
    name: str
    linkedin_url: str
    headline: Optional[str] = None
    profile_image_url: Optional[str] = None
    follower_count: Optional[int] = None
    content_themes: List[str] = Field(default_factory=list)
    engagement_priority: Literal["high", "medium", "low"] = "medium"
    relationship_status: Literal["discovered", "following", "engaged", "connected"] = "discovered"
    notes: Optional[str] = None
    added_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_engaged_at: Optional[datetime] = None

class TrackedInfluencerCreate(BaseModel):
    """Create influencer request"""
    name: str
    linkedin_url: str
    headline: Optional[str] = None
    profile_image_url: Optional[str] = None
    follower_count: Optional[int] = None
    content_themes: List[str] = Field(default_factory=list)
    engagement_priority: Literal["high", "medium", "low"] = "medium"
    relationship_status: Literal["discovered", "following", "engaged", "connected"] = "discovered"
    notes: Optional[str] = None

class TrackedInfluencerUpdate(BaseModel):
    """Update influencer request"""
    name: Optional[str] = None
    linkedin_url: Optional[str] = None
    headline: Optional[str] = None
    profile_image_url: Optional[str] = None
    follower_count: Optional[int] = None
    content_themes: Optional[List[str]] = None
    engagement_priority: Optional[Literal["high", "medium", "low"]] = None
    relationship_status: Optional[Literal["discovered", "following", "engaged", "connected"]] = None
    notes: Optional[str] = None

class TrackedPost(BaseModel):
    """Post tracked for engagement"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str  # Clerk user ID
    influencer_id: str
    linkedin_post_url: str
    post_content: str
    post_date: Optional[datetime] = None
    discovered_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    status: Literal["new", "draft_ready", "engaged", "skipped"] = "new"
    engagement_type: Optional[Literal["like", "comment", "both", "none"]] = None
    drafted_comment: Optional[str] = None
    final_comment: Optional[str] = None
    selected_approach: Optional[str] = None
    engaged_at: Optional[datetime] = None

class TrackedPostCreate(BaseModel):
    """Create tracked post request"""
    influencer_id: str
    linkedin_post_url: str
    post_content: str
    post_date: Optional[datetime] = None

class TrackedPostUpdate(BaseModel):
    """Update tracked post request"""
    linkedin_post_url: Optional[str] = None
    post_content: Optional[str] = None
    post_date: Optional[datetime] = None
    status: Optional[Literal["new", "draft_ready", "engaged", "skipped"]] = None
    engagement_type: Optional[Literal["like", "comment", "both", "none"]] = None
    drafted_comment: Optional[str] = None
    final_comment: Optional[str] = None
    selected_approach: Optional[str] = None

class MarkEngagedRequest(BaseModel):
    """Request to mark post as engaged"""
    engagement_type: Literal["like", "comment", "both"]

class DraftCommentRequest(BaseModel):
    """Request to draft engagement comment"""
    influencer_id: str
    post_content: str
    post_url: str
    engagement_goal: Literal["visibility", "relationship", "thought_leadership"] = "relationship"

class CommentVariation(BaseModel):
    """Single comment variation"""
    approach: str
    comment: str
    word_count: int

class DraftCommentResponse(BaseModel):
    """Response with comment variations"""
    variations: List[CommentVariation]

class DiscoveryRequest(BaseModel):
    """Request for influencer discovery suggestions"""
    user_content_pillars: List[str] = Field(default_factory=lambda: ["Growth", "TAM", "Sales"])
    user_industry: str = ""
    user_target_audience: str = ""
    existing_themes: List[str] = Field(default_factory=list)

class SearchStrategy(BaseModel):
    """Single search strategy"""
    approach: str
    query: str
    instructions: str

class DiscoveryResponse(BaseModel):
    """Response with discovery strategies"""
    search_strategies: List[SearchStrategy]
    suggested_niches: List[str]
    suggested_search_terms: List[str]

class EngagementAnalytics(BaseModel):
    """Engagement analytics response"""
    total_influencers: int = 0
    engagements_this_week: int = 0
    engagements_this_month: int = 0
    current_streak_days: int = 0
    longest_streak_days: int = 0
    avg_response_time_hours: float = 0.0
    top_engaged_influencers: List[dict] = Field(default_factory=list)
    cold_influencers: List[dict] = Field(default_factory=list)
    heatmap_data: dict = Field(default_factory=dict)

# ============== Helper Functions ==============

def serialize_datetime(obj):
    """Convert datetime to ISO string for MongoDB"""
    if isinstance(obj, datetime):
        return obj.isoformat()
    return obj

def deserialize_datetime(doc):
    """Convert ISO string back to datetime for common fields"""
    datetime_fields = ['added_at', 'last_engaged_at', 'discovered_at', 'post_date', 'engaged_at', 'created_at', 'updated_at']
    if doc:
        for field in datetime_fields:
            if field in doc and isinstance(doc[field], str):
                try:
                    doc[field] = datetime.fromisoformat(doc[field].replace('Z', '+00:00'))
                except:
                    pass
    return doc

def create_engagement_router(db, get_llm_chat_func, get_user_settings_func):
    """Create the engagement hub router with database dependency"""
    
    router = APIRouter(prefix="/api")
    
    # ============== Influencers Routes ==============
    
    @router.get("/influencers", response_model=List[TrackedInfluencer])
    async def get_influencers(
        user_id: str,
        theme: Optional[str] = None,
        priority: Optional[str] = None,
        status: Optional[str] = None,
        sort: Optional[str] = "added_at"
    ):
        """Get all tracked influencers for user"""
        query = {"user_id": user_id}
        if theme:
            query["content_themes"] = {"$in": [theme]}
        if priority:
            query["engagement_priority"] = priority
        if status:
            query["relationship_status"] = status
        
        sort_field = sort if sort in ["added_at", "last_engaged_at", "follower_count", "name"] else "added_at"
        sort_dir = -1 if sort_field in ["added_at", "last_engaged_at", "follower_count"] else 1
        
        influencers = await db.tracked_influencers.find(query, {"_id": 0}).sort(sort_field, sort_dir).to_list(500)
        return [TrackedInfluencer(**deserialize_datetime(i)) for i in influencers]
    
    @router.get("/influencers/{influencer_id}", response_model=TrackedInfluencer)
    async def get_influencer(influencer_id: str, user_id: str):
        """Get single influencer"""
        influencer = await db.tracked_influencers.find_one(
            {"id": influencer_id, "user_id": user_id}, {"_id": 0}
        )
        if not influencer:
            raise HTTPException(status_code=404, detail="Influencer not found")
        return TrackedInfluencer(**deserialize_datetime(influencer))
    
    @router.post("/influencers", response_model=TrackedInfluencer)
    async def create_influencer(data: TrackedInfluencerCreate, user_id: str):
        """Add new influencer to track"""
        influencer = TrackedInfluencer(user_id=user_id, **data.model_dump())
        
        doc = influencer.model_dump()
        doc['added_at'] = serialize_datetime(doc['added_at'])
        if doc.get('last_engaged_at'):
            doc['last_engaged_at'] = serialize_datetime(doc['last_engaged_at'])
        
        await db.tracked_influencers.insert_one(doc)
        return influencer
    
    @router.put("/influencers/{influencer_id}", response_model=TrackedInfluencer)
    async def update_influencer(influencer_id: str, data: TrackedInfluencerUpdate, user_id: str):
        """Update influencer"""
        influencer = await db.tracked_influencers.find_one(
            {"id": influencer_id, "user_id": user_id}, {"_id": 0}
        )
        if not influencer:
            raise HTTPException(status_code=404, detail="Influencer not found")
        
        update_data = data.model_dump(exclude_unset=True)
        if update_data:
            await db.tracked_influencers.update_one(
                {"id": influencer_id, "user_id": user_id},
                {"$set": update_data}
            )
        
        updated = await db.tracked_influencers.find_one(
            {"id": influencer_id, "user_id": user_id}, {"_id": 0}
        )
        return TrackedInfluencer(**deserialize_datetime(updated))
    
    @router.delete("/influencers/{influencer_id}")
    async def delete_influencer(influencer_id: str, user_id: str):
        """Delete influencer and their tracked posts"""
        result = await db.tracked_influencers.delete_one(
            {"id": influencer_id, "user_id": user_id}
        )
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Influencer not found")
        
        # Cascade delete tracked posts
        await db.tracked_posts.delete_many(
            {"influencer_id": influencer_id, "user_id": user_id}
        )
        
        return {"message": "Influencer and associated posts deleted"}
    
    # ============== Tracked Posts Routes ==============
    
    @router.get("/tracked-posts", response_model=List[TrackedPost])
    async def get_tracked_posts(
        user_id: str,
        influencer_id: Optional[str] = None,
        status: Optional[str] = None,
        sort: Optional[str] = "discovered_at"
    ):
        """Get all tracked posts"""
        query = {"user_id": user_id}
        if influencer_id:
            query["influencer_id"] = influencer_id
        if status:
            query["status"] = status
        
        posts = await db.tracked_posts.find(query, {"_id": 0}).sort("discovered_at", -1).to_list(500)
        return [TrackedPost(**deserialize_datetime(p)) for p in posts]
    
    @router.get("/tracked-posts/queue")
    async def get_engagement_queue(user_id: str):
        """Get prioritized engagement queue"""
        # Get posts with status new or draft_ready
        posts = await db.tracked_posts.find(
            {"user_id": user_id, "status": {"$in": ["new", "draft_ready"]}},
            {"_id": 0}
        ).to_list(500)
        
        # Get influencer data for priority sorting
        influencer_ids = list(set(p["influencer_id"] for p in posts))
        influencers = await db.tracked_influencers.find(
            {"id": {"$in": influencer_ids}, "user_id": user_id},
            {"_id": 0}
        ).to_list(500)
        influencer_map = {i["id"]: i for i in influencers}
        
        # Enrich posts with influencer data and sort
        priority_order = {"high": 0, "medium": 1, "low": 2}
        enriched_posts = []
        for post in posts:
            inf = influencer_map.get(post["influencer_id"], {})
            post["influencer_name"] = inf.get("name", "Unknown")
            post["influencer_headline"] = inf.get("headline", "")
            post["influencer_image"] = inf.get("profile_image_url", "")
            post["priority"] = inf.get("engagement_priority", "medium")
            enriched_posts.append(post)
        
        # Sort by priority then by discovered_at
        enriched_posts.sort(key=lambda x: (
            priority_order.get(x.get("priority", "medium"), 1),
            x.get("discovered_at", "")
        ), reverse=False)
        
        return [deserialize_datetime(p) for p in enriched_posts]
    
    @router.get("/tracked-posts/{post_id}", response_model=TrackedPost)
    async def get_tracked_post(post_id: str, user_id: str):
        """Get single tracked post"""
        post = await db.tracked_posts.find_one(
            {"id": post_id, "user_id": user_id}, {"_id": 0}
        )
        if not post:
            raise HTTPException(status_code=404, detail="Post not found")
        return TrackedPost(**deserialize_datetime(post))
    
    @router.post("/tracked-posts", response_model=TrackedPost)
    async def create_tracked_post(data: TrackedPostCreate, user_id: str):
        """Add new post to track"""
        # Verify influencer exists
        influencer = await db.tracked_influencers.find_one(
            {"id": data.influencer_id, "user_id": user_id}, {"_id": 0}
        )
        if not influencer:
            raise HTTPException(status_code=404, detail="Influencer not found")
        
        post = TrackedPost(user_id=user_id, **data.model_dump())
        
        doc = post.model_dump()
        doc['discovered_at'] = serialize_datetime(doc['discovered_at'])
        if doc.get('post_date'):
            doc['post_date'] = serialize_datetime(doc['post_date'])
        
        await db.tracked_posts.insert_one(doc)
        return post
    
    @router.put("/tracked-posts/{post_id}", response_model=TrackedPost)
    async def update_tracked_post(post_id: str, data: TrackedPostUpdate, user_id: str):
        """Update tracked post"""
        post = await db.tracked_posts.find_one(
            {"id": post_id, "user_id": user_id}, {"_id": 0}
        )
        if not post:
            raise HTTPException(status_code=404, detail="Post not found")
        
        update_data = data.model_dump(exclude_unset=True)
        if update_data:
            await db.tracked_posts.update_one(
                {"id": post_id, "user_id": user_id},
                {"$set": update_data}
            )
        
        updated = await db.tracked_posts.find_one(
            {"id": post_id, "user_id": user_id}, {"_id": 0}
        )
        return TrackedPost(**deserialize_datetime(updated))
    
    @router.delete("/tracked-posts/{post_id}")
    async def delete_tracked_post(post_id: str, user_id: str):
        """Delete tracked post"""
        result = await db.tracked_posts.delete_one(
            {"id": post_id, "user_id": user_id}
        )
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Post not found")
        return {"message": "Post deleted"}
    
    @router.post("/tracked-posts/{post_id}/mark-engaged")
    async def mark_post_engaged(post_id: str, data: MarkEngagedRequest, user_id: str):
        """Mark post as engaged"""
        post = await db.tracked_posts.find_one(
            {"id": post_id, "user_id": user_id}, {"_id": 0}
        )
        if not post:
            raise HTTPException(status_code=404, detail="Post not found")
        
        now = datetime.now(timezone.utc)
        
        await db.tracked_posts.update_one(
            {"id": post_id, "user_id": user_id},
            {"$set": {
                "status": "engaged",
                "engagement_type": data.engagement_type,
                "engaged_at": serialize_datetime(now)
            }}
        )
        
        # Update influencer's last_engaged_at
        await db.tracked_influencers.update_one(
            {"id": post["influencer_id"], "user_id": user_id},
            {"$set": {"last_engaged_at": serialize_datetime(now)}}
        )
        
        updated = await db.tracked_posts.find_one(
            {"id": post_id, "user_id": user_id}, {"_id": 0}
        )
        return TrackedPost(**deserialize_datetime(updated))
    
    # ============== AI Comment Drafting ==============
    
    @router.post("/ai/draft-engagement-comment", response_model=DraftCommentResponse)
    async def draft_engagement_comment(data: DraftCommentRequest, user_id: str):
        """Generate AI comment variations for engagement"""
        
        # Get influencer details
        influencer = await db.tracked_influencers.find_one(
            {"id": data.influencer_id, "user_id": user_id}, {"_id": 0}
        )
        if not influencer:
            raise HTTPException(status_code=404, detail="Influencer not found")
        
        # Get user's voice profile
        voice_profile = await db.voice_profiles.find_one(
            {"user_id": user_id, "is_active": True}, {"_id": 0}
        )
        
        # Get user settings for content pillars
        settings = await get_user_settings_func(user_id)
        
        voice_context = ""
        if voice_profile:
            voice_context = f"""
Your Voice Profile:
- Tone: {voice_profile.get('tone', 'professional')}
- Style: {voice_profile.get('vocabulary_style', 'business')}
- Personality: {', '.join(voice_profile.get('personality_traits', []))}
"""
        
        goal_context = {
            "visibility": "Focus on adding unique value that showcases your expertise and encourages others to check out your profile.",
            "relationship": "Focus on building genuine connection with the author through thoughtful engagement.",
            "thought_leadership": "Focus on positioning yourself as a knowledgeable peer with complementary insights."
        }
        
        system_message = f"""You are an expert LinkedIn engagement strategist helping craft thoughtful, authentic comments.

{voice_context}

Influencer Context:
- Name: {influencer.get('name', 'Unknown')}
- Themes they cover: {', '.join(influencer.get('content_themes', []))}

Engagement Goal: {data.engagement_goal}
{goal_context.get(data.engagement_goal, '')}

Generate 3 distinct comment variations for the post below. Each should be:
- Authentic and non-generic (no "Great post!" or "Love this!")
- 2-4 sentences long (50-100 words ideal)
- Adds value through personal experience, complementary insight, or thoughtful question
- Natural and conversational, not salesy

Output as JSON with this exact format:
{{
  "variations": [
    {{"approach": "related_experience", "comment": "Your comment sharing a related experience...", "word_count": 45}},
    {{"approach": "complementary_insight", "comment": "Your comment adding a complementary perspective...", "word_count": 52}},
    {{"approach": "thoughtful_question", "comment": "Your comment with an engaging question...", "word_count": 38}}
  ]
}}
"""

        try:
            chat = await get_llm_chat_func(
                user_id=user_id,
                session_id=f"comment-draft-{uuid.uuid4()}",
                system_message=system_message
            )
            
            response = await chat.send_message(
                type('UserMessage', (), {'text': f"Post content to comment on:\n\n{data.post_content[:3000]}"})()
            )
            
            # Parse JSON from response
            json_match = re.search(r'\{[\s\S]*\}', response)
            if json_match:
                result = json.loads(json_match.group())
                return DraftCommentResponse(
                    variations=[CommentVariation(**v) for v in result.get('variations', [])]
                )
            
            # Fallback if parsing fails
            return DraftCommentResponse(variations=[
                CommentVariation(
                    approach="related_experience",
                    comment="This resonates with my experience. I've seen similar patterns in my work and found that consistency is key.",
                    word_count=18
                ),
                CommentVariation(
                    approach="complementary_insight",
                    comment="Great perspective. I'd add that timing also plays a crucial role - knowing when to act on these insights can make all the difference.",
                    word_count=24
                ),
                CommentVariation(
                    approach="thoughtful_question",
                    comment="Interesting take. How do you approach situations where this strategy might conflict with short-term goals?",
                    word_count=16
                )
            ])
            
        except Exception as e:
            logger.error(f"Comment drafting error: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to generate comments: {str(e)}")
    
    # ============== AI Discovery Assistant ==============
    
    @router.post("/ai/suggest-influencer-search", response_model=DiscoveryResponse)
    async def suggest_influencer_search(data: DiscoveryRequest, user_id: str):
        """Get AI suggestions for finding influencers"""
        
        system_message = f"""You are an expert LinkedIn networking strategist. Help the user find influential voices in their niche.

User Context:
- Content Pillars: {', '.join(data.user_content_pillars)}
- Industry: {data.user_industry or 'Not specified'}
- Target Audience: {data.user_target_audience or 'Not specified'}
- Already tracking themes: {', '.join(data.existing_themes) if data.existing_themes else 'None yet'}

Generate actionable strategies for finding influencers on LinkedIn. Remember:
- LinkedIn doesn't allow API searching, so all discovery must be manual
- Focus on practical search queries and approaches
- Suggest both direct LinkedIn search and alternative discovery methods

Output as JSON with this exact format:
{{
  "search_strategies": [
    {{"approach": "LinkedIn Search", "query": "exact search query to use", "instructions": "Step by step instructions"}},
    {{"approach": "Hashtag Following", "query": "#relevanthashtag", "instructions": "How to use this approach"}},
    {{"approach": "Comment Mining", "query": "where to look", "instructions": "How to find active commenters"}},
    {{"approach": "Event/Group Discovery", "query": "what to search for", "instructions": "How to find through groups"}}
  ],
  "suggested_niches": ["niche1", "niche2", "niche3"],
  "suggested_search_terms": ["term1", "term2", "term3", "term4", "term5"]
}}
"""

        try:
            chat = await get_llm_chat_func(
                user_id=user_id,
                session_id=f"discovery-{uuid.uuid4()}",
                system_message=system_message
            )
            
            response = await chat.send_message(
                type('UserMessage', (), {'text': "Generate influencer discovery strategies based on my context."})()
            )
            
            json_match = re.search(r'\{[\s\S]*\}', response)
            if json_match:
                result = json.loads(json_match.group())
                return DiscoveryResponse(
                    search_strategies=[SearchStrategy(**s) for s in result.get('search_strategies', [])],
                    suggested_niches=result.get('suggested_niches', []),
                    suggested_search_terms=result.get('suggested_search_terms', [])
                )
            
            # Fallback
            return DiscoveryResponse(
                search_strategies=[
                    SearchStrategy(
                        approach="LinkedIn Search",
                        query=f"{data.user_industry} thought leader",
                        instructions="Search this term on LinkedIn, filter by 'People', and look for profiles with 10k+ followers"
                    )
                ],
                suggested_niches=["Industry experts", "Practitioners", "Consultants"],
                suggested_search_terms=data.user_content_pillars
            )
            
        except Exception as e:
            logger.error(f"Discovery suggestion error: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to generate suggestions: {str(e)}")
    
    # ============== Engagement Analytics ==============
    
    @router.get("/analytics/engagement", response_model=EngagementAnalytics)
    async def get_engagement_analytics(user_id: str):
        """Get engagement analytics"""
        
        # Get counts
        total_influencers = await db.tracked_influencers.count_documents({"user_id": user_id})
        
        now = datetime.now(timezone.utc)
        week_ago = now - timedelta(days=7)
        month_ago = now - timedelta(days=30)
        
        # Get engaged posts
        all_engaged = await db.tracked_posts.find(
            {"user_id": user_id, "status": "engaged"},
            {"_id": 0}
        ).to_list(1000)
        
        week_engaged = [p for p in all_engaged if p.get('engaged_at') and 
                       datetime.fromisoformat(str(p['engaged_at']).replace('Z', '+00:00')) > week_ago]
        month_engaged = [p for p in all_engaged if p.get('engaged_at') and 
                        datetime.fromisoformat(str(p['engaged_at']).replace('Z', '+00:00')) > month_ago]
        
        # Calculate streak
        engagement_dates = set()
        for p in all_engaged:
            if p.get('engaged_at'):
                try:
                    dt = datetime.fromisoformat(str(p['engaged_at']).replace('Z', '+00:00'))
                    engagement_dates.add(dt.date())
                except:
                    pass
        
        current_streak = 0
        check_date = now.date()
        while check_date in engagement_dates:
            current_streak += 1
            check_date -= timedelta(days=1)
        
        # Top engaged influencers
        influencer_engagement_count = {}
        for p in all_engaged:
            inf_id = p.get('influencer_id')
            if inf_id:
                influencer_engagement_count[inf_id] = influencer_engagement_count.get(inf_id, 0) + 1
        
        top_influencer_ids = sorted(influencer_engagement_count.keys(), 
                                   key=lambda x: influencer_engagement_count[x], reverse=True)[:5]
        
        top_engaged = []
        for inf_id in top_influencer_ids:
            inf = await db.tracked_influencers.find_one({"id": inf_id, "user_id": user_id}, {"_id": 0})
            if inf:
                top_engaged.append({
                    "id": inf_id,
                    "name": inf.get('name', 'Unknown'),
                    "engagement_count": influencer_engagement_count[inf_id],
                    "last_engaged": inf.get('last_engaged_at')
                })
        
        # Cold influencers (no engagement in 30+ days)
        all_influencers = await db.tracked_influencers.find({"user_id": user_id}, {"_id": 0}).to_list(500)
        cold_influencers = []
        for inf in all_influencers:
            last = inf.get('last_engaged_at')
            if not last:
                days_since = 999
            else:
                try:
                    last_dt = datetime.fromisoformat(str(last).replace('Z', '+00:00'))
                    days_since = (now - last_dt).days
                except:
                    days_since = 999
            
            if days_since >= 30:
                cold_influencers.append({
                    "id": inf.get('id'),
                    "name": inf.get('name', 'Unknown'),
                    "days_since_engagement": days_since if days_since < 999 else None
                })
        
        # Heatmap data (last 90 days)
        heatmap = {}
        for p in all_engaged:
            if p.get('engaged_at'):
                try:
                    dt = datetime.fromisoformat(str(p['engaged_at']).replace('Z', '+00:00'))
                    if dt > now - timedelta(days=90):
                        date_key = dt.strftime("%Y-%m-%d")
                        heatmap[date_key] = heatmap.get(date_key, 0) + 1
                except:
                    pass
        
        return EngagementAnalytics(
            total_influencers=total_influencers,
            engagements_this_week=len(week_engaged),
            engagements_this_month=len(month_engaged),
            current_streak_days=current_streak,
            longest_streak_days=current_streak,  # Simplified for now
            avg_response_time_hours=0,  # Would need more data to calculate
            top_engaged_influencers=top_engaged,
            cold_influencers=cold_influencers[:10],
            heatmap_data=heatmap
        )
    
    return router
