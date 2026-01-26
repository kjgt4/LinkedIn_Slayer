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

## What's Been Implemented (January 26, 2026)

### Backend (FastAPI + MongoDB)
- ✅ User Settings CRUD with AI provider/model configuration
- ✅ Posts CRUD with framework sections, pillars, scheduling
- ✅ Calendar week endpoint with pillar balance tracking
- ✅ AI content generation endpoint (Claude/OpenAI/Gemini)
- ✅ Topic suggestions endpoint
- ✅ Hook improvement endpoint
- ✅ Hook validation endpoint (8-word rule, score 0-100)
- ✅ Emergent Universal Key integration

### Frontend (React + Tailwind + shadcn/ui)
- ✅ Dashboard with weekly calendar, topic suggestions, framework guides
- ✅ Content Editor with split view (editor + mobile preview)
- ✅ SLAY/PAS framework selection and structured editor
- ✅ Growth/TAM/Sales pillar selection
- ✅ Hook validator with real-time feedback and AI suggestions
- ✅ Mobile phone mockup preview
- ✅ Copy-to-clipboard publishing
- ✅ Content Library with filters and CRUD
- ✅ Settings page with AI model selection

### Design
- ✅ Dark obsidian theme (#0A0A0A)
- ✅ Electric blue accents (#007AFF)
- ✅ Barlow Condensed headings, Inter body text
- ✅ Glass-morphism sidebar
- ✅ Responsive layout

## Prioritized Backlog

### P0 (Critical)
- All MVP features implemented ✅

### P1 (High Priority - Phase 2)
- Knowledge Vault (document upload, voice notes)
- Voice Profile Engine
- LinkedIn API integration for direct publishing

### P2 (Medium Priority - Phase 3)
- Strategic Arbitrage (trend monitoring)
- Authority jacking suggestions
- Hook library with performance data

### P3 (Future - Phase 4)
- 30-minute engagement timer
- AI-suggested comment replies
- Analytics integration

## Technical Architecture
- **Frontend**: React 19, Tailwind CSS, shadcn/ui, React Router
- **Backend**: FastAPI, Motor (async MongoDB), emergentintegrations
- **Database**: MongoDB
- **AI**: Claude Sonnet 4.5 via Emergent Universal Key

## Next Tasks
1. Add scheduling functionality to posts
2. Implement 30-minute engagement timer
3. Add LinkedIn API integration for direct publishing
4. Build Knowledge Vault for document upload
