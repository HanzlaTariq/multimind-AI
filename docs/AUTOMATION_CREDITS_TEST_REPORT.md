# Automation credits — QA report

## Actually executed

Command (Node v22 in the supplied code environment):

```sh
node --test tests/flows/*.test.mjs tests/credits/*.test.mjs
```

**229 passed; 0 failed; 0 skipped.**

- 122 existing flow/ready-tool tests were rerun, not merely inherited from the preceding report.
- 107 added checks: 63 pure pricing/recipe/quote/receipt checks, 18 wallet contract checks, 16 workflow-engine + wallet integration checks and 10 authorization/request-bound checks.
- JavaScript/JSX/MJS parse audit: 287 source files, zero syntax diagnostics.
- Local-import resolution audit: 629 relative/alias references, zero missing paths. This is not type checking or dependency installation.
- The patch verifier and ZIP overlay/hash verification are run as part of packaging. The delivered manifest records each payload file's prior hash (where applicable) and new hash; the manifest does not hash itself.

## Test boundaries

Pricing tests run the actual pure production functions. Execution tests run the actual workflow engine and actual wallet functions together. Wallet code is loaded from the delivered source with injected test dependencies. Storage is `tests/credits/fake-mongo.mjs`, a small deterministic Mongo-style in-memory adapter; **it is not MongoDB or Mongoose**. Authorization checks run the actual authorization functions with session/account stubs, not real NextAuth sessions.

Covered scenarios include defaults/admin overrides/free pricing, every ready-tool recipe, optional operations, target execution, branch reservations, skipped/disabled/pinned/mock nodes, seeded triggers, per-item/retry accounting, pre-dispatch rejection, cancellation, timeout uncertainty, concurrent reserve/settle contract behavior, repeat settlement, expired holds, reset-cycle mismatch, hidden content boundaries, banned/revoked admin access and bounded/cross-site JSON requests.

The server route that changes admin account balances includes an unsettled-hold guard; that route's full Mongoose execution was not covered by these adapter tests. The original unrelated `tests/credit-system.test.js` was not part of the command above and depends on installed Mongoose. No claim is made that every historical test in the repository passed.

## Not verified here

- Full Next.js dev/production compilation and browser/UI rendering for this credit patch.
- Real MongoDB collection initialization, index creation, array-filter casting, distributed races or transaction behavior.
- Actual provider charges, OAuth, message delivery, hosted webhooks/cron/Drive events or payment-gateway updates.
- Complete historical ledger durability, penetration testing, load testing, accessibility certification or visual regression.

Dependency installation could not finish because the container could not resolve the npm registry (`EAI_AGAIN registry.npmjs.org`). An actual `npm run build` attempt ended with `next: not found` because those dependencies were unavailable here. This does not mean the user's already-installed local project lacks Next. The patch changes no dependencies.

## Staging acceptance checklist

1. Apply on the latest Ready Tools Pro project, run `node VERIFY_CREDIT_PATCH.cjs`, then `npm run build` with the project's real installed dependencies.
2. As current admin, open Tool Costs. Check existing document costs survive; check new automation defaults; set a single operation to 3, to 0 and schedule a future value. Restore the desired rates.
3. As a normal user, attempt admin access and confirm rejection. Revoke an admin role while its session is still signed in and verify fresh authorization rejects later writes.
4. Use a known user balance. Run the sample Clean & rank tool: default recipe quote 5; successful receipt 5. Confirm preview/re-download is free and Run again is separately charged. Confirm raw input is absent from ready-run and credit receipt documents.
5. Set insufficient balance; confirm no native processing result/provider call/message is produced. Submit the same ready-tool request ID twice; ensure the second is rejected and balance is not debited again.
6. Run a branching live graph. Quote includes reachable alternatives, actual receipt excludes the skipped branch. Confirm failed nodes refund, retries/per-item charge once, test mode is free by default and the optional paid-native-test policy excludes mocks/pins.
7. On a staging account, run concurrent tool/chat/flow actions and plan/payment/admin edits. Check funds, balances, reset boundaries and unsettled-hold guard against your real database.
8. Kill a staging request after reservation. After ten minutes, load credit activity and inspect recovery. Never-started values should return; uncertain started actions need review, not blind replay. Test archive-write failure separately.
9. Verify Settings-controlled Midnight/Light/Nord/Sepia themes on new quote, receipt and admin surfaces, including a phone-sized viewport. Confirm existing connections and Windows icon fix still work.
10. Send only authorized test messages to destinations you control. Check hosting deadlines and external service permissions before enabling public users or scheduled actions.
