# LinkedIn Authority Engine - PRD

## Original Problem Statement
Build a Stripe subscription system for the LinkedIn Authority Engine with:
- Freemium model (Free, Basic, Premium tiers)
- Multi-currency support (AUD, USD, EUR, GBP)
- Usage tracking and feature gates
- Stripe Checkout integration
- 48-hour grace period for failed payments

## Architecture

### Backend (FastAPI + MongoDB)
- `subscription.py` - Data models, usage limits, feature access configuration
- `stripe_service.py` - Stripe integration using emergentintegrations
- `server.py` - API endpoints for subscription management

### Frontend (React)
- `/pages/Pricing.jsx` - Pricing page with tier comparison
- `/hooks/useSubscription.js` - Global subscription state management
- `/components/subscription/` - Reusable subscription UI components

## User Personas
1. **Free Users** - Getting started, limited usage (5 posts/month, 3 AI generations)
2. **Basic Users ($29 AUD/mo)** - Active creators needing more capacity and LinkedIn integration
3. **Premium Users ($79 AUD/mo)** - Power users with unlimited access and priority support

## Core Requirements
- [x] Three-tier pricing structure
- [x] Multi-currency support (AUD default)
- [x] Monthly and annual billing (17% discount)
- [x] Usage tracking per feature
- [x] Feature gating by tier
- [x] Grace period handling
- [x] Stripe Checkout integration
- [x] Webhook handling

## What's Been Implemented (2026-01-28)

### Backend APIs
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/pricing` | GET | No | Get pricing for all tiers |
| `/api/subscription` | GET | Yes | Get current subscription |
| `/api/subscription/usage` | GET | Yes | Get usage metrics |
| `/api/subscription/checkout` | POST | Yes | Create Stripe checkout |
| `/api/subscription/cancel` | POST | Yes | Cancel subscription |
| `/api/subscription/reactivate` | POST | Yes | Reactivate subscription |
| `/api/webhook/stripe` | POST | No | Handle Stripe webhooks |

### Frontend Components
- `PricingCard` - Tier display with features
- `CurrencySelector` - Multi-currency toggle
- `UsageBar` - Progress bar for limits
- `UsageDashboard` - Full usage overview
- `FeatureGate` - Conditional rendering by feature
- `UpgradePrompt` - Upgrade CTAs
- `GracePeriodBanner` - Payment failure warning

### Pricing Structure
| Feature | Free | Basic | Premium |
|---------|------|-------|---------|
| Posts/month | 5 | 30 | Unlimited |
| AI generations | 3 | 20 | Unlimited |
| Knowledge items | 10 | 50 | Unlimited |
| Voice profiles | 1 | 3 | Unlimited |
| LinkedIn integration | No | Yes | Yes |
| Comment drafting | No | 10/mo | Unlimited |
| Export reports | No | No | Yes |

## Prioritized Backlog

### P0 - Critical
- [x] Stripe Checkout integration
- [x] Subscription status tracking
- [x] Usage limit enforcement

### P1 - High Priority
- [ ] Stripe Customer Portal integration for payment method updates
- [ ] Email notifications for subscription events
- [ ] Admin dashboard for subscription management

### P2 - Medium Priority
- [ ] Coupon/promo code support
- [ ] Team/organization subscriptions
- [ ] Usage analytics dashboard

## Next Tasks
1. Add Stripe Customer Portal for self-service billing management
2. Implement email notifications (payment confirmation, renewal reminder)
3. Add subscription analytics for admin
4. Apply feature gates throughout the app (content creation, vault, etc.)
5. Add real Clerk production keys for full auth flow testing
