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
    return Response.json({ error: "Please select at least one image" }, { status: 400 });
  }

  const totalSize = files.reduce((sum, f) => sum + f.size, 0);
  if (totalSize > MAX_BYTES_TOTAL) {
    return Response.json(
      { error: "Combined images are too large — please keep it under 30MB total" },
      { status: 400 }
    );
  }

  try {
    const pdfDoc = await PDFDocument.create();

    for (const file of files) {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const isPng = file.type === "image/png" || file.name.toLowerCase().endsWith(".png");
      const image = isPng ? await pdfDoc.embedPng(bytes) : await pdfDoc.embedJpg(bytes);

      const page = pdfDoc.addPage([image.width, image.height]);
      page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
    }

    const output = await pdfDoc.save();

    return new Response(output, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="images.pdf"`,
      },
    });
  } catch (err) {
    console.error("Images-to-PDF error:", err);
    return Response.json(
      { error: "Couldn't build a PDF from these images — please use JPG or PNG files." },
      { status: 500 }
    );
  }
}