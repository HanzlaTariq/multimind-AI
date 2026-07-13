import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PDFDocument } from "pdf-lib";

export const runtime = "nodejs";

const MAX_BYTES = 20 * 1024 * 1024;

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "You must be signed in" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file");
  const fromPage = parseInt(formData.get("from"), 10);
  const toPage = parseInt(formData.get("to"), 10);

  if (!file || typeof file === "string") {
    return Response.json({ error: "No PDF file was provided" }, { status: 400 });
  }
  if (!fromPage || !toPage || fromPage < 1 || toPage < fromPage) {
    return Response.json({ error: "Please enter a valid page range" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return Response.json({ error: "File is too large — please use a PDF under 20MB" }, { status: 400 });
  }

  try {
    const bytes = await file.arrayBuffer();
    const source = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const pageCount = source.getPageCount();

    if (fromPage > pageCount) {
      return Response.json({ error: `This PDF only has ${pageCount} pages` }, { status: 400 });
    }

    const start = Math.max(1, fromPage);
    const end = Math.min(pageCount, toPage);

    const indices = [];
    for (let i = start; i <= end; i++) indices.push(i - 1);

    const output = await PDFDocument.create();
    const pages = await output.copyPages(source, indices);
    pages.forEach((p) => output.addPage(p));

    const bytesOut = await output.save();
    const baseName = file.name.replace(/\.[^.]+$/, "");

    return new Response(bytesOut, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${baseName}-pages-${start}-${end}.pdf"`,
      },
    });
  } catch (err) {
    console.error("PDF split error:", err);
    return Response.json(
      { error: "Couldn't process this PDF — it may be corrupted or password-protected." },
      { status: 500 }
    );
  }
}