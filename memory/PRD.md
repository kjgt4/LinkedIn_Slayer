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

### Phase 3 - LinkedIn Integration & Voice Engine (January 26, 2026)
- ✅ **LinkedIn API Integration**
  - OAuth2 authentication flow
  - 1-click publish directly to LinkedIn
  - LinkedIn connection status in Settings
  - Publish to LinkedIn button in Editor
  - Tracks LinkedIn post ID and URL
  - *Note: Requires LinkedIn API credentials (LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET, LINKEDIN_REDIRECT_URI)*

- ✅ **Voice Profile Engine**
  - Create custom voice profiles
  - Define tone (professional/casual/authoritative/friendly/inspirational)
  - Vocabulary style (business/technical/conversational/academic/creative)
  - Sentence structure preferences
  - Personality traits
  - Signature expressions
  - Preferred/avoid phrases
  - Industry context and target audience
  - **AI Writing Analysis**: Paste 2-3 sample posts and AI extracts your unique voice
  - Active voice profile automatically applied to AI content generation

## Technical Architecture
- **Frontend**: React 19, Tailwind CSS, shadcn/ui, React Router
- **Backend**: FastAPI, Motor (async MongoDB), emergentintegrations
- **Database**: MongoDB
- **AI**: Claude Sonnet 4.5 via Emergent Universal Key

## API Endpoints (v3.0.0)

### Content
- `POST /api/posts` - Create post
- `GET /api/posts` - List posts
- `PUT /api/posts/{id}` - Update post
- `DELETE /api/posts/{id}` - Delete post
- `POST /api/posts/{id}/schedule` - Schedule post
- `POST /api/posts/{id}/publish` - Publish post (starts engagement timer)
- `POST /api/posts/{id}/unschedule` - Remove scheduling

### Knowledge Vault
- `GET /api/knowledge` - List knowledge items
- `POST /api/knowledge` - Create item
- `POST /api/knowledge/upload` - Upload file
- `POST /api/knowledge/url` - Import from URL
- `POST /api/knowledge/{id}/extract-gems` - AI gem extraction

### Analytics
- `GET /api/analytics/performance` - Get performance metrics
- `GET /api/analytics/pillar-recommendation` - Get AI strategy recommendation

### Voice Profiles
- `GET /api/voice-profiles` - List profiles
- `GET /api/voice-profiles/active` - Get active profile
- `POST /api/voice-profiles` - Create profile
- `PUT /api/voice-profiles/{id}` - Update profile
- `DELETE /api/voice-profiles/{id}` - Delete profile
- `POST /api/voice-profiles/{id}/activate` - Set as active
- `POST /api/voice-profiles/analyze-samples` - AI analyzes writing samples

### LinkedIn Integration
- `GET /api/linkedin/auth` - Get OAuth authorization URL
- `GET /api/linkedin/callback` - Handle OAuth callback
- `POST /api/linkedin/disconnect` - Disconnect account
- `POST /api/linkedin/publish/{post_id}` - Publish to LinkedIn

### AI
- `POST /api/ai/generate-content` - Generate post content (uses active voice profile)
- `POST /api/ai/suggest-topics` - Get topic suggestions
- `POST /api/ai/improve-hook` - Improve hook with AI

## LinkedIn API Setup Required
To enable LinkedIn publishing, add these to `/app/backend/.env`:
```
LINKEDIN_CLIENT_ID=your_client_id
LINKEDIN_CLIENT_SECRET=your_client_secret
LINKEDIN_REDIRECT_URI=https://your-domain.com/api/linkedin/callback
FRONTEND_URL=https://your-domain.com
```

Get credentials from: https://www.linkedin.com/developers/apps

## Prioritized Backlog

### P0 (Critical) - COMPLETED
- All MVP features ✅
- Post scheduling ✅
- Engagement timer ✅
- Knowledge Vault ✅
- Analytics dashboard ✅
- LinkedIn API integration ✅
- Voice Profile Engine ✅

### P1 (High Priority - Future)
- Multiple user accounts/workspaces
- Team collaboration features
- LinkedIn analytics sync

### P2 (Medium Priority)
- Strategic Arbitrage (trend monitoring)
- Authority jacking suggestions
- Hook library with historical performance

### P3 (Future)
- AI-suggested comment replies
- A/B testing for hooks
- Chrome extension for LinkedIn

## Next Tasks
1. Configure LinkedIn API credentials for production use
2. Add LinkedIn analytics sync to pull engagement metrics
3. Implement multi-user/workspace support
4. Mobile app companion
