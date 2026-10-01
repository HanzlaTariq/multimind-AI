# Automation credits — implementation and deployment

## Scope and compatibility

This patch layers admin-priced logical-node billing onto Ready Tools Pro and Flow Studio Pro. It reuses User.credits, User.creditsResetAt, PlanConfig, ToolCreditConfig, the existing admin UI/navigation and saved account connections. It adds no dependency, new payment gateway, second wallet or theme system. Apply it over the previous Ready Tools Pro update, not over an unrelated branch without merging changes.

All 23 ready tools run through authenticated server authorization. The 10 pure data/text processors retain their function name `runLocalTool`, but ToolRunner no longer imports or invokes that processor in the browser. Browser parsing/preview and export remain client-side. Server requests are capped at 12 MiB; the preceding file/row/cell/text bounds still apply.

## Pricing model

`lib/automationCredits/config.js` derives 63 pricing rows from supported node definitions and ready-tool operations. `flow-node:<type>` rows are inserted with `$setOnInsert` and cost 1. Notes and planned placeholders are excluded. Existing row overrides are not reset by startup. Missing legacy document/PDF/TTS rows are independently initialized even if automation prices were created first.

Costs are integer credits from 0 to 10,000. Scheduled values are read when their effective timestamp is reached, without relying on an instance-local cache for automation pricing. Each run snapshots its quote. The existing per-row admin save API supports immediate or future-dated values. Bulk replacement affects only automation keys, clears their pending scheduled changes and requires confirmation. It does not change document rates or provider fees charged by upstream services.

`AutomationCreditPolicy` holds charging enabled, paid-native-tests enabled, maximum run reservation and revision. Default charging is on, tests are free, maximum reservation is 10,000. Disabling billing makes future quotes zero; it does not retroactively reprice active reservations.

### What counts as a node

Advanced workflows charge once for a logical node that is reached and started. Triggers count. Internal retry attempts and bounded per-item iterations are included in that node price; this is not token, request or per-row billing. Successful nodes are charged; confirmed failed nodes are refunded. Notes, disabled nodes, disconnected nodes, inactive branches and nodes beyond a selected execution target are not charged. External mock fixtures and pinned test data remain free even under paid-native-tests policy. The independent browser sandbox remains free and is not a secure paid execution service.

Ready data tools compose priced operations selected by actual options. Clean/rank with the sample defaults uses whitespace cleaning, deduplication, minimum filtering, sorting and limiting: 5 default credits. Disabling an optional operation changes the quote. This ready-tool recipe does not implicitly create an advanced saved graph or bill a graph trigger. A completed ready-tool recipe charges all its selected operations; if that single processor rejects input, its started recipe operations are refunded together.

Each AI ready tool, connected tool and AI workflow draft has its own single operation price. AI provider callers do not debit again; the automation meter is the only wallet charge for these calls. Generating a draft and executing its nodes are separate actions and separate quotes. Choose prices that cover your own provider costs, particularly for per-item external calls. The system does not estimate your actual provider invoice.

## Reservation and settlement

The current reachable graph (or target ancestors/seeded trigger branch) is quoted conservatively, including every possible reachable branch. The user needs enough **available credits for that upper bound**, not just the eventual selected path. UI supplies `maxCredits`; the server calculates all prices itself and rejects a price increase beyond the accepted budget. Automated triggers use current server pricing and the global cap without an interactive quote.

A conditional User update debits the reservation and appends a bounded hidden hold on the same document. Conditions include available funds, account status, reset-cycle marker, request uniqueness and fewer than eight active holds. Start/finish events update the hold's units and revision. The same document holds the existing balance, active holds and recent settlement journal; no multi-document transaction or replica-set transaction is required by this design.

Settlement compares both hold revision and reset-cycle marker, returns unused money with `$inc`, removes the hold and adds a recent receipt in one User update. A racing node outcome or reset causes a reread. Closing again returns the earlier receipt rather than refunding again. Reservation startup honors the existing plan/reset calculation using compare-and-set updates. This patch does not rewrite every legacy chat/payment/reset route; run cross-feature concurrency tests before production.

The admin User balance/plan endpoint refuses absolute balance replacement while a hold is unsettled. A plan change advances the reset-cycle marker. This avoids a later automation refund unexpectedly adding to an administrator's newly assigned balance.

### Crash and timeout boundaries

Holds expire after ten minutes; normal workflows remain bounded to 90 seconds. Opening a credit quote, balance or activity endpoint reconciles expired holds. It is lazy recovery, not a scheduler or durable worker. Nothing resumes or replays an external action. Confirmed-failed and never-started units are returned; started/uncertain units stay charged for manual review. A timeout is not proof that a remote send failed. Same-cycle unused credits are refunded; unused credits from an old allowance cycle are marked expired instead of being added to the fresh allowance.

