"""
Stripe Service Module
Handles Stripe integration for subscriptions and billing
"""
import os
import logging
from datetime import datetime, timezone
from typing import Optional, Tuple
from fastapi import HTTPException
from emergentintegrations.payments.stripe.checkout import (
    StripeCheckout, 
    CheckoutSessionRequest, 
    CheckoutSessionResponse,
    CheckoutStatusResponse
)
from subscription import (
    CURRENCY_CONFIG, 
    DEFAULT_CURRENCY,
    GRACE_PERIOD_HOURS,
    calculate_grace_period_end
)

logger = logging.getLogger(__name__)

# ============== Price ID Management ==============

def get_price_id(tier: str, billing_cycle: str, currency: str) -> str:
    """
    Generate a price identifier string.
    In production, these would be actual Stripe Price IDs from the dashboard.
    For now, we use a naming convention that can be mapped to env vars.
    """
    # Format: STRIPE_PRICE_{TIER}_{CYCLE}_{CURRENCY}
    # e.g., STRIPE_PRICE_BASIC_MONTHLY_AUD
    env_key = f"STRIPE_PRICE_{tier.upper()}_{billing_cycle.upper()}_{currency.upper()}"
    price_id = os.environ.get(env_key)
    
    if price_id:
        return price_id
    
    # Return a formatted identifier for dynamic pricing
    return f"price_{tier}_{billing_cycle}_{currency}"

def get_tier_from_price_id(price_id: str) -> Tuple[str, str, str]:
    """
    Extract tier, billing_cycle, and currency from price ID.
    Returns (tier, billing_cycle, currency)
    """
    # Check environment variables first
    for tier in ["basic", "premium"]:
        for cycle in ["monthly", "annual"]:
            for currency in CURRENCY_CONFIG.keys():
                env_key = f"STRIPE_PRICE_{tier.upper()}_{cycle.upper()}_{currency.upper()}"
                if os.environ.get(env_key) == price_id:
                    return (tier, cycle, currency)
    
    # Parse from formatted identifier
    if price_id.startswith("price_"):
        parts = price_id.split("_")
        if len(parts) >= 4:
            return (parts[1], parts[2], parts[3])
    
    return ("free", "monthly", DEFAULT_CURRENCY)

# ============== Stripe Service Class ==============

class SubscriptionStripeService:
    """Service class for Stripe subscription operations"""
    
    def __init__(self, api_key: str, webhook_url: str):
        self.api_key = api_key
        self.webhook_url = webhook_url
        self.checkout = StripeCheckout(api_key=api_key, webhook_url=webhook_url)
    
    async def create_checkout_session(
        self,
        tier: str,
        billing_cycle: str,
        currency: str,
        success_url: str,
        cancel_url: str,
        user_id: str,
        customer_email: Optional[str] = None
    ) -> CheckoutSessionResponse:
        """
        Create a Stripe checkout session for subscription.
        Uses dynamic pricing based on tier, billing cycle, and currency.
        """
        # Get price amount from config
        config = CURRENCY_CONFIG.get(currency, CURRENCY_CONFIG[DEFAULT_CURRENCY])
        prices = config["prices"]
        price_key = f"{tier}_{billing_cycle}"
        amount_cents = prices.get(price_key, 0)
        
        if amount_cents == 0:
            raise HTTPException(status_code=400, detail="Invalid tier or billing cycle")
        
        # Convert cents to currency units (float)
        amount = amount_cents / 100.0
        
        # Create metadata for tracking
        metadata = {
            "user_id": user_id,
            "tier": tier,
            "billing_cycle": billing_cycle,
            "currency": currency,
            "subscription_type": "new"
        }
        if customer_email:
            metadata["customer_email"] = customer_email
        
        # Create checkout session request
        checkout_request = CheckoutSessionRequest(
            amount=amount,
            currency=currency,
            success_url=success_url,
            cancel_url=cancel_url,
            metadata=metadata
        )
        
        try:
            session = await self.checkout.create_checkout_session(checkout_request)
            return session
        except Exception as e:
            logger.error(f"Failed to create checkout session: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to create checkout session: {str(e)}")
    
    async def get_checkout_status(self, session_id: str) -> CheckoutStatusResponse:
        """Get status of a checkout session"""
        try:
            status = await self.checkout.get_checkout_status(session_id)
            return status
        except Exception as e:
            logger.error(f"Failed to get checkout status: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to get checkout status: {str(e)}")
    
    async def handle_webhook(self, body: bytes, signature: str):
        """Handle Stripe webhook events"""
        try:
            webhook_response = await self.checkout.handle_webhook(body, signature)
            return webhook_response
        except Exception as e:
            logger.error(f"Webhook handling failed: {str(e)}")
            raise HTTPException(status_code=400, detail=f"Webhook handling failed: {str(e)}")

    async def cancel_subscription(self, subscription_id: str) -> bool:
        """
        Cancel a subscription at period end via Stripe API.
        Returns True if successful.
        """
        import stripe
        stripe.api_key = self.api_key

        try:
            stripe.Subscription.modify(
                subscription_id,
                cancel_at_period_end=True
            )
            logger.info(f"Subscription {subscription_id} marked for cancellation at period end")
            return True
        except stripe.error.StripeError as e:
            logger.error(f"Failed to cancel subscription {subscription_id}: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to cancel subscription: {str(e)}")

    async def reactivate_subscription(self, subscription_id: str) -> bool:
        """
        Reactivate a cancelled subscription via Stripe API.
        Returns True if successful.
        """
        import stripe
        stripe.api_key = self.api_key

        try:
            stripe.Subscription.modify(
                subscription_id,
                cancel_at_period_end=False
            )
            logger.info(f"Subscription {subscription_id} reactivated")
            return True
        except stripe.error.StripeError as e:
            logger.error(f"Failed to reactivate subscription {subscription_id}: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to reactivate subscription: {str(e)}")

