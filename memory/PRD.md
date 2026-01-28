# LinkedIn Authority Engine - Product Requirements Document

## Original Problem Statement
Build a LinkedIn Authority Engine - an agentic AI-powered content creation platform to help professionals create high-quality, authority-building LinkedIn content that drives B2B leads and professional growth.

## Architecture
- **Frontend:** React 19 (CRA) with Tailwind CSS, shadcn/ui components
- **Backend:** FastAPI (Python) with async/await
- **Database:** MongoDB with Motor async driver
- **Authentication:** Clerk (React SDK + JWT verification)
- **AI Integration:** Claude Sonnet 4.5 via Emergent Universal Key

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
8. LinkedIn publishing integration

## What's Been Implemented

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
- ✅ LinkedIn OAuth integration
- ✅ Engagement timer (30-min window)
- ✅ AI content generation

## Prioritized Backlog

### P0 - Critical (Next)
- [ ] Team/organization workspace sharing (Phase 2 of multi-user)
- [ ] Role-based access control (admin, editor, viewer)

### P1 - High Priority
- [ ] LinkedIn post analytics sync
- [ ] Content calendar drag-and-drop
- [ ] Batch content scheduling
- [ ] Export/import voice profiles

### P2 - Medium Priority
- [ ] A/B hook testing
- [ ] Competitor content analysis
- [ ] Content performance predictions
- [ ] Browser extension for content capture

## Next Tasks
1. Test full authentication flow with real user sign-up
2. Verify workspace isolation works correctly
3. Add team/organization features (Phase 2)
4. Implement role-based permissions

## Environment Variables Required
- `REACT_APP_CLERK_PUBLISHABLE_KEY` - Clerk frontend key
- `CLERK_SECRET_KEY` - Clerk backend key
- `EMERGENT_LLM_KEY` - AI integration key
- `MONGO_URL` - MongoDB connection string
