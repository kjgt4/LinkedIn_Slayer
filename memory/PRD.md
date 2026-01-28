# LinkedIn Authority Engine - Product Requirements Document

## Original Problem Statement
Build a LinkedIn Authority Engine - an agentic AI-powered content creation platform to help professionals create high-quality, authority-building LinkedIn content that drives B2B leads and professional growth. App should use SLAY and PAS frameworks from the provided playbooks.

## Architecture
- **Frontend:** React 19 (CRA) with Tailwind CSS, shadcn/ui components
- **Backend:** FastAPI (Python) with async/await
- **Database:** MongoDB with Motor async driver
- **Authentication:** Clerk (React SDK + JWT verification)
- **AI Integration:** Claude Sonnet 4.5 via Emergent Universal Key (production: user-provided keys)

## User Personas
1. **Content Creators** - Professionals building personal brands on LinkedIn
2. **B2B Marketers** - Teams creating authority content for lead generation
3. **Consultants/Coaches** - Experts monetizing their expertise through content

## Core Requirements (Static)
1. SLAY & PAS content frameworks
2. 4-3-2-1 content calendar strategy
3. Voice profile engine for authentic content
4. Knowledge vault for expertise mining
5. Hook validation (8-word rule)
6. Mobile preview for LinkedIn rendering
7. Performance analytics
8. LinkedIn publishing integration (copy-to-clipboard for MVP)
9. Strategic Engagement Hub for influencer tracking

## What's Been Implemented

### January 28, 2025 - Cloudflare Deployment Preparation
- ✅ Created `/cloudflare/README.md` with deployment guide
- ✅ Created `/cloudflare/wrangler.toml` for Pages config
- ✅ Added `/_redirects` for SPA client-side routing
- ✅ Added `/public/_headers` for security headers
- ✅ Verified all APIs work correctly
- ✅ Confirmed Clerk auth flow working

### January 28, 2025 - Strategic Engagement Hub
- ✅ Influencer Roster page (`/influencers`) with CRUD operations
- ✅ Card grid with filtering by priority, status, themes
- ✅ Add/Edit Influencer dialog with all fields
- ✅ Discovery Assistant with AI-generated search strategies
- ✅ Engagement Queue page (`/engagement`)
- ✅ Post tracking with status management (new, draft_ready, engaged, skipped)
- ✅ AI Comment Drafting with 3 variations (experience, insight, question)
- ✅ Engagement goal selection (visibility, relationship, thought_leadership)
- ✅ Copy to clipboard + open LinkedIn integration
- ✅ Mark Engaged functionality with engagement type tracking
- ✅ Engagement Analytics endpoint with metrics
- ✅ Backend routes in `engagement_hub.py` with full auth

### January 28, 2025 - Clerk Authentication & Multi-User Workspace
- ✅ Clerk React SDK integration (@clerk/clerk-react)
- ✅ JWT token verification in FastAPI backend
- ✅ Multi-user workspace isolation (all data filtered by user_id)
- ✅ Protected routes with SignedIn/SignedOut components
- ✅ User sync endpoint (/api/auth/sync)
- ✅ Social login support (Google, LinkedIn, GitHub)
- ✅ UserButton component in sidebar
- ✅ AuthContext for token management

### Previously Implemented (MVP)
- ✅ Dashboard with weekly calendar
- ✅ Content editor with SLAY/PAS frameworks
- ✅ Hook validator with 8-word rule
- ✅ Mobile preview component
- ✅ Knowledge vault with file upload
- ✅ Voice profile engine with AI analysis
- ✅ Topic suggestions with inspiration URLs
- ✅ Performance analytics dashboard
- ✅ LinkedIn OAuth integration (user-provided API credentials)
- ✅ Engagement timer (30-min window)
- ✅ AI content generation
- ✅ Copy-to-clipboard for LinkedIn publishing

## Deployment Configuration

### Cloudflare Pages (Frontend)
- Build command: `cd frontend && yarn install && yarn build`
- Build output: `frontend/build`
- SPA routing via `_redirects` file

### Backend (External Service)
Recommended: Render.com, Railway, or Fly.io for Python FastAPI

### Environment Variables
**Frontend:**
- `REACT_APP_BACKEND_URL`
- `REACT_APP_CLERK_PUBLISHABLE_KEY`

**Backend:**
- `MONGO_URL`
- `DB_NAME`
- `CLERK_SECRET_KEY`
- `EMERGENT_LLM_KEY` (optional - users can provide own keys)
- `CORS_ORIGINS`

## Prioritized Backlog

### P0 - Critical (Next)
- [ ] Engagement Reminders & Notifications system
- [ ] Browser notifications for engagement reminders
- [ ] Production Clerk keys setup

### P1 - High Priority
- [ ] Team/organization workspace sharing
- [ ] Role-based access control (admin, editor, viewer)
- [ ] LinkedIn post analytics sync
- [ ] Content calendar drag-and-drop

### P2 - Medium Priority
- [ ] Bulk import influencers (CSV)
- [ ] A/B hook testing
- [ ] Competitor content analysis
- [ ] Browser extension for post capture

## Tech Stack Summary
| Layer | Technology |
|-------|------------|
| Frontend | React 19, Tailwind CSS, shadcn/ui |
| Backend | FastAPI (Python), Motor (async MongoDB) |
| Database | MongoDB |
| Auth | Clerk (JWT) |
| AI | Claude Sonnet 4.5 (or user-provided) |
| Hosting | Cloudflare Pages (FE) + External (BE) |

## GitHub Repository
https://github.com/kjgt4/LinkedIn_Slayer.git
