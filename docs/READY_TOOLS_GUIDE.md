# Ready Tools Pro — implementation guide

## Product structure

Ready-made tools are the default Flow landing page. Each tool owns a simple form and a real processor or service adapter. The advanced workflow graph editor is preserved, but visitors do not have to open it. The local tool processors are dedicated pure functions; they do not create, overwrite or execute a user's saved graph implicitly.

Routes:

| Route | Purpose |
| --- | --- |
| `/dashboard/flows` | Searchable library, categories, favorites, recent metadata |
| `/dashboard/flows/tools/[toolId]` | Input form, optional settings, execution and result |
| `/dashboard/flows/workflows` | Existing advanced workflow library/templates |
| `/dashboard/flows/[id]` | Existing graph editor |
| `/dashboard/settings?tab=preferences` | The single application theme control |
| `/dashboard/settings?tab=connections` | OAuth accounts and encrypted API credentials |
| `/dashboard/settings?tab=tools` | Downloads, activity and presets |

## Implemented tools: 23

### Browser-only: 10

Clean & rank a dataset; Duplicate remover; Filter & sort; Email list cleaner; Dataset insights; Column organizer; CSV / Excel / JSON converter; Text cleaner; Word & text counter; JSON formatter.

These run `lib/readyTools/local.mjs` in the browser. Table inputs support file upload, drag-and-drop, copied spreadsheet cells, CSV/TSV and JSON records. Suggestions recognize email and score/rating/points columns. Users can change deduplication keys, case matching, trimming, ranking column, minimum score, ordering and row limits. Cleaning/filters keep rejected rows with reasons. Input objects are cloned rather than mutated.

Dataset insights supports per-column completeness/numeric statistics and grouped totals/averages. Column organizer supports selection, ordering and unique header names. The converter leaves surrounding cell whitespace unchanged by default. Other cleaning tools expose trim settings.

Email checks are syntax checks, not deliverability, consent or mailbox-existence checks. Text statistics use whitespace word boundaries and an approximate reading-time calculation. Ranking uses supplied values and never fabricates an AI score.

### Site-AI tools: 8

Smart summarizer; Rewrite & polish; Translator; Email writer; Social caption studio; Blog outline builder; Meeting to action items; Customer reply assistant.

These call existing `getAvailableProviders`, `routeToProvider`, `PROVIDER_CALLERS` and credit rules. Provider secrets remain server-side. Tone, output language and length are configurable; the caption tool also offers platform selection. Missing provider configuration or insufficient credit returns a real error rather than sample output. Account owners must verify that their configured provider/model combinations and quotas work. This patch does not certify every upstream API or model's current availability.

Existing provider callers now accept an optional fourth `{ signal }` argument; previous three-argument consumers remain valid.

### Connected tools: 5

Google Sheets reader; Send a Gmail message; Slack notification; Discord notification; Telegram message.

Google Sheets is read-only, takes a spreadsheet link/ID and tab name, and returns up to the requested data-row limit and the first 100 columns. The first row is interpreted as headers. Google permissions/scopes, spreadsheet access and API configuration must be valid. There is no direct SQL database connection or arbitrary SQL query tool in this update.

Message tools require destination/content validation and a separate review dialog. The server also requires explicit confirmation. Slack/Discord use saved incoming webhooks; Telegram uses a saved bot token plus chat ID. Google uses the current user's connected account. The OAuth/credential ownership checks prevent selecting another user's saved secret by supplying its ID.

### Existing advanced workflows

Existing native nodes, templates, graph editing, scheduling endpoints and external adapters are retained from the preceding Flow Studio Pro version. Moving the landing page does not change their maturity: previously labeled placeholder connectors remain placeholders. This update does not turn every advanced connector into a production integration.

## Results and reuse

Table/JSON previews, search, sorting, pagination, removed-row review, CSV/JSON/XLSX downloads, text downloads and clipboard copy are implemented. Preview sorting/search is not an export transform: downloads and Copy include all selected result/removed rows in processor order. JSON preview is limited to 100 rows; downloads contain the full result. Tables page at 25 rows.

A compatible result can be passed to another tool through a user-scoped one-use memory handoff, expiring after ten minutes. It is not stored in a URL, localStorage or database. Refreshing/closing the page loses unsaved input/output.

Favorites and up to 20 named option presets persist per account. Presets exclude input content, recipients and connection IDs/secrets. Selected column names and filter values can still be sensitive: do not save secrets in those options. Recent activity stores up to 30 metadata entries, not outputs. Disabling activity does not erase older entries; Clear activity does.

## Theme and settings

