# MultiMind — Multi-AI Aggregator (Next.js)

Aik prompt bhejo, teen AI models (Gemini, Groq, DeepSeek) parallel me respond karti hain, side-by-side compare karo. Full auth (Google + email/password), MongoDB me har conversation save hoti hai.

## Stack

- **Next.js 14** (App Router)
- **NextAuth.js** — Google OAuth + Credentials (email/password with bcrypt)
- **MongoDB + Mongoose** — users aur conversations store karne ke liye
- **Tailwind CSS** — custom dark theme, per-model accent colors
- **Gemini / Groq / DeepSeek APIs** — `Promise.all` se parallel calls

## Setup (local)

1. **Dependencies install karo:**
   ```bash
   npm install
   ```

2. **`.env.local` file banao** (`.env.example` ko copy karke):
   ```bash
   cp .env.example .env.local
   ```

3. **Keys fill karo `.env.local` me:**

   | Variable | Kahan se milegi |
   |---|---|
   | `MONGODB_URI` | [MongoDB Atlas](https://cloud.mongodb.com) → free cluster bana ke connection string |
   | `NEXTAUTH_SECRET` | Terminal me chalao: `openssl rand -base64 32` |
   | `NEXTAUTH_URL` | Local ke liye `http://localhost:3000` |
   | `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | [Google Cloud Console](https://console.cloud.google.com/apis/credentials) → OAuth 2.0 Client ID → redirect URI: `http://localhost:3000/api/auth/callback/google` |
   | `GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com/apikey) |
   | `GROQ_API_KEY` | [console.groq.com](https://console.groq.com/keys) |
   | `DEEPSEEK_API_KEY` | [platform.deepseek.com](https://platform.deepseek.com/api_keys) |

4. **Run karo:**
   ```bash
   npm run dev
   ```
   `http://localhost:3000` par khul jayega.

## Project structure

```
app/
  page.js                 → Landing page
  login/page.js            → Login (Google + credentials)
  signup/page.js           → Signup
  dashboard/page.js        → Protected chat dashboard (server component, auth check)
  api/
    auth/[...nextauth]/    → NextAuth handler
    auth/register/         → Signup endpoint (bcrypt hash + save to Mongo)
    chat/                  → Calls Gemini + Groq + DeepSeek in parallel, saves turn
    conversations/         → List / fetch / delete saved conversations
components/
  ChatDashboard.jsx        → Main chat UI (sidebar + 3-column responses)
  ResponseColumn.jsx       → Renders one model's markdown answer
  LiveDemo.jsx             → Animated hero demo on the landing page
  Navbar.jsx, Footer.jsx, Providers.jsx
lib/
  auth.js                  → NextAuth config (providers, callbacks)
  mongodb.js                → Cached Mongoose connection
models/
  User.js, Conversation.js
middleware.js              → Protects /dashboard/*
```

## Deploy (Vercel)

1. Repo ko GitHub par push karo, phir Vercel me import karo.
2. Sab environment variables Vercel project settings → Environment Variables me daalo (upar wali table jaisi).
3. `NEXTAUTH_URL` ko apne production domain se replace karo (e.g. `https://yourapp.vercel.app`).
4. Google OAuth console me production redirect URI bhi add karo: `https://yourapp.vercel.app/api/auth/callback/google`.

## Notes

- Free plan me har user 20 queries/day — abhi ye sirf UI me dikhaya gaya hai (landing page pricing), actual rate-limiting add karne ke liye `Conversation` count check karke `/api/chat` me ek guard laga sakte ho.
- Model names (`gemini-2.0-flash`, `llama-3.3-70b-versatile`, `deepseek-chat`) providers ke current model list ke hisab se change ho sakte hain — agar koi error aaye "model not found" jaisa, respective provider ki docs check kar lena.
