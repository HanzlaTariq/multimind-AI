# MultiMind — Flow Studio Pro upgrade

## Pehle yeh karo

Yeh aapke original MultiMind project ka updated source code hai. Flow dashboard,
canvas, workflow engine, APIs aur credentials system upgrade kiye gaye hain.

**Existing project update kar rahe ho:** purani `.env.local` file is project ke
root mein copy karo. Purani `ENCRYPTION_KEY` bilkul change mat karna. Original
`public/fonts/` folder bhi apne project se retain karo; Arabic PDF export us asset
ko use karta hai. `node_modules` aur `.next` copy mat karo.

**Fresh setup:** `.env.example` ko `.env.local` naam se copy karo, phir MongoDB,
NextAuth aur encryption settings fill karo. Kisi example ko real API key na samjho.

## Run

Node.js 22.7 ya newer use karo; verification Node.js 22.16 par ki gayi hai.
VS Code terminal mein extracted project folder open karke:

```bash
npm ci
npm run dev
```

Signed-in flow dashboard: `http://localhost:3000/dashboard/flows`

Browser-local test sandbox: `http://localhost:3000/flow-studio`

Sandbox mein native workflow steps run hote hain. External API, email aur AI
steps test fixtures use karte hain: yeh real messages send nahi karte. Sandbox
pehle local development server se load karna hota hai; yeh separately installed
offline app nahi hai.

## Pehla working demo

Sandbox open karo. Smart lead qualification template pehle se loaded milega.
`Test input` se `score` ko 86 rakho aur `Test workflow` press karo: sales-ready path
chalega. Score 30 karke test karo: nurture path chalega. Shared merge dono cases
mein sahi output deta hai. Kisi node par click karke Parameters, Settings aur Data
tabs check karo. Executions tab se history aur Versions se checkpoint restore
check kar sakte ho.

## Tests

```bash
npm run test:flows
```

59 automated engine / graph / expression / security-helper tests pass hue hain.
Pure tests ke liye MongoDB, provider keys ya live service account nahi chahiye.
Full Next.js build aur real API integrations is environment mein verify nahi
huye: package downloads DNS/network error ke sabab complete nahi ho sake.
Local setup ke baad `npm run build` run karo.

## Live features

Credentials dialog mein apne tokens save karo. Google services ke liye existing
account connections use karo. HTTP Request ke target host ko server ke
`FLOW_HTTP_ALLOWED_HOSTS` mein approve karo. Webhooks ke liye bearer token aur
active workflow zaroori hain. Scheduled runs ke liye external cron configuration
zaroori hai; sirf Activate press karna scheduler install nahi karta.

**56 catalog entries ka matlab 56 live integrations nahi hai:** 29 native tools
(including a non-executing sticky note), 17 integration definitions with executor
paths, aur 10 inherited placeholders hain. Placeholders clearly labeled hain aur
live runs mein block hote hain. Provider credentials aur API permissions ab bhi
required hain.

Detailed feature list, setup, limitations, endpoints aur smoke-test checklist:
`docs/FLOW_STUDIO_GUIDE.md`.
Verification details: `docs/VERIFICATION.md`.
