import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Conversation from "@/models/Conversation";

const SYSTEM_PROMPT = `You are a helpful, accurate assistant used inside a comparison tool, so quality and correctness matter a lot.

Rules:
- Reply in the same language and script the user used (English, Roman Urdu/Hindi, Urdu script, etc). If the user writes in Roman Urdu/Hinglish, understand it as natural conversational language rather than parsing words as literal English terms or names (e.g. "kia hall ha" / "kya haal hai" means "how are you", not a person's name).
- If the question is casual conversation (greetings, small talk), respond naturally and briefly in kind.
- If the question is technical (code, math, science, etc), give a precise, correct, working answer. For code, make sure it actually runs and follows best practices for the language/framework implied.
- If you are unsure or a question is ambiguous, briefly ask what's meant rather than guessing something unrelated.
- Be concise. Avoid unnecessary preamble.`;

async function callGemini(prompt) {
  const start = Date.now();
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [{ parts: [{ text: prompt }] }],
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

async function callGroq(prompt) {
  const start = Date.now();
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
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

async function callDeepSeek(prompt) {
  const start = Date.now();
  try {
    const res = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
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

async function judgeBest(prompt, candidates) {
  // candidates: array of { model, text } — only successful ones, length >= 2
  const options = candidates
    .map((c, i) => `Answer ${i + 1} (${c.model}):\n${c.text}`)
    .join("\n\n---\n\n");

  const judgePrompt = `A user asked: "${prompt}"

Here are ${candidates.length} candidate answers from different AI models:

${options}

Reply with ONLY the number of the single best answer (most accurate, complete, and well-written). Reply with just the digit, nothing else.`;

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: judgePrompt }],
        temperature: 0,
        max_tokens: 5,
      }),
    });
    const data = await res.json();
    const raw = data?.choices?.[0]?.message?.content || "";
    const match = raw.match(/\d+/);
    const idx = match ? parseInt(match[0], 10) - 1 : 0;
    if (idx >= 0 && idx < candidates.length) return candidates[idx];
  } catch (err) {
    // fall through to heuristic fallback below
  }

  // Fallback: pick the longest, most substantial answer
  return candidates.reduce((best, c) => (c.text.length > best.text.length ? c : best));
}

export async function POST(req) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return Response.json({ error: "You must be signed in" }, { status: 401 });
  }

  const { prompt, conversationId } = await req.json();

  if (!prompt || !prompt.trim()) {
    return Response.json({ error: "Prompt cannot be empty" }, { status: 400 });
  }

  const [gemini, groq, deepseek] = await Promise.all([
    callGemini(prompt),
    callGroq(prompt),
    callDeepSeek(prompt),
  ]);

  const all = [gemini, groq, deepseek];
  const successful = all.filter((r) => r.status === "ok" && r.text && r.text.trim());

  let best;
  if (successful.length === 0) {
    best = {
      model: "multimind",
      text: "All three models are unavailable right now. Please check your API keys/billing and try again in a moment.",
      latencyMs: 0,
      status: "error",
    };
  } else if (successful.length === 1) {
    best = successful[0];
  } else {
    best = await judgeBest(prompt, successful);
  }

  const turn = {
    prompt,
    responses: all, // full detail kept for history/debugging
    best,
    createdAt: new Date(),
  };

  await dbConnect();

  let conversation;
  if (conversationId) {
    conversation = await Conversation.findOneAndUpdate(
      { _id: conversationId, user: session.user.id },
      { $push: { turns: turn } },
      { new: true }
    );
  }

  if (!conversation) {
    conversation = await Conversation.create({
      user: session.user.id,
      title: prompt.slice(0, 60),
      turns: [turn],
    });
  }

  return Response.json({
    conversationId: conversation._id.toString(),
    turn,
  });
}
