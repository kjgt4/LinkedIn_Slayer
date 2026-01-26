# LinkedIn Authority Engine - Product Requirements Document

## Original Problem Statement
Build a web app based on the LinkedIn Authority Engine PRD - an AI-powered content creation platform for LinkedIn professionals. The app helps create high-quality, authority-building LinkedIn content using SLAY and PAS frameworks.

## User Personas
- **B2B Professionals**: Entrepreneurs, consultants, thought leaders building LinkedIn presence
- **Content Creators**: Marketers seeking consistent, high-quality LinkedIn posts
- **Business Owners**: Using LinkedIn for lead generation and brand building

## Core Requirements
1. **AI Content Generation**: Claude Sonnet 4.5 (default) with multi-provider support (OpenAI, Gemini)
2. **SLAY Framework**: Story → Lesson → Advice → You (narrative posts)
3. **PAS Framework**: Problem → Agitate → Solution (problem-solving posts)
4. **Hook Validator**: 8-word rule enforcement with real-time validation
5. **Content Calendar**: 4-3-2-1 strategy (4 posts/week, 3 pillars, 2 frameworks, 1 CTA)
6. **Mobile Preview**: Real-time LinkedIn post preview

## What's Been Implemented

### Phase 1 - MVP (January 26, 2026)
- ✅ User Settings with AI provider/model configuration
- ✅ Posts CRUD with framework sections, pillars
- ✅ Calendar week view with pillar balance tracking
- ✅ AI content generation (Claude/OpenAI/Gemini via Emergent Key)
- ✅ Topic suggestions with Knowledge Vault integration
- ✅ Hook validator with 8-word rule, score 0-100
- ✅ Mobile phone mockup preview
- ✅ Copy-to-clipboard publishing
- ✅ Dark obsidian theme with professional UI

### Phase 2 - Enhanced Features (January 26, 2026)
- ✅ **Post Scheduling**: Schedule posts to calendar slots (Morning/Midday/Afternoon/Evening)
- ✅ **30-Minute Engagement Timer**: Browser notifications when posts need engagement
- ✅ **Knowledge Vault**: Store expertise for AI-powered content
  - Text notes, SOPs, transcripts
  - URL content import
  - PDF/file uploads
  - AI gem extraction (identifies monetizable expertise)
  - Tag organization
- ✅ **Performance Analytics Dashboard**
  - Total posts and published count
  - Pillar performance (Growth/TAM/Sales with engagement metrics)
  - Framework performance (SLAY/PAS comparison)
  - Weekly engagement trend chart
  - AI Strategy Recommendations
  - Top performing posts ranking

## Technical Architecture
- **Frontend**: React 19, Tailwind CSS, shadcn/ui, React Router
- **Backend**: FastAPI, Motor (async MongoDB), emergentintegrations
- **Database**: MongoDB
- **AI**: Claude Sonnet 4.5 via Emergent Universal Key

## API Endpoints
### Content
- `POST /api/posts` - Create post
- `GET /api/posts` - List posts
- `PUT /api/posts/{id}` - Update post
- `DELETE /api/posts/{id}` - Delete post
- `POST /api/posts/{id}/schedule` - Schedule post
- `POST /api/posts/{id}/publish` - Publish post (starts engagement timer)

### Knowledge Vault
- `GET /api/knowledge` - List knowledge items
- `POST /api/knowledge` - Create item
- `POST /api/knowledge/upload` - Upload file
- `POST /api/knowledge/url` - Import from URL
- `POST /api/knowledge/{id}/extract-gems` - AI gem extraction

### Analytics
- `GET /api/analytics/performance` - Get performance metrics
- `GET /api/analytics/pillar-recommendation` - Get AI strategy recommendation

### AI
- `POST /api/ai/generate-content` - Generate post content
- `POST /api/ai/suggest-topics` - Get topic suggestions
- `POST /api/ai/improve-hook` - Improve hook with AI

## Prioritized Backlog

### P0 (Critical) - COMPLETED
- All MVP features ✅
- Post scheduling ✅
- Engagement timer ✅
- Knowledge Vault ✅
- Analytics dashboard ✅

### P1 (High Priority - Future)
- LinkedIn API integration for direct publishing
- Voice Profile Engine (tone matching)
- Multiple user accounts/workspaces

### P2 (Medium Priority)
- Strategic Arbitrage (trend monitoring)
- Authority jacking suggestions
- Hook library with historical performance

### P3 (Future)
- AI-suggested comment replies
- A/B testing for hooks
- Team collaboration features

## Next Tasks
1. LinkedIn API integration for 1-click publishing
2. Voice profile matching in AI generation
3. Export content calendar to other tools
4. Mobile app companion
