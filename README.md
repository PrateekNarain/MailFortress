# MailFortress

**A prompt-driven Email Productivity Agent powered by AI**

An intelligent email management system that uses Google's Gemini AI to automatically categorize emails, extract action items, detect spam, and generate draft replies. Built with React, Vite, Supabase, and Express.

🌐 **Live Demo:**
- **Frontend:** https://mailfortress.vercel.app
- **Backend API:** https://mailfortress.onrender.com

---

## 🎯 Features

### Core Functionality
- **📧 Smart Email Inbox** - Gmail-like interface with multi-select, bulk actions, and filtering
- **🛡️ AI-Powered Spam Detection** - Automatic spam filtering with confidence scores (75%+ threshold)
- **🏷️ Automated Categorization** - AI categorizes emails into Work, Personal, Finance, Spam, etc.
- **✅ Action Item Extraction** - Automatically identifies tasks and deadlines from emails
- **✍️ Draft Generation** - AI generates professional replies with suggested follow-ups
- **💬 Email Agent Chat** - Ask questions about emails, get summaries, and generate responses
- **🧠 Prompt Configuration** - Customize AI behavior with editable "Prompt Brain"
- **📥📤 Import/Export Prompts** - Share and backup your custom prompt configurations
- **🔍 Mailbox Filtering** - View All Mail, Inbox (non-spam), or Spam folder
- **☑️ Multi-Select & Bulk Actions** - Select multiple emails and process them together

---

## 🏗️ Architecture

```
frontend/          React + Vite app (UI layer)
├── src/
│   ├── App.jsx          Main UI with inbox, prompts, chat tabs
│   ├── store.js         Zustand state management + Supabase CRUD
│   ├── components/      EmailDetail, PromptConfig, EmailAgentChat, Loading
│   ├── lib/             Supabase client configuration
│   └── constants/       Mock inbox data and default prompts

backend/           Node.js + Express (LLM proxy only)
├── server.js      LLM endpoints: /llm/process-email, /llm/chat, /llm/detect-spam
├── db/
│   ├── init_schema.sql    Database schema with spam detection fields
│   └── schema.sql         Production schema
└── test_*.js      Connection and DB test scripts
```

**Security Model:**
- Backend hides Gemini API keys from frontend
- Frontend uses Supabase anon key (RLS policies recommended for production)
- Backend uses Supabase service role key for admin operations

---

## 🚀 Setup Instructions

### Prerequisites
- Node.js 16+ and npm
- Supabase account (free tier works)
- Google Generative AI API key (Gemini)

### 1. Clone Repository
```powershell
git clone <your-repo-url>
cd "MailFortress"
```

### 2. Set Up Database (Supabase)

1. Create a new Supabase project at https://supabase.com
2. Go to **SQL Editor** and run the schema:

```sql
-- Run backend/db/init_schema.sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS emails (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  from_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT,
  category TEXT,
  action_items JSONB DEFAULT '[]'::jsonb,
  drafts JSONB DEFAULT '[]'::jsonb,
  processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMPTZ,
  spam_confidence NUMERIC(3,2),  -- 0.00 to 1.00
  spam_reason TEXT,
  received_at TIMESTAMPTZ DEFAULT NOW(),
  inserted_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_read BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS prompts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  prompt_type TEXT NOT NULL,
  prompt_text TEXT NOT NULL,
  model TEXT DEFAULT 'gemini-2.5-flash',
  response JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

3. Get your **Supabase URL**, **anon key**, and **service_role key** from Project Settings > API

### 3. Configure Environment Variables

**Backend** (`backend/.env`):
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
GENAI_API_KEY=your-gemini-api-key
PORT=3001
```

**Frontend** (`frontend/.env.local`):
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Install Dependencies

