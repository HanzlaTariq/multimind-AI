import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { cloneVoice } from "@/lib/elevenlabs";

export const runtime = "nodejs";

const MAX_BYTES = 10 * 1024 * 1024;

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "You must be signed in" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file");
  const name = formData.get("name");

  if (!file || typeof file === "string") {
    return Response.json({ error: "Please provide a voice sample" }, { status: 400 });
  }
  if (!name || !name.toString().trim()) {
    return Response.json({ error: "Please name this voice" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return Response.json({ error: "File too large — please use a sample under 10MB" }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const voiceId = await cloneVoice({
      name: name.toString().trim(),
      fileBuffer: buffer,
      filename: file.name,
      mimeType: file.type || "audio/mpeg",
    });

    await dbConnect();
    await User.findByIdAndUpdate(session.user.id, {
      $push: { customVoices: { voiceId, name: name.toString().trim() } },
    });

    return Response.json({ voiceId, name: name.toString().trim() });
  } catch (err) {
    console.error("Voice cloning error:", err);
    return Response.json({ error: err.message || "Voice cloning failed" }, { status: 500 });
  }
}