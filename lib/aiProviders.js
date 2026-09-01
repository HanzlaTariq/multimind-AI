// One caller function per AI provider, each with the same signature:
// (prompt, history, systemPrompt) -> { model, text, latencyMs, status }.
//
// This used to live only inside app/api/chat/route.js. It's pulled out
// here so Flows' AI nodes (lib/flowNodes/registry.js) can call the exact
// same providers the chat feature uses, instead of a second hand-rolled
// implementation drifting out of sync with this one. chat/route.js now
// imports PROVIDER_CALLERS from here too — behavior is unchanged, this is
// a pure extraction.

async function callGemini(prompt, history, systemPrompt) {
  const start = Date.now();
  try {
    const contents = [];
    for (const h of history) {
      contents.push({ role: "user", parts: [{ text: h.prompt }] });
      if (h.answer) contents.push({ role: "model", parts: [{ text: h.answer }] });
    }
    contents.push({ role: "user", parts: [{ text: prompt }] });

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents,
        }),
      }
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message || "Gemini request failed");
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    return { model: "gemini", text, latencyMs: Date.now() - start, status: "ok" };
  } catch (err) {
    return {
      model: "gemini",
      text: err.message || "Gemini failed to respond",
      latencyMs: Date.now() - start,
      status: "error",
    };
  }
}

// Groq, DeepSeek, Grok, and ChatGPT all speak the same OpenAI-style
// chat-completions format, so a single generic caller covers all four —
// only the endpoint URL, model name, API key, and result label differ.
async function callOpenAICompatible({ modelLabel, url, model, apiKey }, prompt, history, systemPrompt) {
  const start = Date.now();
  try {
    const messages = [{ role: "system", content: systemPrompt }];
    for (const h of history) {
      messages.push({ role: "user", content: h.prompt });
      if (h.answer) messages.push({ role: "assistant", content: h.answer });
    }
    messages.push({ role: "user", content: prompt });

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model, messages }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message || `${modelLabel} request failed`);
    const text = data?.choices?.[0]?.message?.content || "";
    return { model: modelLabel, text, latencyMs: Date.now() - start, status: "ok" };
  } catch (err) {
    return {
      model: modelLabel,
      text: err.message || `${modelLabel} failed to respond`,
      latencyMs: Date.now() - start,
      status: "error",
    };
  }
}

function callGroq(prompt, history, systemPrompt) {
  return callOpenAICompatible(
    {
      modelLabel: "groq",
      url: "https://api.groq.com/openai/v1/chat/completions",
      model: "openai/gpt-oss-120b",
      apiKey: process.env.GROQ_API_KEY,
    },
    prompt,
    history,
    systemPrompt
  );
}

function callDeepSeek(prompt, history, systemPrompt) {
  return callOpenAICompatible(
    {
      modelLabel: "deepseek",
      url: "https://api.deepseek.com/chat/completions",
      model: "deepseek-chat",
      apiKey: process.env.DEEPSEEK_API_KEY,
    },
    prompt,
    history,
    systemPrompt
  );
}

// Placeholder providers — inactive until their API key is set in .env, at
// which point the router will automatically start picking them for
// well-suited prompts. Model names below are current as of early 2026 and
// may need updating if the provider renames/retires them.

function callGrok(prompt, history, systemPrompt) {
  return callOpenAICompatible(
    {
      modelLabel: "grok",
      url: "https://api.x.ai/v1/chat/completions",
      model: "grok-2-latest",
      apiKey: process.env.GROK_API_KEY,
    },
    prompt,
    history,
    systemPrompt
  );
}

function callOpenAI(prompt, history, systemPrompt) {
  return callOpenAICompatible(
    {
      modelLabel: "openai",
      url: "https://api.openai.com/v1/chat/completions",
      model: "gpt-4o-mini",
      apiKey: process.env.OPENAI_API_KEY,
    },
    prompt,
    history,
    systemPrompt
  );
}

async function callClaude(prompt, history, systemPrompt) {
  const start = Date.now();
  try {
    const messages = [];
    for (const h of history) {
      messages.push({ role: "user", content: h.prompt });
      if (h.answer) messages.push({ role: "assistant", content: h.answer });
    }
    messages.push({ role: "user", content: prompt });

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 2048,
        system: systemPrompt,
        messages,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message || "Claude request failed");
    const text = data?.content?.find((c) => c.type === "text")?.text || "";
    return { model: "claude", text, latencyMs: Date.now() - start, status: "ok" };
  } catch (err) {
    return {
      model: "claude",
      text: err.message || "Claude failed to respond",
      latencyMs: Date.now() - start,
      status: "error",
    };
  }
}

export const PROVIDER_CALLERS = {
  gemini: callGemini,
  groq: callGroq,
  deepseek: callDeepSeek,
  grok: callGrok,
  openai: callOpenAI,
  claude: callClaude,
};