# MultiMind — Multi-AI Aggregator (Next.js)

Aik prompt bhejo — MultiMind har message ke liye khud smart routing se best-fit provider choose karta hai (available providers me se, jinke API keys set hain: Groq, Gemini, DeepSeek, Grok, ChatGPT, Claude), taake har query sabse suitable aur affordable model se answer ho, sab models ko parallel call kiye baghair. Full auth (Google + email/password), MongoDB me har conversation save hoti hai.

> **Security note:** Conversation data (title, prompts, AI responses) is encrypted **at rest** in MongoDB (AES-256-GCM). This is **not end-to-end encryption** — see [Encryption](#encryption) below for what that means in practice.

## Stack

- **Next.js 14** (App Router)
- **NextAuth.js** — Google OAuth + Credentials (email/password with bcrypt)
- **MongoDB + Mongoose** — users aur conversations store karne ke liye
- **Tailwind CSS** — custom dark theme, per-model accent colors
- **Gemini / Groq / DeepSeek / Grok / ChatGPT / Claude APIs** — smart single-provider routing (`lib/providers.js`), sirf configured API keys wale providers se

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
   | `ENCRYPTION_KEY` | Terminal me chalao: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` — ye key conversation content ko database mein encrypt karti hai (encryption at rest). **Isay kabhi lose mat karna, warna purani conversations permanently unreadable ho jayengi.** |
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
    chat/                  → Routes to the best-fit configured provider, saves turn
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

## Encryption

Conversation content (user prompts + AI responses) is encrypted at rest
in MongoDB using AES-256-GCM — see `lib/encryption.js` and the hooks in
`models/Conversation.js`. This protects the data if the database is
ever dumped, leaked, or accessed directly.

This is **not** true end-to-end encryption: the app server holds the
key and decrypts the content in memory, because it has to send
plaintext to the AI providers (Gemini/Groq/DeepSeek/etc.) and render it
back to users. No AI chat product (Claude, ChatGPT, etc.) can be truly
E2EE for the same reason — the model in the middle has to read the
message to respond to it.

Practical implication: `turns.prompt` / `turns.responses[].text` are no
longer searchable via a MongoDB text index, since they're ciphertext.
The conversation search endpoint (`app/api/conversations/search`) now
decrypts and filters in the application layer instead — fine at normal
scale, but if a single user accumulates thousands of conversations,
consider building a proper encrypted search index later.

## Notes

- Free plan me har user 20 queries/day — abhi ye sirf UI me dikhaya gaya hai (landing page pricing), actual rate-limiting add karne ke liye `Conversation` count check karke `/api/chat` me ek guard laga sakte ho.
- Model names (`gemini-2.0-flash`, `openai/gpt-oss-120b`, `deepseek-chat`) providers ke current model list ke hisab se change ho sakte hain — agar koi error aaye "model not found" jaisa, respective provider ki docs check kar lena.