The original SettingsContext and `html[data-theme]` remain the source of theme truth. New tools and advanced canvas surfaces use existing application color variables. The obsolete `mm-studio-theme` preference is no longer read. A Settings shortcut is navigation, not an independent theme control. Reduced-motion settings are reflected in both interfaces.

Settings now waits for an authenticated session before requesting account preferences, refreshes when a session appears, and avoids stale account responses overwriting newer queued preference changes. Account-switch cleanup discards pending updates. Save failures are visible on the theme preferences panel.

## File support and limits

- Input files: CSV, TSV, JSON and `.xlsx`; 5 MB maximum.
- Data bounds: 10,000 rows, 100 columns, 300,000 cells, 30,000 characters per cell.
- Text fields: 30,000 characters. Uploaded text files: 120 KB maximum and the same character cap.
- JSON tables accept an array of objects or an array under `rows`, `data` or `contacts`. Nested values become serialized cell text, not nested spreadsheet structures.
- CSV quotes, multiline cells and BOMs are handled; malformed/ragged input is rejected rather than silently truncated. Duplicate/empty headers are normalized.
- XLSX uses existing JSZip plus browser XML parsing. It reads cached values, not formula calculations, styles, merged-cell presentation or external workbook data. Excel date serials remain numeric. Legacy `.xls`, macro/embedded-object files, encrypted workbooks and ZIP64 are not supported. Save a data-only XLSX or CSV first.
- Workbook ZIP metadata is preflighted for entry counts, sizes, compression methods and expansion ratios. This is a safety measure, not a comprehensive security audit of arbitrary archives.
- Generated XLSX is a simple single-sheet table with a frozen header and autofilter, not a full workbook round-trip. CSV output neutralizes leading spreadsheet formula prefixes; formulas are not intentionally emitted into XLSX cells.
- Original files and saved flow definitions are not overwritten by tool runs.

## Server/API implementation

| Endpoint | Behavior |
| --- | --- |
| `GET /api/ready-tools/workspace` | Current user's settings/favorites/presets/recent metadata |
| `PATCH /api/ready-tools/workspace` | Whitelisted preference and metadata operations |
| `GET /api/ready-tools/capabilities` | Configured AI provider labels/costs and safe connection metadata |
| `POST /api/ready-tools/[toolId]/run` | Authenticated AI/connected execution |

Existing NextAuth and MongoDB connection code are reused. Writes reject cross-site origins/fetch metadata, request bodies are bounded and raw inputs are not stored by these models. Local processors do not send source rows to these endpoints; their optional history sync sends counts/time only.

Three new collections/models:

- `ReadyToolWorkspace`: unique user, preferences, favorites, presets and recent metadata.
- `ReadyToolRun`: user/request-ID deduplication, tool/status/provider/credit metadata; expiry configured at seven days. MongoDB TTL deletion is asynchronous.
- `ReadyToolGate`: one short-lived connected-run lock per user.

Ensure database permissions allow creating these collections and indexes, especially the unique `(user, requestId)` index and TTL expiry index. No existing user/flow collection migration is required by the new schemas. If production disables automatic index creation, create/verify these indexes as part of deployment.

Connected/AI requests use a unique idempotency key, a per-user run gate and a ten-runs-per-minute limit. Service requests receive an 80-second abort signal; the application gate expires after 110 seconds. The route requests a 120-second host duration, but deployment/platform limits may be shorter. These are synchronous requests, not background jobs.

Credits are atomically reserved using a conditional decrement and refunded on handled failure. Database outages/process crashes can interrupt record updates/refunds; there is no distributed transaction or crash reconciliation worker. A provider may accept a message before a network timeout, so uncertain actions are not blindly retried. This is not an exactly-once delivery guarantee.

The encrypted API credential store and safe HTTP allowlists are reused. Do not rotate/change `ENCRYPTION_KEY` as a setup step. Do not put provider keys into client code, public environment variables, presets or downloaded workflow files.

## Launch requirements and boundaries

This patch does not add dependencies and does not modify `.env`, font files, icon files, package.json or the lockfile. It requires the previous Flow Studio Pro patch, the existing NextAuth/MongoDB setup and installed dependencies. Windows icon runtime fixes should stay in place.

Before inviting public users, verify the normal production build, authentication, indexes, credit races, provider quotas/scopes, external message permissions and hosting timeouts with your environment. Load/performance testing, accessibility audits, penetration testing, real OAuth/provider integration tests and cross-browser certification are not part of the automated checks supplied here.

Not included: distributed workers, durable schedules/long waits beyond the preceding engine, collaboration, enterprise SSO, a plugin marketplace, arbitrary SQL databases, PDF/OCR input, every SaaS connector, or guaranteed n8n enterprise parity. The shipped library contains the specific 23 tools listed above, with honest configuration-dependent states.
