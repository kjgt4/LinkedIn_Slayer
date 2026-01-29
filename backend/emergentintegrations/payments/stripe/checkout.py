"""
Stripe Checkout wrapper.
Replaces emergentintegrations.payments.stripe.checkout interface.
"""
from dataclasses import dataclass, field
from typing import Optional, Dict, Any
import stripe
import logging

logger = logging.getLogger(__name__)


@dataclass
class CheckoutSessionRequest:
    """Request to create a checkout session"""
    amount: float
    currency: str
    success_url: str
    cancel_url: str
    metadata: Dict[str, str] = field(default_factory=dict)


@dataclass
class CheckoutSessionResponse:
    """Response from creating a checkout session"""
    session_id: str
    checkout_url: str


@dataclass
class CheckoutStatusResponse:
    """Response from getting checkout session status"""
    session_id: str
    payment_status: str  # 'unpaid', 'paid', 'no_payment_required'
    status: str  # 'open', 'complete', 'expired'
    customer: Optional[str] = None
    subscription: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


class StripeCheckout:
    """
    Stripe Checkout session manager.

    Handles creation of checkout sessions for one-time and subscription payments.
    """

    def __init__(self, api_key: str, webhook_url: Optional[str] = None):
        self.api_key = api_key
        self.webhook_url = webhook_url
        stripe.api_key = api_key

    async def create_checkout_session(
        self,
        request: CheckoutSessionRequest
    ) -> CheckoutSessionResponse:
        """
        Create a Stripe checkout session for subscription.

        Args:
            request: CheckoutSessionRequest with amount, currency, URLs, metadata

        Returns:
            CheckoutSessionResponse with session_id and checkout_url
        """
        try:
            # Convert amount to cents (Stripe uses smallest currency unit)
            amount_cents = int(request.amount * 100)

            # Get tier and billing info from metadata
            tier = request.metadata.get('tier', 'basic')
            billing_cycle = request.metadata.get('billing_cycle', 'monthly')

            # Create price data for subscription
            recurring_interval = 'year' if billing_cycle == 'annual' else 'month'

            session = stripe.checkout.Session.create(
                mode='subscription',
                payment_method_types=['card'],
                line_items=[{
                    'price_data': {
                        'currency': request.currency,
                        'unit_amount': amount_cents,
                        'recurring': {
                            'interval': recurring_interval,
                        },
                        'product_data': {
                            'name': f'LinkedIn Slayer {tier.title()} Plan',
                            'description': f'{billing_cycle.title()} subscription',
                        },
                    },
                    'quantity': 1,
                }],
                success_url=request.success_url,
                cancel_url=request.cancel_url,
                metadata=request.metadata,
                subscription_data={
                    'metadata': request.metadata,
                },
            )

            return CheckoutSessionResponse(
                session_id=session.id,
                checkout_url=session.url
            )

        except stripe.error.StripeError as e:
            logger.error(f"Stripe checkout creation failed: {str(e)}")
            raise Exception(f"Failed to create checkout session: {str(e)}")

    async def get_checkout_status(self, session_id: str) -> CheckoutStatusResponse:
        """
        Get the status of a checkout session.

        Args:
            session_id: The Stripe session ID

        Returns:
            CheckoutStatusResponse with payment status and details
        """
        try:
            session = stripe.checkout.Session.retrieve(
                session_id,
                expand=['subscription', 'customer']
            )

            return CheckoutStatusResponse(
                session_id=session.id,
                payment_status=session.payment_status,
                status=session.status,
                customer=session.customer.id if session.customer else None,
                subscription=session.subscription.id if session.subscription else None,
                metadata=dict(session.metadata) if session.metadata else {}
            )

        except stripe.error.StripeError as e:
            logger.error(f"Failed to get checkout status: {str(e)}")
            raise Exception(f"Failed to get checkout status: {str(e)}")

    async def handle_webhook(self, body: bytes, signature: str) -> Dict[str, Any]:
        """
        Handle Stripe webhook events.

        Args:
            body: Raw request body
            signature: Stripe signature header

        Returns:
            Dict with event type and data
        """
        webhook_secret = None  # Set from environment if needed

        try:
            if webhook_secret:
                event = stripe.Webhook.construct_event(
                    body, signature, webhook_secret
                )
            else:
                # Parse without signature verification (for development)
                import json
                event = stripe.Event.construct_from(
                    json.loads(body), stripe.api_key
                )

            return {
                'type': event.type,
                'data': event.data.object,
            }

        except ValueError as e:
            logger.error(f"Invalid webhook payload: {str(e)}")
            raise Exception(f"Invalid payload: {str(e)}")
        except stripe.error.SignatureVerificationError as e:
            logger.error(f"Invalid webhook signature: {str(e)}")
            raise Exception(f"Invalid signature: {str(e)}")
