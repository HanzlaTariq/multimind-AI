import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PDFDocument } from "pdf-lib";

export const runtime = "nodejs";

const MAX_BYTES_TOTAL = 30 * 1024 * 1024;

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "You must be signed in" }, { status: 401 });
  }

  const formData = await req.formData();
  const files = formData.getAll("files");

  if (!files.length || files.some((f) => typeof f === "string")) {
    return Response.json({ error: "Please select at least two PDF files" }, { status: 400 });
  }
  if (files.length < 2) {
    return Response.json({ error: "Please select at least two PDF files to merge" }, { status: 400 });
  }

  const totalSize = files.reduce((sum, f) => sum + f.size, 0);
  if (totalSize > MAX_BYTES_TOTAL) {
    return Response.json(
      { error: "Combined files are too large — please keep it under 30MB total" },
      { status: 400 }
    );
  }

  try {
    const merged = await PDFDocument.create();

    for (const file of files) {
      const bytes = await file.arrayBuffer();
      const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const pages = await merged.copyPages(doc, doc.getPageIndices());
      pages.forEach((p) => merged.addPage(p));
    }

    const output = await merged.save();

    return new Response(output, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="merged.pdf"`,
      },
    });
  } catch (err) {
    console.error("PDF merge error:", err);
    return Response.json(
      { error: "Couldn't merge these PDFs — one of them may be corrupted or password-protected." },
      { status: 500 }
    );
  }
}