# MultiMind Flow Studio Pro

Source upgrade • 1 October 2026 • Flow Studio schema version 2

## What changed

The old Flow list and basic canvas have been replaced with a scoped Flow Studio
interface and a bounded workflow execution engine. Existing chat, authentication,
account connections, and non-Flow dashboard features are retained. This is a
substantial workflow-builder upgrade, not a claim of complete n8n parity or a
production certification.

### Workspace and canvas

The Flow hub has real database-derived counts, searchable workflows, draft / active
/ starred filters, name or modified-date sorting, folders, tags, duplication,
import, template browsing, and credential management. Counts are not fabricated.
Run statistics combine test and live runs and cover up to 2,000 runs from the last
30 days; the UI labels individual execution modes.

The editor offers dark and light themes, a searchable categorized node library,
drag/drop placement, Bezier connections, named branch handles, node configuration,
selection, graph duplication, copy/paste with remapped internal node references,
50 graph undo/redo snapshots, zoom, fit-view, snap-to-grid, auto-layout, minimap,
sticky notes, command search, edge labels, JSON export, and diagram SVG export.
Node configuration changes participate in graph history. Workflow metadata such
as its name and folder is not part of graph-only undo.

Autosave is debounced, saves are serialized, and revisions prevent silent
last-write-wins overwrites between tabs. The editor flushes pending changes before
execution. A rejected save displays an error and offers draft export. This is
conflict detection, not real-time collaborative editing or automatic merge.

### Engine, branches, and data

The engine executes a directed acyclic graph in dependency layers, with up to six
parallel ready steps. An inactive branch does not incorrectly deactivate a shared
merge. Each step receives all active predecessor outputs; ordinary nodes use the
first input and the Merge node combines them explicitly.

IF nodes expose true and false handles. Switch nodes expose configured case names
and a default handle. Error behavior can stop the workflow, continue with explicit
error data, or use a dedicated error output. Retries are configurable, and timeouts
are deliberately not retried automatically because a remote side effect might
already have completed. Native nodes, external fixtures, disabled nodes, skipped
branches, and pinned data are labeled in logs.

Data tools cover field mapping, selection/removal, JSON parse/stringify, filtering,
sorting, limiting, deduplication, splitting nested arrays, batching, per-item
mapping, aggregate statistics, merging, renaming, text operations, timestamps and
UUIDs. Prepare Items extracts an array; it is not a back-edge loop. Enable
"Once per item" on the downstream node to iterate. Branching nodes cannot use
per-item execution. On a retried per-item step, previously completed items may run
again; use idempotent APIs and keep retries at zero for non-idempotent actions.

The expression language intentionally supports paths and one fallback, not
arbitrary JavaScript:

```text
{{ $json.email }}
{{ $json.customer.score }}
{{ $json.items[0].name }}
{{ $vars.brand }}
{{ $node.node_1.email }}
{{ $input.all }}
{{ $item.name }}
{{ $index }}
{{ $run.startedAt }}
{{ $json.name ?? "Guest" }}
```

A whole expression preserves its value type; an expression inside a string is
interpolated as text. Put spaces around `??`. Objects in JSON parameter fields are
parsed before expression evaluation. Prototype traversal and arbitrary evaluation
are rejected. Use node IDs, not display labels, in `$node` references.

### Test, live, history, and versions

Test mode executes native transformations but mocks external actions. It never
sends real email, publishes content, or calls a paid provider. Test fixtures can
be pinned and inspected. Live mode ignores pins, requires configured services,
and rejects known placeholder connectors. A successful test is not proof that
credentials, service permissions, recipients, or external payloads work live.

The node inspector shows input/output as JSON or a small table. Test-to-step runs
only the selected node's ancestor subgraph. The execution console exposes step
status, attempts, errors, durations and outputs; server logs are polled while a
request is running. Cancellation is cooperative. An already-issued third-party
request may complete even after cancellation, especially with inherited providers.

Server run history is persisted in MongoDB. Named checkpoints and publish snapshots
retain the most recent 25 versions. Restores open as drafts; they do not immediately
activate external actions. The sandbox stores its graph, 20 runs and 25 checkpoints
in browser local storage only. Clearing browser data removes these sandbox records.
Checkpoint snapshots are not a Git repository, audit-signing service, or visual diff.

### AI and external integrations

The AI builder asks the existing MultiMind text provider for a supported graph
of up to 20 nodes, validates its structure, and presents a draft for review. It
does not automatically run generated actions. AI Prompt, Classifier and Summarizer
nodes use the existing text-provider routing. This upgrade does not independently
verify the existing providers' current model availability.

The catalog contains 56 entries: 29 native tools, 17 integration definitions with
executor paths, and 10 inherited placeholders. The native count includes Sticky
Note, which does not execute. Integration paths include HTTP, Slack webhooks,
Discord webhooks, Telegram messages, Google email, existing Google Drive / Sheets
and document-extraction actions, existing text generation, and existing Facebook /
Instagram publishing. These require user-owned credentials, provider permissions,
and valid external inputs. No real-service credentials were supplied for testing.

