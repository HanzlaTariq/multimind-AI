import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import sharp from "sharp";

export const runtime = "nodejs";

const MAX_BYTES = 15 * 1024 * 1024;
const ALLOWED_FORMATS = ["jpeg", "png", "webp", "avif"];

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "You must be signed in" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file");
  const format = formData.get("format");
  const width = formData.get("width");

  if (!file || typeof file === "string") {
    return Response.json({ error: "No image was provided" }, { status: 400 });
  }
  if (!ALLOWED_FORMATS.includes(format)) {
    return Response.json({ error: "Unsupported target format" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return Response.json({ error: "Image is too large — please use a file under 15MB" }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    let pipeline = sharp(buffer);

    if (width) {
      const w = parseInt(width, 10);
      if (w > 0 && w < 10000) {
        pipeline = pipeline.resize({ width: w });
      }
    }

    const output = await pipeline.toFormat(format).toBuffer();
    const baseName = file.name.replace(/\.[^.]+$/, "");

    return new Response(output, {
      status: 200,
      headers: {
        "Content-Type": `image/${format}`,
        "Content-Disposition": `attachment; filename="${baseName}.${format}"`,
      },
    });
  } catch (err) {
    console.error("Image conversion error:", err);
    return Response.json(
      { error: "Couldn't convert this image — it may be corrupted or in an unsupported format." },
      { status: 500 }
    );
  }
}