import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { deleteVoice } from "@/lib/elevenlabs";

export async function DELETE(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "You must be signed in" }, { status: 401 });
  }

  await dbConnect();
  const user = await User.findById(session.user.id);
  const owns = (user?.customVoices || []).some((v) => v.voiceId === params.voiceId);

  if (!owns) {
    return Response.json({ error: "Voice not found" }, { status: 404 });
  }

  try {
    await deleteVoice(params.voiceId);
  } catch (err) {
    // continue removing our own record even if ElevenLabs-side delete fails
    // (e.g. it was already removed there)
  }

  user.customVoices = user.customVoices.filter((v) => v.voiceId !== params.voiceId);
  await user.save();

  return Response.json({ message: "Deleted" });
}