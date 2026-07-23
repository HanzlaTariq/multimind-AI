import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { PDFDocument } from "pdf-lib";
import { getToolCreditState, chargeCreditsAtomic } from "@/lib/plans";

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

  await dbConnect();
  const user = await User.findById(session.user.id);
  if (!user) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  const creditState = getToolCreditState(user, "images-to-pdf");
  if (!creditState.canUse) {
    return Response.json(
      {
        error: `You need ${creditState.cost} credit${creditState.cost > 1 ? "s" : ""} for this tool. Upgrade your plan or wait for your next monthly reset.`,
      },
      { status: 402 }
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

    const updatedUser = await chargeCreditsAtomic(user._id, creditState.cost);
    if (!updatedUser) {
      return Response.json(
        { error: "You're out of credits — someone (or another tab) may have used them first." },
        { status: 402 }
      );
    }

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