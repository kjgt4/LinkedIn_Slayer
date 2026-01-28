"""
Subscription and Usage Management Module
Implements freemium model with Free, Basic, Premium tiers
"""
from pydantic import BaseModel, Field
from typing import Optional, Literal, Dict, Any
from datetime import datetime, timezone, timedelta
from enum import Enum

# ============== Constants ==============

GRACE_PERIOD_HOURS = 48
DEFAULT_CURRENCY = "aud"

# ============== Enums ==============

class SubscriptionTier(str, Enum):
    FREE = "free"
    BASIC = "basic"
    PREMIUM = "premium"

class SubscriptionStatus(str, Enum):
    ACTIVE = "active"
    PAST_DUE = "past_due"
    CANCELLED = "cancelled"
    EXPIRED = "expired"

class BillingCycle(str, Enum):
    MONTHLY = "monthly"
    ANNUAL = "annual"

# ============== Usage Limits Configuration ==============

USAGE_LIMITS = {
    "free": {
        "posts_per_month": 5,
        "ai_generations_per_month": 3,
        "ai_hook_improvements_per_month": 3,
        "active_scheduled_posts": 2,
        "knowledge_items": 10,
        "url_imports_per_month": 3,
        "gem_extractions_per_month": 2,
        "voice_profiles": 1,
        "voice_analyses_per_month": 1,
        "url_history": 5,
        "tracked_influencers": 3,
        "tracked_posts": 5,
        "comment_drafts_per_month": 0,
        "topic_suggestions_per_week": 3,
    },
    "basic": {
        "posts_per_month": 30,
        "ai_generations_per_month": 20,
        "ai_hook_improvements_per_month": 15,
        "active_scheduled_posts": 10,
        "knowledge_items": 50,
        "url_imports_per_month": 20,
        "gem_extractions_per_month": 10,
        "voice_profiles": 3,
        "voice_analyses_per_month": 5,
        "url_history": 25,
        "tracked_influencers": 15,
        "tracked_posts": 25,
        "comment_drafts_per_month": 10,
        "topic_suggestions_per_week": -1,  # -1 = unlimited
    },
    "premium": {
        "posts_per_month": -1,
        "ai_generations_per_month": -1,
        "ai_hook_improvements_per_month": -1,
        "active_scheduled_posts": -1,
        "knowledge_items": -1,
        "url_imports_per_month": -1,
        "gem_extractions_per_month": -1,
        "voice_profiles": -1,
        "voice_analyses_per_month": -1,
        "url_history": -1,
        "tracked_influencers": -1,
        "tracked_posts": -1,
        "comment_drafts_per_month": -1,
        "topic_suggestions_per_week": -1,
    }
}

# ============== Feature Access Configuration ==============

FEATURE_ACCESS = {
    "free": {
        "framework_editor": False,
        "file_upload": False,
        "knowledge_informed_ai": False,
        "voice_matched_generation": False,
        "favorite_urls": False,
        "save_url_to_vault": False,
        "linkedin_connection": False,
        "direct_publish": False,
        "engagement_timer": False,
        "browser_notifications": False,
        "comment_drafting": False,
        "comment_variations": False,
        "discovery_assistant": False,
        "engagement_reminders": False,
        "engagement_analytics": "basic",
        "analytics_by_pillar": False,
        "analytics_by_framework": False,
        "analytics_trends": False,
        "analytics_top_posts": False,
        "ai_strategy_recommendations": False,
        "engagement_heatmap": False,
        "export_reports": False,
        "email_support": False,
        "priority_support": False,
        "data_export": False,
        "api_access": False,
    },
    "basic": {
        "framework_editor": True,
        "file_upload": True,
        "knowledge_informed_ai": True,
        "voice_matched_generation": True,
        "favorite_urls": True,
        "save_url_to_vault": True,
        "linkedin_connection": True,
        "direct_publish": True,
        "engagement_timer": True,
        "browser_notifications": True,
        "comment_drafting": True,
        "comment_variations": False,
        "discovery_assistant": True,
        "engagement_reminders": False,
        "engagement_analytics": "basic",
        "analytics_by_pillar": True,
        "analytics_by_framework": True,
        "analytics_trends": True,
        "analytics_top_posts": True,
        "ai_strategy_recommendations": False,
        "engagement_heatmap": False,
        "export_reports": False,
        "email_support": True,
        "priority_support": False,
        "data_export": False,
        "api_access": False,
    },
    "premium": {
        "framework_editor": True,
        "file_upload": True,
        "knowledge_informed_ai": True,
        "voice_matched_generation": True,
        "favorite_urls": True,
        "save_url_to_vault": True,
        "linkedin_connection": True,
        "direct_publish": True,
        "engagement_timer": True,
        "browser_notifications": True,
        "comment_drafting": True,
        "comment_variations": True,
        "discovery_assistant": True,
        "engagement_reminders": True,
        "engagement_analytics": "full",
        "analytics_by_pillar": True,
        "analytics_by_framework": True,
        "analytics_trends": True,
        "analytics_top_posts": True,
        "ai_strategy_recommendations": True,
        "engagement_heatmap": True,
        "export_reports": True,
        "email_support": True,
        "priority_support": True,
        "data_export": True,
        "api_access": True,
    }
}

