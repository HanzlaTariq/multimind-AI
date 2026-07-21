import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Conversation from "@/models/Conversation";
import User from "@/models/User";
import { routeToProvider } from "@/lib/providers";
import { creditsForPlan } from "@/lib/plans";

const BASE_SYSTEM_PROMPT = `You are a helpful, accurate assistant used inside a comparison tool, so quality and correctness matter a lot.

Rules:
- Reply in the same language and script the user used (English, Roman Urdu/Hindi, Urdu script, etc). If the user writes in Roman Urdu/Hinglish, understand it as natural conversational language rather than parsing words as literal English terms or names (e.g. "kia hall ha" / "kya haal hai" means "how are you", not a person's name).
- If the question is casual conversation (greetings, small talk), respond naturally and briefly in kind.
- If the question is technical (code, math, science, etc), give a precise, correct, working answer. For code, make sure it actually runs and follows best practices for the language/framework implied.
- Remember and use earlier context from this conversation (e.g. the user's name, preferences, or things they told you) when relevant.
- If you are unsure or a question is ambiguous, briefly ask what's meant rather than guessing something unrelated.
- When explaining a process, flow, architecture, hierarchy, or relationship between steps/entities, include a Mermaid diagram in a \`\`\`mermaid code block if it would genuinely help understanding — don't force one into purely conversational or simple factual answers.
- Be concise. Avoid unnecessary preamble.`;

function buildSystemPrompt(profile) {
  if (!profile) return BASE_SYSTEM_PROMPT;

  const lines = [];
  if (profile.preferredName) lines.push(`The user's preferred name is "${profile.preferredName}" — address them by it when it feels natural.`);
  if (profile.role) lines.push(`The user's background: ${profile.role}. Calibrate technical depth accordingly.`);
  if (profile.customInstructions) lines.push(`Additional instructions from the user: ${profile.customInstructions}`);

  if (lines.length === 0) return BASE_SYSTEM_PROMPT;

  return `${BASE_SYSTEM_PROMPT}\n\nPersonalization for this user:\n${lines.join("\n")}`;
}

// history: array of { prompt, answer } from earlier turns in this conversation

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

async function callGroq(prompt, history, systemPrompt) {
  const start = Date.now();
  try {
    const messages = [{ role: "system", content: systemPrompt }];
    for (const h of history) {
      messages.push({ role: "user", content: h.prompt });
      if (h.answer) messages.push({ role: "assistant", content: h.answer });
    }
    messages.push({ role: "user", content: prompt });

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message || "Groq request failed");
    const text = data?.choices?.[0]?.message?.content || "";
    return { model: "groq", text, latencyMs: Date.now() - start, status: "ok" };
  } catch (err) {
    return {
      model: "groq",
      text: err.message || "Groq failed to respond",
      latencyMs: Date.now() - start,
      status: "error",
    };
  }
}

async function callDeepSeek(prompt, history, systemPrompt) {
  const start = Date.now();
  try {
    const messages = [{ role: "system", content: systemPrompt }];
    for (const h of history) {
      messages.push({ role: "user", content: h.prompt });
      if (h.answer) messages.push({ role: "assistant", content: h.answer });
    }
    messages.push({ role: "user", content: prompt });

    const res = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message || "DeepSeek request failed");
    const text = data?.choices?.[0]?.message?.content || "";
    return { model: "deepseek", text, latencyMs: Date.now() - start, status: "ok" };
  } catch (err) {
    return {
      model: "deepseek",
      text: err.message || "DeepSeek failed to respond",
      latencyMs: Date.now() - start,
      status: "error",
    };
  }
}

// Placeholder providers — inactive until their API key is set in .env, at
// which point the router will automatically start picking them for
// well-suited prompts. Model names below are current as of early 2026 and
// may need updating if the provider renames/retires them.

