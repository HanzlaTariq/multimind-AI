import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateSpeech } from "@/lib/elevenlabs";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_CHARS = 5000;

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "You must be signed in" }, { status: 401 });
  }

  const { text, voiceId } = await req.json();

  if (!text || !text.trim()) {
    return Response.json({ error: "Please enter some text" }, { status: 400 });
  }
  if (!voiceId) {
    return Response.json({ error: "Please choose a voice" }, { status: 400 });
  }
  if (text.length > MAX_CHARS) {
    return Response.json(
      { error: `Please keep text under ${MAX_CHARS} characters` },
      { status: 400 }
    );
  }

  try {
    const audioBuffer = await generateSpeech({ text: text.trim(), voiceId });
    return new Response(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Disposition": `attachment; filename="speech.mp3"`,
      },
    });
  } catch (err) {
    console.error("TTS generation error:", err);
    return Response.json({ error: err.message || "Couldn't generate speech" }, { status: 500 });
  }
}