The inherited placeholder entries remain visible to preserve old graphs but are
explicitly blocked in live mode: New DM / Comment trigger, AI Image Generation,
Instagram Story / Reply / DM, Facebook Reply / Message, WhatsApp Send / Template,
and TikTok Upload. Their presence is not a claim of working integrations.

There are 12 templates in total: 9 new templates and the original 3. New templates
include lead qualification, dataset cleanup, API reporting, AI content review,
support routing, error recovery, item transformations, team digest and multichannel
notification. Setup-required templates need configuration before live use. A
"pending review" data field is a draft marker, not a durable human-approval pause.

## Install and upgrade

Use Node.js 22.7 or newer for the included dependency-free test runner; verification
used Node.js 22.16.0. Keep the lockfile and use the existing dependency versions.
No new npm package was required for this upgrade.

For an existing installation, back up the database and project. Keep your original
`.env.local`, including the exact existing `ENCRYPTION_KEY`; never generate a new
key over an existing one. Retain the original `public/fonts/` asset folder for the
unchanged Arabic PDF-export feature. This source archive does not redistribute
font binaries. Do not copy old `node_modules` or `.next` build artifacts.

For a fresh installation, copy `.env.example` to `.env.local`, fill in MongoDB and
NextAuth settings, and generate separate strong secrets. For example, this command
prints a new 32-byte hex secret; use different generated values for different roles:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Then:

```bash
npm ci
npm run dev
```

Use `http://localhost:3000/dashboard/flows` after signing in. The public test-only
sandbox is at `http://localhost:3000/flow-studio`. It still uses the Next.js app
server and must be loaded before its browser-local engine is available.

For production, run `npm run build` and `npm start` in your deployment environment.
Dependencies and Google fonts need network access during installation/build. Apply
your normal authentication, hosting, backups, security review and provider setup;
this package does not configure those services on your behalf.

### Credentials and outbound HTTP

`ENCRYPTION_KEY` must be 64 hexadecimal characters. New Flow credentials are stored
using the existing AES-256-GCM helper and scoped to their owner's user ID. The list
API never returns their plaintext. Types: bearer token, basic username:password,
custom header, Slack webhook URL, Discord webhook URL, and Telegram bot token.
Google services continue to use existing account connections. Encryption is at
rest, not end-to-end; the server must decrypt secrets to call providers.

Never embed a token in a node's URL, JSON, pinned data, variable, name or note.
Portable exports remove credential references and common secret-named fields,
including nested JSON fields, but this is not a general data-loss-prevention tool.
Review an export before sharing it. Logs can contain personal or business data;
configure database access and retention for your deployment. Run-history retention
is not automatic; only checkpoint retention and list pagination are bounded.

For generic HTTP Request nodes, set exact public DNS hostnames:

```dotenv
FLOW_HTTP_ALLOWED_HOSTS=api.yourcompany.com,api.yourcrm.com
```

No wildcard hostnames, HTTP scheme, arbitrary ports, IP literals or redirects are
supported. Requests must use HTTPS on port 443. Private/reserved IP ranges are
blocked; all resolved addresses are checked and the checked address is pinned to
the request. Request bodies are capped at 256 KB and responses at 1 MB. Slack,
Discord and Telegram use fixed approved service hosts. These controls apply to
the new outbound helper, not a retrofit security audit of every inherited provider.

### Authenticated incoming webhooks

Add a Webhook trigger, test the graph, configure any live actions, and activate it.
Generate or rotate its bearer token in Settings. Copy the token immediately; the
server stores only a SHA-256 digest and the plaintext is returned once. Rotation
invalidates the previous token.

Example from a trusted sender:

```bash
curl -X POST "https://YOUR_HOST/api/flow-hooks/FLOW_ID" \
  -H "Authorization: Bearer YOUR_WEBHOOK_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Ayesha","score":86}'
```

Payloads are JSON objects, up to 1 MB. Active workflows only; at least five seconds
between accepted webhook requests per flow. The endpoint awaits the bounded run
and returns its ID and status, not arbitrary internal outputs. The token is bearer
authentication, not a provider-signature verifier. There is no generic replay
signature or provider-specific webhook challenge implementation.

### Schedules and deployment

Daily and weekly schedule triggers use an IANA timezone, default Asia/Karachi.
Configure an external scheduler to call the following endpoint with the secret:

