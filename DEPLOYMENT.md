# LinkedIn Authority Engine - Deployment Guide

## Architecture Overview
```
┌─────────────────────┐      ┌─────────────────────┐      ┌─────────────────────┐
│  Cloudflare Pages   │      │   Render/Railway    │      │   MongoDB Atlas     │
│     (Frontend)      │ ───▶ │     (Backend)       │ ───▶ │    (Database)       │
│   React SPA         │      │   FastAPI Python    │      │                     │
└─────────────────────┘      └─────────────────────┘      └─────────────────────┘
```

---

## Step 1: MongoDB Atlas Setup

1. Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free M0 cluster
3. Create database user with read/write access
4. Whitelist all IPs (`0.0.0.0/0`) for cloud deployment
5. Copy connection string: `mongodb+srv://user:pass@cluster.mongodb.net/linkedin_authority`

---

## Step 2: Backend Deployment (Render.com)

### Option A: Render.com (Recommended)

1. Go to [render.com](https://render.com) → New → Web Service
2. Connect your GitHub repo
3. Configure:
   - **Name:** `linkedin-authority-api`
   - **Root Directory:** `backend`
   - **Runtime:** Python 3
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn server:app --host 0.0.0.0 --port $PORT`

4. Add Environment Variables:
   ```
   MONGO_URL=mongodb+srv://user:pass@cluster.mongodb.net/linkedin_authority
   DB_NAME=linkedin_authority
   CLERK_SECRET_KEY=sk_live_your_clerk_key
   CORS_ORIGINS=https://your-app.pages.dev
   ```
   
   Optional (if providing default AI):
   ```
   EMERGENT_LLM_KEY=your_key_here
   ```

5. Deploy and copy the URL (e.g., `https://linkedin-authority-api.onrender.com`)

### Option B: Railway

1. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
2. Select your repo, set root directory to `backend`
3. Railway auto-detects Python and sets up the service
4. Add the same environment variables as above
5. Generate a public domain in Settings

---

## Step 3: Frontend Deployment (Cloudflare Pages)

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com) → Pages → Create a project
2. Connect to Git → Select your GitHub repo
3. Configure build settings:
   - **Framework preset:** Create React App
   - **Build command:** `cd frontend && yarn install && yarn build`
   - **Build output directory:** `frontend/build`

4. Add Environment Variables:
   ```
   REACT_APP_BACKEND_URL=https://linkedin-authority-api.onrender.com
   REACT_APP_CLERK_PUBLISHABLE_KEY=pk_live_your_clerk_key
   ```

5. Deploy!

---

## Step 4: Clerk Production Setup

1. Go to [clerk.com](https://clerk.com) → Your Application
2. Switch to Production mode
3. Add your domains:
   - Frontend: `your-app.pages.dev`
   - Backend callback: `https://linkedin-authority-api.onrender.com/api/linkedin/callback`
4. Copy production keys and update environment variables

---

## Step 5: Update CORS & LinkedIn Redirect

### Backend CORS
Set `CORS_ORIGINS` to your Cloudflare Pages domain:
```
CORS_ORIGINS=https://linkedin-authority-engine.pages.dev
```

### LinkedIn OAuth (if using direct publishing)
Update redirect URI in LinkedIn Developer Portal and user Settings page to:
```
https://linkedin-authority-api.onrender.com/api/linkedin/callback
```

---

## Environment Variables Reference

### Backend (Render/Railway)
| Variable | Required | Description |
|----------|----------|-------------|
| `MONGO_URL` | Yes | MongoDB Atlas connection string |
| `DB_NAME` | Yes | Database name |
| `CLERK_SECRET_KEY` | Yes | Clerk production secret key |
| `CORS_ORIGINS` | Yes | Frontend domain(s), comma-separated |
| `EMERGENT_LLM_KEY` | No | Default AI key (users can provide their own) |

### Frontend (Cloudflare Pages)
| Variable | Required | Description |
|----------|----------|-------------|
| `REACT_APP_BACKEND_URL` | Yes | Backend API URL |
| `REACT_APP_CLERK_PUBLISHABLE_KEY` | Yes | Clerk production publishable key |

---

## Post-Deployment Checklist

- [ ] Backend health check: `curl https://your-api.onrender.com/api`
- [ ] Frontend loads and shows sign-in page
- [ ] Can create account and sign in via Clerk
- [ ] Can create and save posts
- [ ] AI generation works (with user API key or Emergent key)
- [ ] Copy-to-clipboard works for LinkedIn publishing

---

## Troubleshooting

**Backend not starting:**
- Check Render logs for import errors
- Verify all requirements are in `requirements.txt`

**CORS errors:**
- Ensure `CORS_ORIGINS` matches your exact Cloudflare Pages URL
- Include `https://` prefix

**Auth not working:**
- Verify Clerk keys match environment (test vs production)
- Check that frontend and backend use matching Clerk instance

**MongoDB connection fails:**
- Whitelist `0.0.0.0/0` in Atlas Network Access
- Verify connection string format