# ============== Currency Configuration ==============

CURRENCY_CONFIG = {
    "aud": {
        "code": "aud",
        "symbol": "$",
        "symbol_position": "before",
        "name": "Australian Dollar",
        "flag": "🇦🇺",
        "default": True,
        "prices": {
            "basic_monthly": 2900,  # cents
            "basic_annual": 29000,
            "premium_monthly": 7900,
            "premium_annual": 79000,
        }
    },
    "usd": {
        "code": "usd",
        "symbol": "$",
        "symbol_position": "before",
        "name": "US Dollar",
        "flag": "🇺🇸",
        "default": False,
        "prices": {
            "basic_monthly": 1900,
            "basic_annual": 19000,
            "premium_monthly": 4900,
            "premium_annual": 49000,
        }
    },
    "eur": {
        "code": "eur",
        "symbol": "€",
        "symbol_position": "before",
        "name": "Euro",
        "flag": "🇪🇺",
        "default": False,
        "prices": {
            "basic_monthly": 1900,
            "basic_annual": 19000,
            "premium_monthly": 4900,
            "premium_annual": 49000,
        }
    },
    "gbp": {
        "code": "gbp",
        "symbol": "£",
        "symbol_position": "before",
        "name": "British Pound",
        "flag": "🇬🇧",
        "default": False,
        "prices": {
            "basic_monthly": 1500,
            "basic_annual": 15000,
            "premium_monthly": 3900,
            "premium_annual": 39000,
        }
    }
}

# ============== Pydantic Models ==============

class SubscriptionData(BaseModel):
    """Subscription data embedded in UserSettings"""
    tier: SubscriptionTier = SubscriptionTier.FREE
    status: SubscriptionStatus = SubscriptionStatus.ACTIVE
    billing_cycle: Optional[BillingCycle] = None
    currency: str = DEFAULT_CURRENCY
    stripe_customer_id: Optional[str] = None
    stripe_subscription_id: Optional[str] = None
    stripe_price_id: Optional[str] = None
    current_period_start: Optional[str] = None
    current_period_end: Optional[str] = None
    cancelled_at: Optional[str] = None
    cancel_at_period_end: bool = False
    payment_failed_at: Optional[str] = None
    grace_period_ends: Optional[str] = None
    payment_method_last4: Optional[str] = None
    payment_method_brand: Optional[str] = None
    payment_method_exp: Optional[str] = None

class UsageData(BaseModel):
    """Usage tracking data embedded in UserSettings"""
    period_start: Optional[str] = None
    period_end: Optional[str] = None
    posts_created: int = 0
    ai_generations: int = 0
    ai_hook_improvements: int = 0
    url_imports: int = 0
    gem_extractions: int = 0
    voice_analyses: int = 0
    comment_drafts: int = 0
    topic_suggestions_week_start: Optional[str] = None
    topic_suggestions_count: int = 0
    lifetime_posts: int = 0
    lifetime_ai_generations: int = 0
    last_reset: Optional[str] = None

class SubscriptionResponse(BaseModel):
    """API response for subscription info"""
    tier: str
    status: str
    effective_tier: str
    billing_cycle: Optional[str] = None
    currency: str
    current_period_end: Optional[str] = None
    cancel_at_period_end: bool = False
    is_in_grace_period: bool = False
    grace_period_hours_remaining: int = 0
    payment_method_last4: Optional[str] = None
    payment_method_brand: Optional[str] = None