```powershell
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 5. Test Connections (Optional but Recommended)

```powershell
cd backend
npm run test:connections
```

This verifies:
- ✅ Google Gemini API connectivity
- ✅ Supabase database access

### 6. Run the Application

**Terminal 1 - Backend (LLM Server):**
```powershell
cd backend
npm start
# Server runs on http://localhost:3001
```

**Terminal 2 - Frontend (Vite Dev Server):**
```powershell
cd frontend
npm run dev
# Opens at http://localhost:5173 (or another port)
```

---

## 📖 Usage Guide

### Loading Your Inbox

**Option 1: Mock Inbox (Quick Start)**
1. Click **"📥 Load Mock Inbox"** button in the sidebar
2. This loads 12 sample emails locally (no DB persistence)
3. Perfect for testing and demos

**Option 2: Upload JSON**
1. Click **"📤 Upload JSON"** button
2. Select a JSON file with email array:
```json
[
  {
    "from_email": "sender@example.com",
    "subject": "Meeting Request",
    "body": "Can we schedule a meeting next week?",
    "date": "2024-11-25"
  }
]
```
3. Emails are loaded locally for testing

**Option 3: Initialize DB with Defaults**
1. Click **"🔄 Initialize DB"** button
2. This creates default prompts and inserts mock emails into Supabase
3. Data persists across sessions

### Automated Spam Detection

1. Click **"🛡️ Detect Spam (AI)"** button in the sidebar
2. AI analyzes all emails using Gemini
3. Returns confidence scores (0-100%):
   - **75%+ spam confidence** → Auto-moved to Spam folder
   - **75%+ not-spam confidence** → Kept in Inbox
   - **Below 75%** → Shown in All Mail for manual review
4. View confidence scores as colored badges in email list:
   - 🔴 Red (75-100%) = High spam probability
   - 🟡 Yellow (50-74%) = Medium confidence
   - 🟢 Green (0-49%) = Low spam probability

### Mailbox Filtering

Switch between views in the left sidebar:
- **📬 All Mail** - Shows all emails (count badge)
- **📨 Inbox** - Non-spam emails only
- **🚫 Spam** - Spam folder (auto-filtered by AI)

### Multi-Select & Bulk Actions

1. Use checkboxes to select multiple emails
2. Click **"Select All"** to toggle all visible emails
3. Bulk action buttons appear when emails are selected:
   - **Mark Spam** - Move all selected to Spam folder
   - **Process** - Run LLM categorization and action extraction
   - **Clear** - Deselect all

### Processing Emails with AI

**Auto-Process All:**
1. Click **"⚙️ Re-run LLM Processing"**
2. AI processes unprocessed emails:
   - Categorizes (Work, Personal, Finance, etc.)
   - Extracts action items with priorities
   - Saves results to database

**Single Email Processing:**
- Emails are auto-processed when first loaded via "Initialize DB"
- Or use bulk actions to reprocess selected emails

### Configuring Prompts (Prompt Brain)

1. Go to **Prompts** tab
2. Edit the three core prompts:
   - **Categorize Email** - Controls categorization logic
   - **Extract Action Items** - Defines task extraction
   - **Generate Reply** - Sets draft reply tone and style
3. Click **Save Prompt** for each edited prompt
4. All future AI operations use your custom prompts

**Export/Import Prompts:**
- **📤 Export Prompts** - Download JSON file with your configurations
- **📥 Import Prompts** - Upload previously exported JSON to restore/share

### Using the Email Agent Chat

1. Go to **Chat** tab
2. Select an email from dropdown
3. Enter instruction (e.g., "Be concise and professional")
4. Enter query:
   - "Summarize this email"
   - "Draft a polite reply declining this meeting"
   - "What are the action items?"
5. Click **"Generate Draft"**
6. View generated response with **suggested follow-ups** in Email Detail tab

### Viewing Email Details

1. Click any email in the list
2. View full content, category, and confidence score
3. See extracted **Action Items** with priorities
4. Review AI-generated **Drafts** with suggested follow-up actions
5. Click **Refresh** to reload from database

---

## 🎓 Usage Examples

### Example 1: Loading and Categorizing Emails

```
1. Click "📥 Load Mock Inbox" → 12 emails appear
2. Click "⚙️ Re-run LLM Processing" → AI categorizes each email
3. Switch to "📨 Inbox" view → See non-spam emails
4. Click an email → View category and action items
```

### Example 2: Detecting Spam

```
1. Load inbox (mock or upload JSON)
2. Click "🛡️ Detect Spam (AI)"
3. AI analyzes each email with Gemini
4. Emails with 75%+ spam confidence → Moved to 🚫 Spam
5. View confidence scores as colored badges
6. Switch to Spam folder to review flagged emails
```

### Example 3: Bulk Processing

```
1. Load emails
2. Check boxes next to 3-4 emails
3. Click "Process" in bulk actions bar
4. AI processes all selected emails
5. View updated categories and action items
```

### Example 4: Customizing AI Behavior

```
1. Go to "Prompts" tab
2. Edit "Categorize Email" prompt:
   "Categorize into: Urgent, Important, Newsletter, Spam.
    Urgent = requires action within 24 hours."
