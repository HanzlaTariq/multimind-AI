import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Conversation from "@/models/Conversation";
import Project from "@/models/Project";
import User from "@/models/User";
import { routeToProvider } from "@/lib/providers";
import { creditsForPlan, chargeCreditsAtomic } from "@/lib/plans";

const BASE_SYSTEM_PROMPT = `You are a helpful, accurate assistant used inside a comparison tool, so quality and correctness matter a lot.

Rules:
- Reply in the same language and script the user used (English, Roman Urdu/Hindi, Urdu script, etc). If the user writes in Roman Urdu/Hinglish, understand it as natural conversational language rather than parsing words as literal English terms or names (e.g. "kia hall ha" / "kya haal hai" means "how are you", not a person's name).
- If the question is casual conversation (greetings, small talk), respond naturally and briefly in kind.
- If the question is technical (code, math, science, etc), give a precise, correct, working answer. For code, make sure it actually runs and follows best practices for the language/framework implied.
- Remember and use earlier context from this conversation (e.g. the user's name, preferences, or things they told you) when relevant.
- If you are unsure or a question is ambiguous, briefly ask what's meant rather than guessing something unrelated.
- When explaining a process, flow, architecture, hierarchy, or relationship between steps/entities, include a Mermaid diagram in a \`\`\`mermaid code block if it would genuinely help understanding — don't force one into purely conversational or simple factual answers.
- Be concise. Avoid unnecessary preamble.
- If the user asks for a list, provide it in a clear, numbered or bulleted format.
- If the user asks for a table, provide it in a clear Markdown table format.
- If the user asks for a summary, provide it in a clear, concise paragraph or bullet points.
- If the user asks for a comparison, provide it in a clear, structured format (table or bullet points) highlighting differences and similarities.
- If the user asks for a code snippet, provide it in a clear, properly formatted code block with syntax highlighting.
- If the user asks for a diagram, provide it in a clear Mermaid diagram code block.
- If the user asks for a step-by-step guide, provide it in a clear, numbered list format.
- If the user asks for an explanation of a concept, provide it in a clear, concise paragraph or bullet points.
- If the user asks for a definition, provide it in a clear, concise paragraph or bullet points.
- If the user asks for a translation, provide it in a clear, concise paragraph or bullet points.
- If the user asks for a summary of a document, provide it in a clear, concise paragraph or bullet points.
- If the user asks for a critique or review, provide it in a clear, concise paragraph or bullet points.
- If the user asks for a recommendation, provide it in a clear, concise paragraph or bullet points.
- If the user asks for a plan or strategy, provide it in a clear, concise paragraph or bullet points.
- if the user asks for a joke, provide a light-hearted, appropriate joke in the same language and script they used.
- If the user asks for a riddle, provide a fun, appropriate riddle in the same language and script they used.
- If the user asks for a poem, provide a short, appropriate poem in the same language and script they used.
- If the user asks for a story, provide a short, appropriate story in the same language and script they used.
- If the user engages in dirty talk, vulgar language, sexual harassment, or inappropriate comments (in any language — English, Urdu, Roman Urdu, etc.), do not continue or entertain it. Respond briefly and firmly, in the same language/script they used, setting a clear boundary (e.g. "I'm not going to engage with that — let's keep things respectful. Happy to help with something else."). Do not use insults, profanity, or sexual content of any kind in the response, even as a "roast".
`;

function buildSystemPrompt(profile) {
  if (!profile) return BASE_SYSTEM_PROMPT;

  const lines = [];
  if (profile.preferredName) lines.push(`The user's preferred name is "${profile.preferredName}" — address them by it when it feels natural.`);
  if (profile.role) lines.push(`The user's background: ${profile.role}. Calibrate technical depth accordingly.`);
  if (profile.customInstructions) lines.push(`Additional instructions from the user: ${profile.customInstructions}`);

  if (lines.length === 0) return BASE_SYSTEM_PROMPT;

  return `${BASE_SYSTEM_PROMPT}\n\nPersonalization for this user:\n${lines.join("\n")}`;
}

function buildProjectSystemPrompt(basePrompt, project) {
  if (!project) return basePrompt;

  const sections = [];
  if (project.instructions?.trim()) {
    sections.push(
      `Project instructions (always follow these for every message in this project):\n${project.instructions.trim()}`
    );
  }
  if (project.files?.length) {
    const fileBlocks = project.files
      .map((f) => `--- File: ${f.name} ---\n${f.content}`)
      .join("\n\n");
    sections.push(`Project reference files (use as context/knowledge for this project):\n\n${fileBlocks}`);
  }

  if (sections.length === 0) return basePrompt;

  return `${basePrompt}\n\nYou are working inside a project called "${project.name}". Everything below is scoped to this project only.\n\n${sections.join("\n\n")}`;
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
      model: "llama-3.3-70b-versatile",
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

  const { prompt, conversationId, attachment, temporary, clientHistory, editIndex, projectId } =
    await req.json();

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
    user.lowCreditEmailSentAt = null;
    await user.save();
  }

  const systemPrompt = buildSystemPrompt(user);
  const effectivePrompt = buildEffectivePrompt(prompt, attachment);

  let project = null;
  if (projectId) {
    project = await Project.findOne({ _id: projectId, user: session.user.id });
    if (!project) {
      return Response.json({ error: "Project not found" }, { status: 404 });
    }
  }
  const finalSystemPrompt = buildProjectSystemPrompt(systemPrompt, project);

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
      const priorTurns =
        typeof editIndex === "number" && editIndex >= 0
          ? existingConversation.turns.slice(0, editIndex)
          : existingConversation.turns;
      history = priorTurns.map((t) => ({
        prompt: t.prompt,
        answer: t.best?.text || "",
      }));
    }
  }

  const trimmedHistory = history.slice(-10);

  const caller = PROVIDER_CALLERS[chosenProvider.id];
  const result = await caller(effectivePrompt, trimmedHistory, finalSystemPrompt);

  const best =
    result.status === "ok" && result.text && result.text.trim()
      ? result
      : {
          model: "multimind",
          text: `${chosenProvider.label} is unavailable right now. Please try again in a moment.`,
          latencyMs: result.latencyMs || 0,
          status: "error",
        };

  // Only charge credits for a successful response. Uses an atomic
  // findOneAndUpdate (check + deduct in one DB op) so two concurrent
  // requests can't both succeed when only one has enough credits left.
  if (best.status === "ok") {
    const updatedUser = await chargeCreditsAtomic(session.user.id, chosenProvider.creditCost);
    if (updatedUser) {
      user.credits = updatedUser.credits;
    }
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
    if (typeof editIndex === "number" && editIndex >= 0) {
      conversation.turns = conversation.turns.slice(0, editIndex);
    }
    conversation.turns.push(turn);
    await conversation.save();
  } else {
    conversation = await Conversation.create({
      user: session.user.id,
      title: turn.prompt.slice(0, 60),
      turns: [turn],
      project: projectId || null,
    });
  }

  return Response.json({
    conversationId: conversation._id.toString(),
    turn,
    creditsRemaining: user.credits,
  });
}