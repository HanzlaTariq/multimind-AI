import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PDFDocument } from "pdf-lib";

export const runtime = "nodejs";

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024; // 15MB

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "You must be signed in" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file");

  if (!file || typeof file === "string") {
    return Response.json({ error: "No PDF file was provided" }, { status: 400 });
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return Response.json({ error: "File is too large — please use a PDF under 15MB" }, { status: 400 });
  }

  try {
    const inputBytes = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(inputBytes, { ignoreEncryption: true });

    // Structural compression: dedupes shared objects and writes with
    // object streams, which mainly helps text-heavy / multi-page-template
    // PDFs. It does NOT re-encode embedded images at lower quality/resolution
    // like dedicated tools (Ghostscript, iLovePDF) do — that requires image
    // recompression which isn't practical in a lightweight serverless function.
    const outputBytes = await pdfDoc.save({
      useObjectStreams: true,
      addDefaultPage: false,
    });

    const originalSize = inputBytes.byteLength;
    const compressedSize = outputBytes.byteLength;
    const savedPercent = Math.max(
      0,
      Math.round(((originalSize - compressedSize) / originalSize) * 100)
    );

    return new Response(outputBytes, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="compressed-${file.name || "document.pdf"}"`,
        "X-Original-Size": String(originalSize),
        "X-Compressed-Size": String(compressedSize),
        "X-Saved-Percent": String(savedPercent),
      },
    });
  } catch (err) {
    console.error("PDF compression error:", err);
    return Response.json(
      { error: "Couldn't process this PDF — it may be corrupted, password-protected, or in an unsupported format." },
      { status: 500 }
    );
  }
}