The receipt journal retains the most recent 20 settlements on User. It is mirrored to `AutomationCreditReceipt` after the wallet commit. Archive failures cannot undo the committed balance or turn a delivered action into a retryable false failure. The journal is retried on subsequent credit requests. A prolonged archive outage spanning more than 20 later settlements can lose detailed archive entries; this is not an immutable payment-grade ledger or an audit-completeness guarantee. Monitor database errors and back up your database. Do not delete holds manually to recover money.

Existing ready-tool request-ID deduplication and per-user gate are retained and now apply to all 23 tools. Ready data tools are limited to 30 requests/minute; AI/connected tools to 10. The draft endpoint uses unique request IDs and the existing run collection. Existing ready request IDs expire after seven days. A later intentional new request is a new billable run. Workflow runs preserve their per-flow lock, not a general exactly-once HTTP contract. External side effects can still duplicate if a user intentionally retries an uncertain send; confirmation and review are essential.

## Security and privacy

Admin authorization rechecks current `isAdmin` and banned state in MongoDB rather than trusting an old session flag. Quotes and receipts are scoped to the authenticated owner. Flow runs invoked by a webhook, schedule or Drive poll bill that flow owner. Wallet costs cannot be supplied by the browser; client budget is only a maximum. New write routes reject cross-site origin/fetch metadata and use bounded JSON parsing.

Pricing/receipt models do not deliberately store raw inputs, generated output, recipients or secrets. They do contain user IDs, run IDs, labels, times, prices and outcomes. User-chosen flow/node labels can contain sensitive text; users should not put secrets in labels. Tool presets and advanced workflow logs have separate, existing storage behavior. Turning off ready-tool activity does not erase accounting receipts. No browser-only privacy claim applies to charged server execution.

Secrets remain in existing server configuration or encrypted owned connections. Theme stays in SettingsContext and the existing global theme attributes. No public provider key, encryption-key rotation, password reset or font change is introduced.

## Files, data and endpoints

New models: AutomationCreditPolicy and AutomationCreditReceipt. Additive hidden User fields: automationCreditHolds and automationCreditReceipts. FlowRun and ReadyToolRun gain billing metadata; existing documents require no destructive migration. The archive is indexed by user/time; its unique string ID combines owner and reservation key.

| Endpoint | Purpose |
|---|---|
| POST /api/ready-tools/[toolId]/quote | Options-based ready-tool breakdown + balance |
| POST /api/ready-tools/[toolId]/run | Server execution, budget check and metering |
| POST /api/flows/[id]/quote | Reachable graph upper bound + balance |
| POST /api/flows/[id]/run | Metered manual execution |
| GET/POST /api/flows/blueprint | Draft price / metered AI draft |
| GET /api/automation-credits | Owner's latest 50 receipts and available/reserved balance |
| GET/PATCH /api/admin/automation-credits | Current admin policy, bulk prices, latest 50 receipts, seven-day totals |
| GET/PATCH existing admin tool-cost routes | Shared per-node and document price management |

Admin UI: `/admin/tool-costs` → Workflows & ready tools. User receipts: `/dashboard/flows/credits`. The current receipt screens show the latest 50, not paginated full audit history or payment transactions. Corrections use existing Admin → Users credit controls after pending runs finish; they are not automatic refunds initiated by the receipt screen.

Ensure production DB permissions permit index/collection creation or create the declared indexes explicitly. Never drop existing collections to install this patch. Existing `.env`, keys, fonts, package.json/lockfile and Windows icon patch must remain intact. Restart Next after applying schema updates.

## Production checks still required

Use a staging copy of your actual database and installed application. Verify compilation and browser rendering, real MongoDB casting/arrayFilters/index behavior, simultaneous balance consumers (including chat/payment/admin operations), plan resets, pricing schedules across app instances, rejection before external dispatch on insufficient funds, failed/uncertain settlement, archive outage recovery and role revocation. Test your real OAuth scopes, provider credentials, webhooks and hosting request limits. Existing request-bound runner limits are unchanged; no durable queue, distributed worker, resumable approval service or all-integrations guarantee is added.

Underlying atomicity reference: MongoDB official single-document write atomicity documentation, https://www.mongodb.com/docs/manual/core/write-operations-atomicity/ ; Mongoose official findOneAndUpdate documentation, https://mongoosejs.com/docs/tutorials/findoneandupdate.html . These explain the database primitives, not proof that this application has passed real-database tests.
