import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PDFDocument } from "pdf-lib";
import sharp from "sharp";
import JSZip from "jszip";

export const runtime = "nodejs";

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
const IMAGE_EXT = ["jpg", "jpeg", "png", "webp"];
const OFFICE_EXT = ["docx", "pptx", "xlsx"];

function getExt(name) {
  return (name.split(".").pop() || "").toLowerCase();
}

async function compressPdf(buffer) {
  const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  // Structural compression only — dedupes shared objects and writes with
  // object streams. Does NOT re-encode embedded images at lower quality like
  // dedicated tools do, so gains are modest on image-heavy PDFs.
  return await pdfDoc.save({ useObjectStreams: true, addDefaultPage: false });
}

async function compressImage(buffer, ext) {
  let pipeline = sharp(buffer);
  const metadata = await pipeline.metadata();

  // Downscale very large images — a common, big source of bloat
  if (metadata.width && metadata.width > 2400) {
    pipeline = pipeline.resize({ width: 2000 });
  }

  if (ext === "jpg" || ext === "jpeg") {
    return await pipeline.jpeg({ quality: 72, mozjpeg: true }).toBuffer();
  }
  if (ext === "webp") {
    return await pipeline.webp({ quality: 72 }).toBuffer();
  }
  // PNG: lossless recompression only, to avoid visible artifacts on graphics/screenshots
  return await pipeline.png({ compressionLevel: 9, adaptiveFiltering: true }).toBuffer();
}

async function compressOfficeDoc(buffer) {
  // .docx/.pptx/.xlsx are ZIP archives — the biggest win is usually
  // recompressing the embedded images inside word/media, ppt/media, xl/media.
  const zip = await JSZip.loadAsync(buffer);
  const mediaEntries = Object.keys(zip.files).filter((name) =>
    /\/media\/.+\.(png|jpe?g)$/i.test(name)
  );

  for (const name of mediaEntries) {
    const entry = zip.files[name];
    if (entry.dir) continue;

    try {
      const data = await entry.async("nodebuffer");
      const ext = getExt(name) === "jpg" ? "jpeg" : getExt(name);
      const compressed = await compressImage(data, ext);
      if (compressed.length < data.length) {
        zip.file(name, compressed);
      }
    } catch (e) {
      // if one embedded image fails to process, leave it as-is and continue
      continue;
    }
  }

  return await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 9 },
  });
}

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "You must be signed in" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file");

  if (!file || typeof file === "string") {
    return Response.json({ error: "No file was provided" }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return Response.json({ error: "File is too large — please use a file under 20MB" }, { status: 400 });
  }

  const ext = getExt(file.name);
  const inputBytes = Buffer.from(await file.arrayBuffer());

  try {
    let outputBytes;
    let mimeType;

    if (ext === "pdf") {
      outputBytes = await compressPdf(inputBytes);
      mimeType = "application/pdf";
    } else if (IMAGE_EXT.includes(ext)) {
      outputBytes = await compressImage(inputBytes, ext === "jpg" ? "jpeg" : ext);
      mimeType = file.type || `image/${ext}`;
    } else if (OFFICE_EXT.includes(ext)) {
      outputBytes = await compressOfficeDoc(inputBytes);
      mimeType = file.type || "application/octet-stream";
    } else {
      return Response.json(
        {
          error:
            "This file type isn't supported yet. Try a PDF, image (JPG/PNG/WebP), or Office document (DOCX/PPTX/XLSX).",
        },
        { status: 400 }
      );
    }

    const originalSize = inputBytes.byteLength;
    const compressedSize = outputBytes.length;
    const savedPercent = Math.max(
      0,
      Math.round(((originalSize - compressedSize) / originalSize) * 100)
    );

    return new Response(outputBytes, {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `attachment; filename="compressed-${file.name}"`,
        "X-Original-Size": String(originalSize),
        "X-Compressed-Size": String(compressedSize),
        "X-Saved-Percent": String(savedPercent),
      },
    });
  } catch (err) {
    console.error("Compression error:", err);
    return Response.json(
      { error: "Couldn't process this file — it may be corrupted or password-protected." },
      { status: 500 }
    );
  }
}