```bash
curl "https://YOUR_HOST/api/cron/flows" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

`CRON_SECRET` is required; both this endpoint and the existing Drive poll fail closed
when it is missing. The original `vercel.json` Drive-poll schedule is retained.
The new scheduler is not silently installed. An optional example configuration is
in `docs/vercel.flow-cron.example.json`; adapt its cadence to your hosting plan.
Never run two independent schedulers unintentionally.

Each invocation claims at most one due flow. With multiple due workflows, invoke
again or adjust scheduler frequency; a single-minute schedule does not imply all
workflows execute simultaneously. The next occurrence is advanced before running,
so a failed or crashed scheduled attempt is not automatically replayed. A locked
flow can miss that occurrence. This is best-effort scheduling, not a durable job
queue or exactly-once delivery guarantee. Configure an external durable worker
before using this for business-critical time-sensitive workflows.

Server routes request a maximum duration of 120 seconds. The engine's own execution
budget is 90 seconds; the host can impose a lower cap. Database operations and
inherited third-party calls may have independent timeout behavior. Configure your
host accordingly and keep workflows short.

### Data model and compatibility

Existing Flow documents gain optional/default fields such as revision, tags,
settings and execution locks. New collections store FlowVersion and FlowCredential
documents. FlowRun stores richer logs, mode, cancellation flags and summaries.
No destructive migration is provided or required for normal existing graphs.
Back up the database first and restart the server after updating Mongoose schemas.

Old minute-based Delay configurations are retained as the corresponding number of
seconds, not silently shortened. Inline waits over 10 seconds now fail explicitly;
replace those with appropriate scheduling/worker design. Old simulated nodes no
longer produce misleading successful live runs. Graph exports use MultiMind schema
version 2; this is not an n8n JSON importer.

## Current bounds

| Resource | Bound |
|---|---:|
| Nodes per workflow | 200 |
| Connections per workflow | 500 |
| Workflow/request payload | 1 MB |
| Parallel ready steps | 1–6 |
| Active runs per workflow | 1 |
| Engine execution budget | up to 90 seconds |
| Per-node timeout | up to 30 seconds |
| Inline delay | up to 10 seconds |
| Node retries | 0–3 |
| Native array processing | up to 1,000 items |
| Per-item execution | up to 100 items |
| Saved graph undo snapshots | 50 |
| Retained checkpoints | 25 |
| Log input/output truncation threshold | 32,768 serialized characters each |

Truncation limits logged representations, not the entire in-memory graph. Monitor
server memory and add deployment-level rate limits, quotas and retention policy.
Do not expose an unaudited installation to untrusted multi-tenant traffic.

## Keyboard and editor notes

Ctrl/Cmd+K opens the command center. Ctrl/Cmd+S saves. Ctrl/Cmd+Enter starts a test,
not a live run. Ctrl/Cmd+Z and Shift+Ctrl/Cmd+Z undo/redo graph changes; Ctrl/Cmd+Y
also redoes. Ctrl/Cmd+D duplicates selected nodes. Ctrl/Cmd+C/V copies/pastes a
selected subgraph inside the editor. Ctrl/Cmd+A selects nodes. Delete/Backspace
removes selected graph elements when an input is not focused. F fits the canvas,
N adds a note, and ? opens the shortcut dialog. Right/middle mouse drag pans;
left drag selects. Drag from explicit output handles to connect nodes.

## Acceptance checklist on your machine

1. Install dependencies; run `npm run test:flows`, then `npm run build`.
2. Open the sandbox and test the default lead with scores 86 and 30. Verify exactly
   one branch is skipped and the shared merge still runs.
3. Change a node parameter, undo/redo, duplicate a subgraph, export/import a graph,
   auto-layout, switch themes and test desktop/mobile widths.
4. In a signed-in workspace, create/save/reload a flow. Edit it in two tabs and
   verify that a stale revision produces a conflict instead of silent overwrite.
5. Save a checkpoint, change the graph, restore as draft, and rerun a test.
6. Add a credential on a test account; verify the list response omits its secret.
   Use a harmless allowlisted HTTPS endpoint before trying message/post actions.
7. Verify a wrong webhook bearer token fails; activate a native-only flow and send
   an authorized request. Check rate-limit behavior and run history.
8. Invoke the cron route without and with authorization, using a due test schedule.
   Validate hosting timeout behavior and inspect server logs.
9. Use test destinations for the first real email, social post, webhook notification
   and AI request. Service availability and billing must be checked separately.

## Explicitly not implemented

There is no distributed worker queue, crash-resumable long wait, durable human
approval, arbitrary-code sandbox, reusable subworkflow runtime, full Git integration,
real-time multi-user collaboration, enterprise team RBAC, community-node marketplace,
complete third-party connector coverage, or n8n-format migration. General back-edge
loops are rejected. A Flow Studio release can be visually richer and much more
capable than the original application without claiming these absent features.

## Source map

`components/flows/pro/` contains the hub, editor, inspector, panels, node/edge views
and scoped stylesheet. `lib/flowPro/` contains the portable engine, graph validation,
expressions, native nodes, schedules, templates, SSRF-aware HTTP helper, authenticated
server helpers and external adapters. `lib/flowNodes/runFlow.js` bridges the engine
to MongoDB and the existing connectors. `app/api/flows/`, `app/api/flow-credentials/`,
`app/api/flow-hooks/` and `app/api/cron/flows/` expose the server endpoints.

The generated change inventory is in `CHANGE_MANIFEST.json` at the project root.
