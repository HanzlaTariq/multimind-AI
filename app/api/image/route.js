import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Conversation from "@/models/Conversation";

// Note: model name may need updating if Google renames/replaces it — check
// https://ai.google.dev/gemini-api/docs/image-generation for the current id.
const IMAGE_MODEL = "gemini-2.0-flash-preview-image-generation";

async function generateImage(prompt) {
  const start = Date.now();
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${IMAGE_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
        }),
      }
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message || "Image generation failed");

    const parts = data?.candidates?.[0]?.content?.parts || [];
    const imagePart = parts.find((p) => p.inlineData?.data);
    const textPart = parts.find((p) => p.text);

    if (!imagePart) {
      throw new Error(textPart?.text || "No image was returned for this prompt.");
    }

    const mimeType = imagePart.inlineData.mimeType || "image/png";
    const imageData = `data:${mimeType};base64,${imagePart.inlineData.data}`;

    return {
      model: "gemini",
      type: "image",
      imageData,
      text: textPart?.text || "",
      latencyMs: Date.now() - start,
      status: "ok",
    };
  } catch (err) {
    return {
      model: "gemini",
      type: "image",
      text:
        err.message ||
        "Image generation failed. Make sure your Gemini API key has access to image generation.",
      latencyMs: Date.now() - start,
      status: "error",
    };
  }
}

export async function POST(req) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return Response.json({ error: "You must be signed in" }, { status: 401 });
  }

  const { prompt, conversationId } = await req.json();

  if (!prompt || !prompt.trim()) {
    return Response.json({ error: "Describe the image you want" }, { status: 400 });
  }

  await dbConnect();

  const result = await generateImage(prompt);

  const turn = {
    prompt,
    responses: [result],
    best: result,
    createdAt: new Date(),
  };

  let conversation = null;
  if (conversationId) {
    conversation = await Conversation.findOne({ _id: conversationId, user: session.user.id });
  }

  if (conversation) {
    conversation.turns.push(turn);
    await conversation.save();
  } else {
    conversation = await Conversation.create({
      user: session.user.id,
      title: `Image: ${prompt.slice(0, 50)}`,
      turns: [turn],
    });
  }

  return Response.json({
    conversationId: conversation._id.toString(),
    turn,
  });
}