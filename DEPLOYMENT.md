# MailFortress Deployment Guide

This guide walks you through deploying **MailFortress** with the frontend on **Vercel** and the backend on **Render**.

---

## 📋 Prerequisites

1. **GitHub Account** with your MailFortress repository
2. **Vercel Account** (free tier works)
3. **Render Account** (free tier works)
4. **Supabase Project** with:
   - Supabase URL
   - Supabase Anon Key (for frontend)
   - Supabase Service Role Key (for backend)
5. **Google Gemini API Key** (from [Google AI Studio](https://makersuite.google.com/app/apikey))

---

## 🚀 Part 1: Deploy Backend to Render

### Step 1: Connect GitHub Repository
1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub account and select the **MailFortress** repository
4. Click **"Connect"**

### Step 2: Configure Service
Use these settings:

| Field | Value |
|-------|-------|
| **Name** | `mailfortress-backend` |
| **Region** | Choose closest to you (e.g., Oregon) |
| **Branch** | `master` |
| **Root Directory** | Leave empty |
| **Environment** | `Node` |
| **Build Command** | `cd backend && npm install` |
| **Start Command** | `cd backend && node server.js` |
| **Plan** | Free |

### Step 3: Add Environment Variables
Click **"Advanced"** and add these environment variables:

| Key | Value |
|-----|-------|
| `GENAI_API_KEY` | Your Google Gemini API key |
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key |
| `PORT` | `3001` |
| `NODE_ENV` | `production` |

### Step 4: Deploy
1. Click **"Create Web Service"**
2. Wait for deployment to complete (2-3 minutes)
3. Copy your backend URL (e.g., `https://mailfortress-backend.onrender.com`)

---

## 🌐 Part 2: Deploy Frontend to Vercel

### Step 1: Import Project
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New..."** → **"Project"**
3. Import your **MailFortress** repository from GitHub
4. Click **"Import"**

### Step 2: Configure Build Settings

| Field | Value |
|-------|-------|
| **Framework Preset** | Vite |
| **Root Directory** | `frontend` |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |
| **Install Command** | `npm install` |

### Step 3: Add Environment Variables
Click **"Environment Variables"** and add:

| Key | Value |
|-----|-------|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon key |
| `VITE_BACKEND_URL` | Your Render backend URL (from Part 1) |

### Step 4: Deploy
1. Click **"Deploy"**
2. Wait for deployment (1-2 minutes)
3. Visit your live site URL (e.g., `https://mailfortress.vercel.app`)

---

## 🔧 Part 3: Update Frontend to Use Production Backend

### Update Frontend Configuration

1. Open `frontend/src/store.js` and `frontend/src/components/*` files
2. Replace hardcoded `http://localhost:3001` with environment variable:

```javascript
// Before:
const response = await fetch('http://localhost:3001/llm/chat', { ... });

// After:
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
const response = await fetch(`${BACKEND_URL}/llm/chat`, { ... });
```

3. Commit and push changes:
```bash
git add .
git commit -m "Use environment variable for backend URL"
git push origin master
```

4. Vercel will automatically redeploy with the changes

---

## ✅ Verification

### Test Backend
Visit: `https://your-backend-url.onrender.com/health`

Expected response:
```json
{"status": "ok"}
```

### Test Frontend
1. Visit your Vercel URL
2. Click **"Load Mock Inbox"** - should load test emails
3. Try **"Detect Spam (AI)"** - should categorize emails
4. Go to **"Chat"** tab and generate a draft email

---

## 🔒 Security Notes

1. **Never commit** `.env` files to GitHub
2. **Rotate keys** regularly in production
3. **Restrict CORS** in `backend/server.js` for production:
```javascript
app.use(cors({
  origin: 'https://your-vercel-domain.vercel.app'
}));
```

---

## 🐛 Troubleshooting

### Backend not responding
- Check Render logs: Dashboard → Service → Logs
- Verify environment variables are set correctly
- Ensure `PORT` is set to `3001` or removed (Render auto-assigns)

### Frontend can't connect to backend
- Check CORS is enabled in backend
- Verify `VITE_BACKEND_URL` is set correctly in Vercel
- Check browser console for errors

### Supabase connection issues
- Verify Supabase project is not paused (free tier auto-pauses after 7 days inactivity)
- Check Supabase API keys are correct
- Ensure database tables exist (run `Initialize DB` once)

---

## 📝 Post-Deployment Checklist

- [ ] Backend health endpoint returns `{"status":"ok"}`
- [ ] Frontend loads without errors
- [ ] Mock inbox loads successfully
- [ ] LLM chat/draft generation works
- [ ] Spam detection runs
- [ ] Supabase database operations work
- [ ] Environment variables are set correctly in both platforms

---

## 🎉 You're Done!

Your MailFortress application is now live:
- **Frontend**: `https://your-app.vercel.app`
- **Backend**: `https://your-backend.onrender.com`

Share your deployment URL and start managing emails with AI! 🚀
