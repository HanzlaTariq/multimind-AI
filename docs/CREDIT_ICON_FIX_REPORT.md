# Credit schema and Windows metadata hotfix — technical report

## Inputs and baseline

The supplied screenshot and terminal log show an uploaded table, successful quote responses, then a failure recording `step_1` / `ready.cleanRows` at `units.0`. They separately show `/icon` failing in the Node OG renderer while resolving its bundled font path. The log does not expose the resulting wallet document or final credit receipt.

Working baseline: supplied Flow Studio Pro project, previous icon patch, Ready Tools Pro update, then Credits & Admin update. No local-only user edits outside these supplied archives are assumed.

## Root cause and changes

### User model

Previous field:

```js
units: [{ key: String, type: String, label: String, cost: Number, status: String, _id: false }]
```

Mongoose treats `type` as schema configuration here, resulting in a string array. The server pushes an object with key/type/label/cost/status, causing the observed cast failure. The hotfix uses an explicit child `mongoose.Schema` with `_id: false` and declares `units` as an array of that child schema. `type` remains the stored field name; it is not renamed or removed.

No pricing function, wallet calculation, admin authorization rule, account role, current balance, collection name, plan default, theme preference or connection setting is changed. No database-reset or data-migration script is included. Development process restart is mandatory to discard the previously compiled model.

Reference (official Mongoose 8 documentation):
https://mongoosejs.com/docs/8.x/docs/schematypes.html#the-type-key
https://mongoosejs.com/docs/8.x/docs/subdocs.html

### Metadata image handlers

`app/icon.js`, `app/apple-icon.js`, and `app/opengraph-image.js` now return ordinary PNG `Response` objects from a bundled helper. The PNGs keep the original brand palette, M mark, dimensions, and OG wording; text is rasterized ahead of time rather than on every request. Text rendering is not asserted to be pixel-identical to the former font renderer.

The helper contains image bytes only, not font files. It imports neither `next/og` nor `@vercel/og`, reads no filesystem paths at request time, and makes no font/network request. Existing metadata filenames and URLs are retained, so the user does not need to delete/rename old handlers or add parallel icon routes.

This follows the same pre-bundled-buffer approach used by Next.js's static metadata loader. Next 14's dynamic metadata loader delegates to the exported handler, which can return a response directly.

Reference (official Next.js source and documentation):
https://raw.githubusercontent.com/vercel/next.js/v14.2.35/packages/next/src/build/webpack/loaders/next-metadata-route-loader.ts
https://nextjs.org/docs/14/app/api-reference/file-conventions/metadata/app-icons

The site's separate `next/font/google` usage remains unchanged. The unspecified aborted/retried network requests in the user's log are not claimed to be fixed by this hotfix.

## Executed checks

On the merged baseline plus hotfix, with Node 22.16.0:

```sh
node --test tests/flows/*.test.mjs tests/credits/*.test.mjs tests/hotfix/metadata.test.mjs tests/hotfix/ready-credit.test.mjs
```

**240 passed, 0 failed, 0 skipped.** Breakdown: the prior 229 offline flow/ready-tool/credit tests, 8 metadata handler/PNG tests, and 3 additional synthetic employee-table/quote/refund tests. No private uploaded dataset is embedded in the tests.

The metadata tests invoke the delivered handler code and inspect its native response, PNG signature, IHDR dimensions, IDAT decompression, repeat-call body handling and absence of OG/font/filesystem imports. This is not a Next.js route/build integration test. The pre-rendered OG image was visually inspected for clipping and preserved copy.

The synthetic no-score-column table produces a 3-operation quote at unit prices of 1 and deduplicates without creating artificial scores. An unstarted same-cycle failed receipt computes zero charge and full unused refund. This is a code-level example, not proof of the user's real saved balance.

Payload syntax, manifest integrity, ZIP path/integrity, and extraction/overlay checks are performed during packaging. Other than the four documented runtime files, original application files remain byte-identical.

## Additional supplied checks, not executed here

`tests/hotfix/credit-schema.test.cjs` contains 10 tests using the project's real installed Mongoose dependency. They inspect the document-array schema, direct validation, default arrays, recreation of the previous bug, the exact nested `$push`, reserve casting, positional/array-filter finish updates, receipt settlement casting, hydration, and preservation of preference/admin/privacy fields.

Collection `updateOne` is intercepted only after Mongoose's query casting. The tests open no network/database connection and do not load `.env`. These tests were added specifically because the earlier wallet fake-storage suite does not exercise Mongoose schema parsing.

The environment has no installed Mongoose and cannot resolve the npm registry. Attempting the Mongoose regression file is blocked by `MODULE_NOT_FOUND`; this is not counted as a pass or skipped success. An attempted legacy `tests/credit-system.test.js` run was likewise blocked by missing Mongoose. No claim is made that every historical test passed.

`node VERIFY_CREDIT_ICON_FIX.cjs` runs payload integrity checks and then all 21 new checks on the user's installed project. It fails clearly rather than silently passing when Mongoose is unavailable. `--files-only` explicitly excludes behavioral verification.

## Remaining integration checks

Full Next.js build, actual Windows runtime, live MongoDB persistence and concurrency, OAuth, AI providers, and external message delivery were not verified here. Before public use, perform one staging upload/run/receipt check, inspect the real balance, check admin pricing and saved themes, and request all three metadata URLs.

Do not delete credit holds or add a blanket manual refund based only on the cast error. Inspect receipts and use existing expiry/recovery and admin review mechanisms to avoid double refunds. No billing bypass or free-production-run workaround is introduced.