class UsageResponse(BaseModel):
    """API response for usage info"""
    posts_created: int
    posts_limit: int
    ai_generations: int
    ai_generations_limit: int
    ai_hook_improvements: int
    ai_hook_improvements_limit: int
    knowledge_items: int
    knowledge_items_limit: int
    voice_profiles: int
    voice_profiles_limit: int
    tracked_influencers: int
    tracked_influencers_limit: int
    tracked_posts: int
    tracked_posts_limit: int
    comment_drafts: int
    comment_drafts_limit: int
    period_resets_in_days: int
    tier: str

class CheckoutRequest(BaseModel):
    """Request to create checkout session"""
    tier: Literal["basic", "premium"]
    billing_cycle: Literal["monthly", "annual"]
    currency: Literal["aud", "usd", "eur", "gbp"] = "aud"

class PricingResponse(BaseModel):
    """API response for pricing info"""
    currency: str
    currency_symbol: str
    currency_name: str
    tiers: Dict[str, Any]

# ============== Utility Functions ==============

def get_default_subscription() -> dict:
    """Get default subscription data for new users"""
    return SubscriptionData().model_dump()

def get_default_usage() -> dict:
    """Get default usage data for new users"""
    now = datetime.now(timezone.utc)
    start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    if now.month == 12:
        end_of_month = start_of_month.replace(year=now.year + 1, month=1)
    else:
        end_of_month = start_of_month.replace(month=now.month + 1)
    
    usage = UsageData(
        period_start=start_of_month.isoformat(),
        period_end=end_of_month.isoformat(),
        topic_suggestions_week_start=now.isoformat(),
        last_reset=now.isoformat()
    )
    return usage.model_dump()

def get_usage_limit(tier: str, limit_name: str) -> int:
    """Get usage limit for a tier. Returns -1 for unlimited."""
    return USAGE_LIMITS.get(tier, USAGE_LIMITS["free"]).get(limit_name, 0)

def has_feature_access(tier: str, feature_name: str) -> bool:
    """Check if a tier has access to a feature"""
    access = FEATURE_ACCESS.get(tier, FEATURE_ACCESS["free"]).get(feature_name, False)
    return access is True or (isinstance(access, str) and access != "")

def get_effective_tier(subscription: dict) -> str:
    """Get effective tier considering grace period"""
    tier = subscription.get("tier", "free")
    status = subscription.get("status", "active")
    
    if tier == "free":
        return "free"
    
    if status == "active":
        return tier
    
    # Check grace period
    grace_period_ends = subscription.get("grace_period_ends")
    if grace_period_ends and status == "past_due":
        try:
            grace_end = datetime.fromisoformat(grace_period_ends.replace('Z', '+00:00'))
            if datetime.now(timezone.utc) < grace_end:
                return tier
        except (ValueError, TypeError):
            pass
    
    return "free"

def is_in_grace_period(subscription: dict) -> bool:
    """Check if user is in grace period"""
    if subscription.get("status") != "past_due":
        return False
    
    grace_period_ends = subscription.get("grace_period_ends")
    if not grace_period_ends:
        return False
    
    try:
        grace_end = datetime.fromisoformat(grace_period_ends.replace('Z', '+00:00'))
        return datetime.now(timezone.utc) < grace_end
    except (ValueError, TypeError):
        return False

def get_grace_period_hours_remaining(subscription: dict) -> int:
    """Get hours remaining in grace period"""
    if not is_in_grace_period(subscription):
        return 0
    
    grace_period_ends = subscription.get("grace_period_ends")
    if not grace_period_ends:
        return 0
    
    try:
        grace_end = datetime.fromisoformat(grace_period_ends.replace('Z', '+00:00'))
        remaining = grace_end - datetime.now(timezone.utc)
        return max(0, int(remaining.total_seconds() / 3600))
    except (ValueError, TypeError):
        return 0

def calculate_grace_period_end(from_time: datetime = None) -> str:
    """Calculate grace period end (48 hours from given time)"""
    if from_time is None:
        from_time = datetime.now(timezone.utc)
    grace_end = from_time + timedelta(hours=GRACE_PERIOD_HOURS)
    return grace_end.isoformat()

