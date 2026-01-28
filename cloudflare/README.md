# LinkedIn Authority Engine - Cloudflare Deployment Guide

## Overview
This app consists of:
- **Frontend**: React SPA (deploys to Cloudflare Pages)
- **Backend**: FastAPI Python server (deploys to a separate service or Cloudflare Workers with Python support)

## Frontend Deployment (Cloudflare Pages)

### Option 1: Direct Git Integration (Recommended)
1. Connect your GitHub repo to Cloudflare Pages
2. Configure build settings:
   - **Framework preset**: Create React App
   - **Build command**: `cd frontend && yarn install && yarn build`
   - **Build output directory**: `frontend/build`
   - **Root directory**: `/`

### Option 2: Wrangler CLI
```bash
cd frontend
yarn build
npx wrangler pages deploy build --project-name=linkedin-authority-engine
```

### Environment Variables (Set in Cloudflare Dashboard)
```
REACT_APP_BACKEND_URL=https://your-backend-url.com
REACT_APP_CLERK_PUBLISHABLE_KEY=pk_live_your_clerk_key
```

## Backend Deployment Options

### Option A: External Backend Service
Deploy FastAPI to:
- **Render.com** (Python-native)
- **Railway** (Python-native)
- **Fly.io** (Docker)
- **AWS Lambda** with Mangum adapter

### Option B: Cloudflare Workers (with Python Beta)
Cloudflare Workers now supports Python. See `workers/` directory for configuration.

## Required Environment Variables

### Frontend (.env)
```
REACT_APP_BACKEND_URL=https://your-api-domain.com
REACT_APP_CLERK_PUBLISHABLE_KEY=pk_live_xxx
```

### Backend (.env)
```
MONGO_URL=mongodb+srv://user:pass@cluster.mongodb.net/dbname
DB_NAME=linkedin_authority_engine
CLERK_SECRET_KEY=sk_live_xxx
EMERGENT_LLM_KEY=sk-emergent-xxx  # Or remove and require user API keys
CORS_ORIGINS=https://your-frontend-domain.pages.dev
```

## Production Checklist

### Before Deploying
- [ ] Replace Clerk dev keys with production keys
- [ ] Set up MongoDB Atlas cluster for production
- [ ] Configure CORS for production domain
- [ ] Remove `EMERGENT_LLM_KEY` default (require user keys in production)
- [ ] Update LinkedIn redirect URI in Settings

### Security
- [ ] Enable Clerk production mode
- [ ] Set strict CORS origins
- [ ] Use environment variables for all secrets
- [ ] Enable HTTPS only

## Architecture Notes

### Cloudflare Pages (Frontend)
- Static file hosting
- Global CDN distribution
- Automatic HTTPS
- Preview deployments per branch

### Backend Service (External)
The Python FastAPI backend requires:
- MongoDB connection
- Clerk JWT verification
- AI API access (user-provided or Emergent key)

For production, consider:
1. **Render.com**: Easy Python deployment, free tier available
2. **Railway**: Similar to Render, good DX
3. **Fly.io**: Global edge deployment with Docker
