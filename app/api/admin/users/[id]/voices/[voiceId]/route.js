import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { requireAdmin, logAdminAction } from "@/lib/admin";
import { deleteVoice } from "@/lib/elevenlabs";

export async function DELETE(req, { params }) {
  const check = await requireAdmin();
  if (check instanceof Response) return check;
  const session = check;

  await dbConnect();

  const user = await User.findById(params.id);
  if (!user) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  const voice = (user.customVoices || []).find((v) => v.voiceId === params.voiceId);
  if (!voice) {
    return Response.json({ error: "Voice not found" }, { status: 404 });
  }

  try {
    await deleteVoice(params.voiceId);
  } catch (err) {
    // Continue removing our own record even if the ElevenLabs-side delete
    // fails (e.g. it was already removed there, or the API key isn't set).
    console.error("ElevenLabs voice delete failed:", err.message);
  }

  user.customVoices = user.customVoices.filter((v) => v.voiceId !== params.voiceId);
  await user.save();

  await logAdminAction({
    session,
    action: "user.voice_delete",
    targetType: "user",
    targetId: user._id,
    targetLabel: user.email,
    details: { voiceId: params.voiceId, voiceName: voice.name },
  });

  return Response.json({ success: true });
}