async function callGrok(prompt, history, systemPrompt) {
  const start = Date.now();
  try {
    const messages = [{ role: "system", content: systemPrompt }];
    for (const h of history) {
      messages.push({ role: "user", content: h.prompt });
      if (h.answer) messages.push({ role: "assistant", content: h.answer });
    }
    messages.push({ role: "user", content: prompt });

    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROK_API_KEY}`,
      },
      body: JSON.stringify({
        model: "grok-2-latest",
        messages,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message || "Grok request failed");
    const text = data?.choices?.[0]?.message?.content || "";
    return { model: "grok", text, latencyMs: Date.now() - start, status: "ok" };
  } catch (err) {
    return {
      model: "grok",
      text: err.message || "Grok failed to respond",
      latencyMs: Date.now() - start,
      status: "error",
    };
  }
}

async function callOpenAI(prompt, history, systemPrompt) {
  const start = Date.now();
  try {
    const messages = [{ role: "system", content: systemPrompt }];
    for (const h of history) {
      messages.push({ role: "user", content: h.prompt });
      if (h.answer) messages.push({ role: "assistant", content: h.answer });
    }
    messages.push({ role: "user", content: prompt });

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message || "ChatGPT request failed");
    const text = data?.choices?.[0]?.message?.content || "";
    return { model: "openai", text, latencyMs: Date.now() - start, status: "ok" };
  } catch (err) {
    return {
      model: "openai",
      text: err.message || "ChatGPT failed to respond",
      latencyMs: Date.now() - start,
      status: "error",
    };
  }
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

const PROVIDER_CALLERS = {
  gemini: callGemini,
  groq: callGroq,
  deepseek: callDeepSeek,
  grok: callGrok,
  openai: callOpenAI,
  claude: callClaude,
};

function buildEffectivePrompt(prompt, attachment) {
  if (!attachment?.content) return prompt;

  const MAX_CHARS = 60000;
  const content =
    attachment.content.length > MAX_CHARS
      ? attachment.content.slice(0, MAX_CHARS) + "\n\n[...truncated, file too long...]"
      : attachment.content;

  return `The user attached a file named "${attachment.name}". Here are its contents:\n\n\`\`\`\n${content}\n\`\`\`\n\nUser's message: ${
    prompt?.trim() || "Please review this file and point out anything that should be fixed."
  }`;
}

const MS_PER_MONTH = 30 * 24 * 60 * 60 * 1000;

export async function POST(req) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return Response.json({ error: "You must be signed in" }, { status: 401 });
  }

  const { prompt, conversationId, attachment, temporary, clientHistory } = await req.json();

  if ((!prompt || !prompt.trim()) && !attachment?.content) {
    return Response.json({ error: "Prompt cannot be empty" }, { status: 400 });
  }

  await dbConnect();

  const user = await User.findById(session.user.id);
  if (!user) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  // Reset credits if a new monthly period has started
  const now = new Date();
  const lastReset = user.creditsResetAt ? new Date(user.creditsResetAt) : null;
  if (!lastReset || now - lastReset > MS_PER_MONTH) {
    user.credits = creditsForPlan(user.plan);
    user.creditsResetAt = now;
    await user.save();
  }

  const systemPrompt = buildSystemPrompt(user);
  const effectivePrompt = buildEffectivePrompt(prompt, attachment);

  // Smart routing: pick ONE best-fit model for this prompt (among providers
  // whose API key is configured), affordable within the user's remaining
  // credits — rather than calling every model on every message.
  const chosenProvider = routeToProvider(effectivePrompt, { maxCredits: user.credits });

  if (!chosenProvider) {
    const reason =
      user.credits <= 0
        ? "You're out of credits for this period. Upgrade your plan or wait for your next monthly reset."
        : "No AI providers are currently configured on the server.";
    return Response.json({ error: reason }, { status: 402 });
  }

  // Load prior turns so the model has memory of this conversation. In
  // temporary mode nothing is persisted, so history comes from the client
  // instead of the database.
  let history = [];
  let existingConversation = null;

  if (temporary) {
    history = Array.isArray(clientHistory) ? clientHistory : [];
  } else if (conversationId) {
    existingConversation = await Conversation.findOne({
      _id: conversationId,
      user: session.user.id,
    });
    if (existingConversation) {
      history = existingConversation.turns.map((t) => ({
        prompt: t.prompt,
        answer: t.best?.text || "",
      }));
    }
  }

  const trimmedHistory = history.slice(-10);

  const caller = PROVIDER_CALLERS[chosenProvider.id];
  const result = await caller(effectivePrompt, trimmedHistory, systemPrompt);

  const best =
    result.status === "ok" && result.text && result.text.trim()
      ? result
      : {
          model: "multimind",
          text: `${chosenProvider.label} is unavailable right now. Please try again in a moment.`,
          latencyMs: result.latencyMs || 0,
          status: "error",
        };

  // Only charge credits for a successful response
  if (best.status === "ok") {
    user.credits = Math.max(0, user.credits - chosenProvider.creditCost);
    await user.save();
  }

  const turn = {
    prompt: prompt?.trim() || `Review ${attachment?.name || "this file"}`,
    attachmentName: attachment?.name || "",
    responses: [result],
    best,
    createdAt: new Date(),
  };

  if (temporary) {
    return Response.json({ conversationId: null, turn, temporary: true, creditsRemaining: user.credits });
  }

  let conversation = existingConversation;
  if (conversation) {
    conversation.turns.push(turn);
    await conversation.save();
  } else {
    conversation = await Conversation.create({
      user: session.user.id,
      title: turn.prompt.slice(0, 60),
      turns: [turn],
    });
  }

  return Response.json({
    conversationId: conversation._id.toString(),
    turn,
    creditsRemaining: user.credits,
  });
}