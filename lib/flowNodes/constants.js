// Small, dependency-free constants shared between server-only code
// (lib/flowNodes/registry.js — pulls in mongoose models, dbConnect,
// etc.) and code that also runs in the browser (lib/flowTemplates.js is
// imported directly by components/flows/TemplatePicker.jsx). Anything
// registry.js and flowTemplates.js both need has to live somewhere
// neither of them would mind the other importing — this file.

// Default prompt for ai.extractStructuredData — pre-filled in the node's
// config (and in the Invoice Parser Agent template) but fully
// user-editable, since the source document could be an invoice, a
// handwritten order slip, a packing list, anything a small business
// receives. Deliberately doesn't hardcode field names like "item name" /
// "unit price": it asks the model to look at what's actually in the
// document and decide the columns itself.
export const DEFAULT_EXTRACTION_PROMPT =
  "This document contains tabular or list-style data (for example: an invoice, order slip, receipt, or price list). " +
  "Look at what's actually in the document and decide the right columns yourself — don't assume a fixed set of fields. " +
  "Return ONLY a JSON array, one object per row, with consistent keys across every object. No prose, no markdown fences, no explanation — JSON only.";
