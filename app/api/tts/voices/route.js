import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { listAllVoices } from "@/lib/elevenlabs";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "You must be signed in" }, { status: 401 });
  }

  await dbConnect();
  const user = await User.findById(session.user.id).select("customVoices");
  const myVoiceIds = new Set((user?.customVoices || []).map((v) => v.voiceId));

  try {
    const allVoices = await listAllVoices();

    const stock = allVoices
      .filter((v) => v.category !== "cloned")
      .map((v) => ({ voiceId: v.voice_id, name: v.name }));

    // The ElevenLabs account is shared across all our users, so "cloned"
    // voices returned here could belong to anyone — only surface the ones
    // this specific user created.
    const mine = allVoices
      .filter((v) => v.category === "cloned" && myVoiceIds.has(v.voice_id))
      .map((v) => ({ voiceId: v.voice_id, name: v.name }));

    return Response.json({ stock, mine });
  } catch (err) {
    console.error("List voices error:", err);
    return Response.json({ error: err.message || "Couldn't load voices" }, { status: 500 });
  }
}