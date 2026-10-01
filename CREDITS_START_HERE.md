# MultiMind — Node Credits + Admin Controls

## Yeh update kis project ke liye hai?

Yeh **sirf updated/new files** ka patch hai. Isay us existing project par apply karein jahan Flow Studio Pro aur Ready Tools Pro update pehle se laga hua hai. Fresh/empty folder mein yeh complete project ki tarah run nahi hoga.

Existing User.credits, plan allowance aur payment/credit purchase system hi use hota hai. Koi doosra wallet nahi banaya. Theme ab bhi **Settings → Preferences** aur connections **Settings → Connections** se control hote hain.

## Apply karna

1. Project aur database ka backup bana lein. Running dev server ko Ctrl+C se band karein.
2. ZIP extract karke andar ke app, components, lib, models, tests aur docs folders/files apne project root mein MERGE karein. Same-name files par Replace select karein. Poora existing folder delete nahi karna.
3. Apni `.env` / `.env.local`, existing `ENCRYPTION_KEY`, fonts aur Windows icon fix ko untouched rakhein. Dependencies/package files nahi badle.
4. Apne CMD mein:

```bat
cd /d "F:\multimind\multimind-AI"
node VERIFY_CREDIT_PATCH.cjs
if exist .next rmdir /s /q .next
npm run dev
```

Existing dependencies installed hain to dobara npm install zaroori nahi. Phir browser mein Ctrl+F5 karein. Patch verifier sirf included files ki integrity check karta hai, database ya website behavior test nahi karta.

## Admin pricing set kare

Apne existing admin account se **Admin → Tool Costs → Workflows & ready tools** kholein:

```text
/admin/tool-costs
```

Pehli pricing request missing automation prices ko automatically initialize karti hai. Existing document/PDF/TTS rates aur user balances reset nahi hote. Normal user apne aap admin nahi ban sakta; admin role current database se verify hota hai.

Default **har supported live processing node = 1 credit**. 63 automation pricing entries hain: supported workflow nodes aur ready-tool processing operations. Ready-made tools multiple priced operations compose kar sakte hain.

Admin individual node ki price change kar sakta hai, ya **Set every automation node to one price** mein 1/2/5 waghera de kar **Apply to all nodes** kar sakta hai. Bulk action individual overrides aur scheduled automation prices replace karta hai; confirmation zaroori hai. Document-tool prices alag tab mein unchanged rehte hain.

**0** ka matlab node free. Allowed price 0–10,000 whole credits. Individual future-dated prices bhi schedule ki ja sakti hain. Active runs apne reserved rates use karte hain; naye runs current rates use karte hain.

Policy controls:

- Enable automation charges: off karne par naye automation runs ka credit cost 0.
- Charge native test-mode nodes: default off. On hone par real native test steps bill hote hain; external mocks aur pinned test data nahi.
- Maximum credits reserved per run: default 10,000. Yeh per-run upper limit hai, extra allowance nahi.

Admin apne existing **Users** controls se account credits/plan manage kar sakta hai. Unsettled automation run ho to balance/plan replacement temporarily block hoti hai, taake baad ka refund admin ki balance setting ko galat na kar de. Run complete/recover hone ke baad correction karein. Banned account ka crashed hold ho to pehle account ko temporarily restore karke Credit activity se recovery karwayein; stored hold manually delete na karein.

## User ko kya nazar aayega?

Tool form mein Run se pehle exact processing-step prices aur available balance dikhta hai. Example data ko Run karna bhi paid hai jab pricing enabled ho. Example load, file preview, existing result read/copy/download aur re-download par naya charge nahi.

**Clean & rank a dataset → Try example data:** default options ke saath 5 operations, default rates par **5 credits**. Rows ki quantity se charge multiply nahi hota. Admin kisi operation ki price badle to quote usi hisaab se badalta hai. Yeh ready tool ki recipe hai; advanced graph mein trigger samait uske actual nodes count hote hain.

Advanced workflow mein Live run se pehle maximum reservation ki confirmation aati hai. Misal: 4 reachable nodes quote hon, lekin branch ki wajah se sirf 3 successful nodes run hon, default rates par 4 reserve → 3 charge → 1 return. Trigger bhi node hai; usay free rakhna ho to admin uski price 0 kare.

### Credit activity

```text
/dashboard/flows/credits
```

Latest 50 automation receipts: reserved amount, actual charge, returned credits aur node-wise details. Chat/document/payment receipts is screen mein included nahi. Admin Tool Costs screen par recent receipts aur last-7-days totals dekh sakta hai.

## Important billing rules

Confirmed failed nodes, disabled nodes, skipped branches aur notes charge nahi hote. Node retries/per-item processing ek logical-node price mein included hain, har attempt ya row ka separate charge nahi. External per-item processing is liye website owner ki provider cost badha sakti hai; AI/action prices accordingly set karein.

Timeout ya crash ke baad external action deliver hua ya nahi, confirm na ho to attempted node **uncertain** mark hota hai aur charged reh sakta hai. Destination check kiye baghair dobara Send na karein. Admin existing Users credit controls se reviewed correction kar sakta hai.

Unused reserved credits normally run finish hote hi return hote hain. Process crash ho to 10 minutes ke baad user Credit activity/quote endpoint khole, tab expired hold recover hota hai. Yeh automatic background worker nahi. Started-but-unconfirmed steps review ke liye charged rehte hain. Purane plan cycle ke unused amounts nayi allowance mein extra credits nahi bante.

Default test mode free hai. `/flow-studio` browser sandbox ab bhi unbilled demo hai, paid production runner nahi.

## Data processing change

Pehle 10 data/text tools browser mein process hote thay. Ab **Run** par parsed rows/text website server ko jate hain, taake existing credits authorize kiye ja sakein. In tools ke inputs/results billing ya ready-tool history mein save nahi hote. Browser file parsing/preview aur downloads retained hain. AI/connected tools required content apni configured service ko bhejte hain. Advanced workflow execution logs ka existing behavior alag hai; unhein input backup/privacy guarantee na samjhein.

## Verification

```bat
node --test tests/flows/*.test.mjs tests/credits/*.test.mjs
npm run build
```

Supplied code par **229 tests pass** hue: 122 existing flow/ready-tool tests + 107 new pricing, wallet-contract, authorization aur engine+meter tests. Wallet storage tests deterministic adapter use karte hain, real MongoDB nahi. Is environment mein dependency registry unavailable thi; full Next build, browser UI, real MongoDB, OAuth, AI aur actual message delivery verify nahi hue.

Production users invite karne se pehle staging database par admin change, enough/low credits, paid Live run, free Test, failed-node refund aur real-service test karein. Technical details: `docs/AUTOMATION_CREDITS_GUIDE.md`; exact test boundaries: `docs/AUTOMATION_CREDITS_TEST_REPORT.md`.
