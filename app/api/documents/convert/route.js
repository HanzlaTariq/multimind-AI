import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { convertFile } from "@/lib/cloudconvert";

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

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await convertFile({
      fileBuffer: buffer,
      filename: file.name,
      inputFormat,
      outputFormat,
    });
    return Response.json(result);
  } catch (err) {
    console.error("Document conversion error:", err);
    return Response.json({ error: err.message || "Conversion failed" }, { status: 500 });
  }
}