# Phase 8 — Templates & Polish (update)

Drop these files into your project at the same paths (they overwrite/add
onto your existing `multimind-AI-main` — Phases 1–7 code is untouched).

## New files
- `lib/flowTemplates.js` — the built-in template registry. Currently has
  the two templates from the plan: **Daily Auto-Post** (schedule → generate
  caption → post to Instagram) and **Auto-Reply DM** (new DM trigger →
  generate reply → send DM). Adding a new template later = add one object
  to `FLOW_TEMPLATES`, nothing else to touch.
- `components/flows/TemplatePicker.jsx` — the modal shown when you click
  "New flow": pick a template or "Blank flow".
- `components/flows/OnboardingHint.jsx` — a small dismissible coachmark
  that appears the first time someone opens the flow canvas with no nodes
  yet (explains drag → connect → Run). Stored in `localStorage`, never
  shown again once dismissed or once the flow has nodes.

## Changed files
- `app/api/flows/route.js` — `POST` now accepts an optional `templateId`.
  When present, the server looks up the template, stamps out fresh
  `nodeId`/`edgeId` values (via `buildFlowFromTemplate`), and creates the
  flow pre-populated with that node/edge graph. Name/description still
  default from the template but can be overridden by what the user typed.
- `app/dashboard/flows/page.js` — "New flow" now opens the template picker
  first. Picking a template pre-fills the name/description form (still
  editable) and passes `templateId` through on submit. The empty state
  (no flows yet) also opens the picker instead of jumping straight to a
  blank form.
- `app/dashboard/flows/[id]/page.js` — mounts `<OnboardingHint />` over the
  canvas.

## Not included (still open from the plan)
- More templates beyond the two in the plan (easy to add — see above).
- A guided multi-step onboarding *tour* (this is a single coachmark, not a
  spotlight tour) — can be extended later if you want a fuller walkthrough.
- Broader error-handling polish beyond what Phases 1–7 already have
  (toasts, retry banners, etc.) — the existing inline error messages were
  left as-is since they were already in place.
