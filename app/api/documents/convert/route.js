import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { convertFile } from "@/lib/cloudconvert";
import { getToolCreditState } from "@/lib/plans";

export const runtime = "nodejs";
export const maxDuration = 60; // needs a Vercel plan that allows >10s function duration

const MAX_BYTES = 20 * 1024 * 1024;

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "You must be signed in" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file");
  const outputFormat = formData.get("format");

  if (!file || typeof file === "string") {
    return Response.json({ error: "No file was provided" }, { status: 400 });
  }
  if (!outputFormat) {
    return Response.json({ error: "Please choose a target format" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return Response.json({ error: "File is too large — please use a file under 20MB" }, { status: 400 });
  }

  const inputFormat = (file.name.split(".").pop() || "").toLowerCase();
e  const toolId = formData.get("toolId") || "convert-document";

  await dbConnect();
  const user = await User.findById(session.user.id);
  if (!user) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  const creditState = getToolCreditState(user, toolId);
  if (!creditState.canUse) {
    return Response.json(
      {
        error: `You need ${creditState.cost} credit${creditState.cost > 1 ? "s" : ""} for this tool. Upgrade your plan or wait for your next monthly reset.`,
      },
      { status: 402 }
    );
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await convertFile({
      fileBuffer: buffer,
      filename: file.name,
      inputFormat,
      outputFormat,
    });
    user.credits = Math.max(0, user.credits - creditState.cost);
    await user.save();
    return Response.json(result);
  } catch (err) {
    console.error("Document conversion error:", err);
    return Response.json({ error: err.message || "Conversion failed" }, { status: 500 });
  }
}