// Central registry of AI providers MultiMind can route a message to.
//
// To add a new provider later (e.g. once you add GROK_API_KEY,
// OPENAI_API_KEY, or ANTHROPIC_API_KEY to your environment):
//   1. Add its entry below with a credit cost and strength tags.
//   2. Add a matching async call function in app/api/chat/route.js's
//      PROVIDER_CALLERS map (same signature as the existing ones).
// Providers whose API key isn't set are automatically skipped by the router
// — nothing else needs to change.

export const PROVIDERS = [
  {
    id: "groq",
    label: "Groq",
    creditCost: 1,
    tags: ["fast", "casual", "general"],
    envKey: "GROQ_API_KEY",
  },
  {
    id: "gemini",
    label: "Gemini",
    creditCost: 1,
    tags: ["general", "fast", "vision"],
    envKey: "GEMINI_API_KEY",
  },
  {
    id: "deepseek",
    label: "DeepSeek",
    creditCost: 2,
    tags: ["coding", "reasoning"],
    envKey: "DEEPSEEK_API_KEY",
  },
  {
    id: "grok",
    label: "Grok",
    creditCost: 3,
    tags: ["reasoning", "creative", "general"],
    envKey: "GROK_API_KEY",
  },
  {
    id: "openai",
    label: "ChatGPT",
    creditCost: 4,
    tags: ["general", "coding", "reasoning"],
    envKey: "OPENAI_API_KEY",
  },
  {
    id: "claude",
    label: "Claude",
    creditCost: 6,
    tags: ["reasoning", "coding", "writing"],
    envKey: "ANTHROPIC_API_KEY",
  },
];

export function getAvailableProviders() {
  return PROVIDERS.filter((p) => !!process.env[p.envKey]);
}

function classifyPrompt(prompt) {
  const looksLikeCode =
    /```|function\s|class\s|def\s|select\s+\*|<\/?\w+>|error:|exception|stack trace|\.(js|ts|py|jsx|tsx|java|cpp)\b/i.test(
      prompt
    );
  const looksCasual =
    prompt.length < 40 && /\b(hi|hello|hey|thanks|salam|kya haal|kaise ho)\b/i.test(prompt);
  const looksDeep =
    prompt.length > 300 ||
    /\b(explain in detail|analyze|compare|why does|reasoning|proof|architecture)\b/i.test(prompt);

  if (looksLikeCode) return "coding";
  if (looksCasual) return "casual";
  if (looksDeep) return "reasoning";
  return "general";
}

const TAG_PRIORITY = {
  coding: ["coding", "reasoning", "general", "fast"],
  reasoning: ["reasoning", "coding", "general", "fast"],
  casual: ["fast", "casual", "general"],
  general: ["general", "fast", "reasoning"],
};

/**
 * Picks the single best available provider for a prompt, optionally limited
 * to providers the user can currently afford (maxCredits). Returns null if
 * no provider is both configured and affordable.
 */
export function routeToProvider(prompt, { maxCredits } = {}) {
  let available = getAvailableProviders();
  if (typeof maxCredits === "number") {
    available = available.filter((p) => p.creditCost <= maxCredits);
  }
  if (available.length === 0) return null;

  const category = classifyPrompt(prompt);
  const priority = TAG_PRIORITY[category] || TAG_PRIORITY.general;

  for (const tag of priority) {
    const matches = available.filter((p) => p.tags.includes(tag));
    if (matches.length > 0) {
      return matches.sort((a, b) => a.creditCost - b.creditCost)[0];
    }
  }

  return available.sort((a, b) => a.creditCost - b.creditCost)[0];
}