# ============== Subscription Update Helpers ==============

def get_subscription_update_from_checkout(
    checkout_status: CheckoutStatusResponse,
    metadata: dict
) -> dict:
    """
    Generate subscription update data from successful checkout.
    Stores Stripe IDs for future subscription management.
    """
    tier = metadata.get("tier", "basic")
    billing_cycle = metadata.get("billing_cycle", "monthly")
    currency = metadata.get("currency", DEFAULT_CURRENCY)

    now = datetime.now(timezone.utc)

    # Calculate period end based on billing cycle
    if billing_cycle == "annual":
        from datetime import timedelta
        period_end = now + timedelta(days=365)
    else:
        from datetime import timedelta
        period_end = now + timedelta(days=30)

    # Extract Stripe IDs from checkout status for subscription management
    stripe_subscription_id = getattr(checkout_status, 'subscription', None)
    stripe_customer_id = getattr(checkout_status, 'customer', None)

    return {
        "subscription.tier": tier,
        "subscription.status": "active",
        "subscription.billing_cycle": billing_cycle,
        "subscription.currency": currency,
        "subscription.current_period_start": now.isoformat(),
        "subscription.current_period_end": period_end.isoformat(),
        "subscription.cancelled_at": None,
        "subscription.cancel_at_period_end": False,
        "subscription.payment_failed_at": None,
        "subscription.grace_period_ends": None,
        "subscription.stripe_subscription_id": stripe_subscription_id,
        "subscription.stripe_customer_id": stripe_customer_id,
    }

def get_subscription_cancellation_update() -> dict:
    """Get update data for subscription cancellation"""
    now = datetime.now(timezone.utc)
    return {
        "subscription.cancel_at_period_end": True,
        "subscription.cancelled_at": now.isoformat(),
    }

def get_subscription_reactivation_update() -> dict:
    """Get update data for subscription reactivation"""
    return {
        "subscription.cancel_at_period_end": False,
        "subscription.cancelled_at": None,
    }

def get_payment_failed_update() -> dict:
    """Get update data for failed payment"""
    now = datetime.now(timezone.utc)
    return {
        "subscription.status": "past_due",
        "subscription.payment_failed_at": now.isoformat(),
        "subscription.grace_period_ends": calculate_grace_period_end(now),
    }

def get_payment_succeeded_update(billing_cycle: str) -> dict:
    """Get update data for successful payment"""
    now = datetime.now(timezone.utc)
    
    # Calculate new period end
    if billing_cycle == "annual":
        from datetime import timedelta
        period_end = now + timedelta(days=365)
    else:
        from datetime import timedelta
        period_end = now + timedelta(days=30)
    
    return {
        "subscription.status": "active",
        "subscription.payment_failed_at": None,
        "subscription.grace_period_ends": None,
        "subscription.current_period_start": now.isoformat(),
        "subscription.current_period_end": period_end.isoformat(),
    }

def get_subscription_expired_update() -> dict:
    """Get update data for expired subscription (downgrade to free)"""
    return {
        "subscription.tier": "free",
        "subscription.status": "expired",
        "subscription.billing_cycle": None,
        "subscription.stripe_subscription_id": None,
        "subscription.stripe_price_id": None,
        "subscription.current_period_start": None,
        "subscription.current_period_end": None,
        "subscription.cancelled_at": None,
        "subscription.cancel_at_period_end": False,
        "subscription.payment_failed_at": None,
        "subscription.grace_period_ends": None,
    }
