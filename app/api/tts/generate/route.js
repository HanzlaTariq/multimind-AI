import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { generateSpeech } from "@/lib/elevenlabs";
import { getToolCreditState, chargeCreditsAtomic } from "@/lib/plans";

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

  await dbConnect();
  const user = await User.findById(session.user.id);
  if (!user) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  const creditState = getToolCreditState(user, "text-to-speech", new Date(), { text });
  if (!creditState.canUse) {
    return Response.json(
      {
        error: `You need ${creditState.cost} credit${creditState.cost > 1 ? "s" : ""} for this tool. Upgrade your plan or wait for your next monthly reset.`,
      },
      { status: 402 }
    );
  }

  try {
    const audioBuffer = await generateSpeech({ text: text.trim(), voiceId });
    const updatedUser = await chargeCreditsAtomic(user._id, creditState.cost);
    if (!updatedUser) {
      return Response.json(
        { error: "You're out of credits — someone (or another tab) may have used them first." },
        { status: 402 }
      );
    }
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