def should_reset_monthly_usage(usage: dict) -> bool:
    """Check if monthly usage should be reset"""
    period_end = usage.get("period_end")
    if not period_end:
        return True
    
    try:
        end_date = datetime.fromisoformat(period_end.replace('Z', '+00:00'))
        return datetime.now(timezone.utc) >= end_date
    except (ValueError, TypeError):
        return True

def should_reset_weekly_suggestions(usage: dict) -> bool:
    """Check if weekly topic suggestions should be reset"""
    week_start = usage.get("topic_suggestions_week_start")
    if not week_start:
        return True
    
    try:
        start_date = datetime.fromisoformat(week_start.replace('Z', '+00:00'))
        return (datetime.now(timezone.utc) - start_date).days >= 7
    except (ValueError, TypeError):
        return True

def get_reset_usage_data() -> dict:
    """Get reset usage data for new period"""
    now = datetime.now(timezone.utc)
    start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    if now.month == 12:
        end_of_month = start_of_month.replace(year=now.year + 1, month=1)
    else:
        end_of_month = start_of_month.replace(month=now.month + 1)
    
    return {
        "period_start": start_of_month.isoformat(),
        "period_end": end_of_month.isoformat(),
        "posts_created": 0,
        "ai_generations": 0,
        "ai_hook_improvements": 0,
        "url_imports": 0,
        "gem_extractions": 0,
        "voice_analyses": 0,
        "comment_drafts": 0,
        "last_reset": now.isoformat()
    }

def get_pricing_for_currency(currency: str) -> dict:
    """Get pricing info for a specific currency"""
    config = CURRENCY_CONFIG.get(currency, CURRENCY_CONFIG[DEFAULT_CURRENCY])
    prices = config["prices"]
    symbol = config["symbol"]
    
    return {
        "currency": config["code"],
        "currency_symbol": symbol,
        "currency_name": config["name"],
        "currency_flag": config["flag"],
        "tiers": {
            "free": {
                "name": "Free",
                "monthly_price": 0,
                "annual_price": 0,
                "monthly_display": f"{symbol}0",
                "annual_display": f"{symbol}0",
            },
            "basic": {
                "name": "Basic",
                "monthly_price": prices["basic_monthly"] / 100,
                "annual_price": prices["basic_annual"] / 100,
                "monthly_display": f"{symbol}{prices['basic_monthly'] / 100:.0f}/mo",
                "annual_display": f"{symbol}{prices['basic_annual'] / 100:.0f}/yr",
                "annual_monthly_equivalent": f"{symbol}{prices['basic_annual'] / 1200:.2f}/mo",
                "annual_savings": f"Save {symbol}{(prices['basic_monthly'] * 12 - prices['basic_annual']) / 100:.0f} (17%)",
            },
            "premium": {
                "name": "Premium",
                "monthly_price": prices["premium_monthly"] / 100,
                "annual_price": prices["premium_annual"] / 100,
                "monthly_display": f"{symbol}{prices['premium_monthly'] / 100:.0f}/mo",
                "annual_display": f"{symbol}{prices['premium_annual'] / 100:.0f}/yr",
                "annual_monthly_equivalent": f"{symbol}{prices['premium_annual'] / 1200:.2f}/mo",
                "annual_savings": f"Save {symbol}{(prices['premium_monthly'] * 12 - prices['premium_annual']) / 100:.0f} (17%)",
            }
        },
        "features": {
            "free": list(k for k, v in FEATURE_ACCESS["free"].items() if v),
            "basic": list(k for k, v in FEATURE_ACCESS["basic"].items() if v),
            "premium": list(k for k, v in FEATURE_ACCESS["premium"].items() if v),
        },
        "limits": USAGE_LIMITS
    }

def get_price_amount(tier: str, billing_cycle: str, currency: str) -> float:
    """Get price amount for checkout (in currency units, not cents)"""
    config = CURRENCY_CONFIG.get(currency, CURRENCY_CONFIG[DEFAULT_CURRENCY])
    prices = config["prices"]
    
    key = f"{tier}_{billing_cycle}"
    return prices.get(key, 0) / 100.0