3. Click "Save Prompt"
4. Re-run processing → AI uses new categories
```

### Example 5: Generating Replies

```
1. Select an email (e.g., meeting request)
2. Go to "Chat" tab
3. Instruction: "Professional and friendly"
4. Query: "Draft a reply accepting the meeting"
5. Click "Generate Draft"
6. View draft in Email Detail → Includes suggested follow-ups
```

### Example 6: Export/Import Workflow

```
1. Configure custom prompts in "Prompts" tab
2. Click "📤 Export Prompts" → Downloads JSON file
3. Share file with team or save as backup
4. On another machine: Click "📥 Import Prompts" → Upload JSON
5. Custom prompts are applied instantly
```

---

## 🧪 Testing

### Run Integration Tests

```powershell
cd backend
npm run test:connections  # Test Gemini and Supabase connectivity
npm run test:db           # Query emails and prompts tables
```

### Manual Testing Checklist

- [ ] Load mock inbox → 12 emails appear
- [ ] Click "Detect Spam (AI)" → Confidence scores shown, emails categorized
- [ ] Switch between All Mail / Inbox / Spam → Filters work correctly
- [ ] Select multiple emails → Bulk actions appear
- [ ] Edit and save a prompt → Verify in DB (check prompts table)
- [ ] Export prompts → JSON file downloads
- [ ] Import prompts → Custom configs load successfully
- [ ] Generate draft reply → Suggested follow-ups appear
- [ ] Re-run LLM Processing → Action items extracted
- [ ] Select an email → Confidence score and category visible

---

## 🔐 Security Notes

### Development Mode
- CSP relaxed to allow inline styles and HMR
- Supabase domains whitelisted for fetch
- ⚠️ **Not production-ready**

### Production Checklist
- [ ] Enable Row Level Security (RLS) on Supabase tables
- [ ] Tighten CSP headers (remove `unsafe-inline`)
- [ ] Add authentication (Supabase Auth or custom)
- [ ] Rate-limit LLM endpoints
- [ ] Validate all user inputs
- [ ] Use HTTPS only
- [ ] Rotate API keys regularly
- [ ] Add logging and monitoring

---

## 📁 Project Structure

```
MailFortress/
├── backend/
│   ├── server.js              Express LLM proxy (3 endpoints)
│   ├── package.json           Dependencies: express, @google/genai, dotenv
│   ├── .env.example           Template for environment variables
│   ├── db/
│   │   ├── init_schema.sql    Initial schema with spam detection
│   │   └── schema.sql         Production schema
│   ├── test_connections.js    Test Gemini and Supabase
│   └── test_db_query.js       Query database samples
├── frontend/
│   ├── src/
│   │   ├── App.jsx            Main UI (inbox, prompts, chat tabs)
│   │   ├── store.js           Zustand store with Supabase + LLM actions
│   │   ├── main.jsx           React entry point
│   │   ├── index.css          Tailwind + custom Gmail-like styles
│   │   ├── components/
│   │   │   ├── EmailDetail.jsx      Email viewer with confidence scores
│   │   │   ├── PromptConfig.jsx     Prompt editor with export/import
│   │   │   ├── EmailAgentChat.jsx   Draft generation interface
│   │   │   └── Loading.jsx          Spinner component
│   │   ├── lib/
│   │   │   └── supabase.js    Supabase client init
│   │   └── constants/
│   │       └── index.js       Mock inbox data + default prompts
│   ├── package.json           Dependencies: react, vite, zustand, tailwindcss
│   ├── vite.config.js         Vite config with /llm proxy
│   ├── tailwind.config.js     Tailwind configuration
│   ├── postcss.config.cjs     PostCSS (CommonJS for ESM project)
│   └── .env.example           Frontend env template
└── README.md                  This file
```

---

## 🛠️ Troubleshooting

### Backend won't start
- Check `backend/.env` has all required variables
- Verify `GENAI_API_KEY` is valid (run `npm run test:connections`)
- Ensure port 3001 is not in use

### Frontend can't connect to backend
- Verify backend is running on `http://localhost:3001`
- Check Vite proxy in `frontend/vite.config.js`
- Look for CORS errors in browser console

### Spam detection not working
- Verify Gemini API key has quota remaining
- Check backend logs for `/llm/detect-spam` errors
- Ensure `spam_confidence` column exists in `emails` table

### Emails not persisting
- Check `frontend/.env.local` has correct Supabase URL and anon key
- Verify Supabase tables exist (run schema in SQL Editor)
- Test DB connection: `cd backend && npm run test:db`

### Confidence scores not showing
- Run spam detection first: Click "🛡️ Detect Spam (AI)"
- Refresh data: Click any mailbox filter or refresh browser
- Check `spam_confidence` column in Supabase table

---

## 🤝 Contributing

This is an academic project. For bugs or feature requests, please:
1. Document the issue with screenshots
2. Include error logs from browser console and terminal
3. Specify which feature is affected

---

## 📄 License

Academic project - check with instructor for usage terms.

---

## 🙏 Credits

- **Google Gemini AI** - LLM powering categorization, spam detection, and drafts
- **Supabase** - PostgreSQL database with real-time capabilities
- **React + Vite** - Fast and modern frontend framework
- **Tailwind CSS** - Utility-first styling for Gmail-like UI
- **Zustand** - Lightweight state management

---

**Built with ❤️ for intelligent email management**
