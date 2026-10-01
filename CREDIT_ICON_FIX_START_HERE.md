# MultiMind — Credit CastError + metadata icon hotfix

Yeh **sirf update/new files** ka patch hai. Latest Credits & Admin update wale existing project par lagana hai. Isay fresh folder mein complete project samajh kar run nahi karna.

## Problem kya thi?

Log mein first billing unit `ready.cleanRows` / `Trim row whitespace` save karte waqt:

```text
Cast to [string] failed ... at path "units.0"
POST /api/ready-tools/clean-rank/run 400
```

Previous `models/User.js` mein `units` ki inline definition mein `type: String` tha. Mongoose ne isay object ki property ke bajaye array element ka type samjha: `[String]`. Code actual node objects save kar raha tha. Yeh schema bug tha; is particular error ke liye uploaded CSV ko dobara format karne ki zaroorat nahi.

Fix: explicit `AutomationCreditUnitSchema` use kiya hai, aur `units` ab us child schema ka document array hai. Keys/values, collection/model name, current balances aur billing logic retained hain.

Icon ka alag error `@vercel/og/index.node.js` ke font path se aa raha tha. Teen metadata handlers ab bundled, pre-rendered PNG bytes return karte hain. Runtime image/font rendering remove hai. Previous icon runtime patch laga ho ya na laga ho, yeh teen files usay replace karti hain. Main site ki `next/font/google` configuration is patch mein nahi badli; unrelated network/retry warnings ki fix ka claim nahi.

## Apply — Windows CMD

1. `Ctrl + C` se dev server band karein. Apne project ka backup bana lein.
2. ZIP ka content project root mein **merge/replace** karein, jahan `package.json` hai:
   `F:\multimind\multimind-AI`
3. Poora `app`, `models`, `lib` ya `tests` folder delete nahi karna. Sirf matching files replace karni hain.
4. CMD mein verification chalayein:

```bat
cd /d "F:\multimind\multimind-AI"
node VERIFY_CREDIT_ICON_FIX.cjs
```

Verifier installed Mongoose ke saath real schema aur update-casting checks chalata hai; MongoDB ko connect nahi karta aur `.env` read nahi karta. Verification fail ho to output check karein; usay successful verification na samjhein.

5. Verification pass ho to:

```bat
if exist .next rmdir /s /q .next
npm run dev
```

6. Browser mein `Ctrl + F5` karein. Model cache ki wajah se **sirf browser refresh kafi nahi**; old Next process stop/restart karna zaroori hai.

Package/dependencies mein changes nahi. Existing installation complete hai to `npm install` dobara zaroori nahi. `.env`, encryption keys, passwords, fonts aur database ko delete/reset nahi karna.

## Verify with your configured website

- `/dashboard/flows/tools/clean-rank` kholein. Apni file dobara upload karein ya example data load karein.
- Quote review karke **ek** run karein. Is run ko existing admin prices ke mutabiq bill kiya jayega; hotfix tools ko free nahi karta.
- Result aur `/dashboard/flows/credits` receipt dekhein. Credits used current quote aur actually completed operations se match hone chahiye.
- `/icon`, `/apple-icon`, `/opengraph-image` open karein: PNG response expected hai, font-loader error nahi.
- Existing admin Tool Costs, themes, connections aur account balances untouched hain. Theme ab bhi Settings se control hoti hai.

Agar sirf files verify karni hain:

```bat
node VERIFY_CREDIT_ICON_FIX.cjs --files-only
```

`--files-only` database/schema behavior verify **nahi** karta. Is hotfix ke baad latest `VERIFY_CREDIT_ICON_FIX.cjs` use karein; purane credit-patch verifier ke hashes badle hue `models/User.js` ko different report kar sakte hain.

## Screenshot mein 3 credits kyun?

No ranking column selected ho to default clean/rank recipe mein whitespace trim, deduplication aur result limit hotay hain. Default one-credit prices par total 3 hai. Salary ya kisi aur numeric column ke mutabiq ranking chahiye to **Make it yours** mein rank column select karein. Cost selected operations aur admin prices ke mutabiq update hogi; score khud se invent nahi hota.

## Purane failed runs / reserved balance

Hotfix koi credit top-up, balance reset ya ledger deletion nahi karta. Failed attempt ki Credit activity pehle check karein; refund pehle se ho chuka ho sakta hai. Current receipt logic same-cycle, never-started units ko zero charge/full unused refund deta hai. Uploaded log se actual saved receipt ya account balance confirm nahi hota.

Agar process band hone ki wajah se hold pending ho, existing recovery us hold ke 10-minute expiry ke baad Credit activity/quote kholne par chalti hai. Started/uncertain external actions ko bina review dobara send na karein. Holds manually delete ya arbitrary double refund na karein.

## Test boundaries

Patch merge karne ke baad 240 offline tests pass hue: existing 229 + 8 metadata-response checks + 3 synthetic ready-tool/credit checks. Existing wallet tests fake storage use karte hain; woh real database tests nahi.

10 additional **real installed-Mongoose** schema/query checks supplied hain. Is build environment mein Mongoose install nahi ho saka (npm registry DNS unavailable), is liye in 10 checks ko yahan execute nahi kiya ja saka. `VERIFY_CREDIT_ICON_FIX.cjs` aapke already-installed project mein inhein chalata hai. In tests mein native collection calls intercept hoti hain; live MongoDB writes phir bhi test nahi hoti.

Full Next.js build, Windows runtime, live MongoDB persistence, actual OAuth/provider/message calls yahan verify nahi hue. Detailed report: `docs/CREDIT_ICON_FIX_REPORT.md`.
