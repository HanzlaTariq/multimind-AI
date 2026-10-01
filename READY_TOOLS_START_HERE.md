# MultiMind — Ready Tools Pro (update only)

## Yeh poora project nahi hai

Yeh patch **pehle wale Flow Studio Pro update** ke upar apply karna hai. Is ZIP mein sirf changed aur new files hain. Existing project ki baqi files zaroori hain.

## Apply karne ka tareeqa

1. Terminal mein `Ctrl + C` se dev server band karein. Apne existing project ka backup bana lein.
2. ZIP extract karein. Andar ke `app`, `components`, `lib`, `models`, `tests`, `docs` folders aur root guide/manifest files us project folder mein copy karein jahan `package.json` hai.
3. Folders **merge** karein aur matching files **replace** karein. Poora `app`, `components` ya `lib` folder delete NA karein.
4. Apni `.env` / `.env.local`, existing `ENCRYPTION_KEY`, MongoDB settings aur fonts bilkul waise hi rehne dein. Is patch mein icon files bhi nahi hain, is liye pehle wala Windows icon fix overwrite nahi hoga.
5. Windows CMD mein:

```bat
cd /d "F:\multimind\multimind-AI"
if exist .next rmdir /s /q .next
npm run dev
```

Browser mein `Ctrl + F5` karein. Package dependencies nahi badli hain; agar existing project ki dependencies installed hain to dobara `npm install` zaroori nahi.

## Ab user ko kya milega?

Login ke baad `/dashboard/flows` par **Ready-made tools** library khulti hai. Normal user ko nodes ya JSON workflow banane ki zaroorat nahi.

`Choose tool → Upload / paste → Run → Review → Download`

Advanced Flow Studio ab bhi `/dashboard/flows/workflows` par hai. Purane flow IDs aur saved workflows ka editor `/dashboard/flows/[id]` par wahi rehta hai.

## Pehla practical test

- Library mein **Clean & rank a dataset** kholein.
- **Try example data** dabayein: 6 records load honge.
- **Run tool** dabayein. Default settings se 4 result records aur 2 removed records milte hain.
- **Download CSV**, **More formats → Excel (.xlsx)**, ya JSON select karein.
- Apne data ke liye **Upload a file** ya **Paste a table** use karein. Workflow editor ka Import button dataset upload ke liye use na karein.

Ranking existing score/rating/points ko use karti hai; AI score invent nahi hota. Default sample mein score 60 se kam records remove hote hain, duplicate email ki first entry rehti hai aur highest score pehle aata hai. Optional settings mein columns, minimum aur limit change kar sakte hain.

## Theme — sirf Settings se

`Settings → Preferences → Theme`

**Midnight, Light, Nord aur Sepia** ready tools, workflow library aur advanced canvas par apply hote hain. Flow Studio ka alag dark/light preference hataya gaya hai. Theme save fail ho to Settings status message dikhata hai.

## Connections — Settings mein hi

`Settings → Connections`

Existing Google/social connections wahin rehti hain. Naye section **Automation connections & API credentials** mein Slack/Discord webhook, Telegram bot token ya advanced HTTP credentials save hote hain. Secret list mein wapas nahi dikhaya jata.

Tool mein account select karein. Naya account save karke wapas tool mein **Refresh** dabayein. Gmail/Slack/Discord/Telegram kuch bhi send karne se pehle poora message review aur explicit confirmation mangte hain. Sirf tool kholne ya example load karne se message send nahi hota.

## Tools & Workflows settings

`Settings → Tools & Workflows`

Default download format, recent activity on/off, activity clear, aur saved option presets manage karein. Favorites aur presets signed-in account ke saath sync hote hain. Recent activity inputs/results ka backup nahi hai: original text, files aur generated output us history mein save nahi hote. Result chahiye to page chhorne se pehle download kar lein.

## Kaun se tools foran chalenge?

- **10 browser-only tools:** upload/paste se chal jate hain; AI key ya external account nahi chahiye.
- **8 AI tools:** site owner ka working configured AI provider aur user credits chahiye. Visitor ko apni AI key dene ki zaroorat nahi. Example input bhi real AI run hai, free fake demo nahi.
- **5 connected tools:** Google Sheets read, Gmail send, Slack, Discord aur Telegram. Relevant account/secret, permissions, service availability aur quotas chahiye.

AI provider configure na ho to UI clearly batati hai aur run disable hota hai. Account connect hona service permissions ki guarantee nahi; owner ko real service test karna hoga.

## Before public launch

Full Next.js build aur real MongoDB/OAuth/provider round trips is environment mein verify nahi hue. `docs/READY_TOOLS_TEST_REPORT.md` mein actual test coverage aur manual launch checklist di hui hai. Is patch ko pehle backup/staging copy par apply karke login, settings, AI billing aur apne accounts se read/send test karein.

Detailed feature limits aur developer notes: `docs/READY_TOOLS_GUIDE.md`.
