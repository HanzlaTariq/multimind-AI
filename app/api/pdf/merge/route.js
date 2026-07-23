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

  await dbConnect();
  const user = await User.findById(session.user.id);
  if (!user) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  const creditState = getToolCreditState(user, "merge-pdf");
  if (!creditState.canUse) {
    return Response.json(
      {
        error: `You need ${creditState.cost} credit${creditState.cost > 1 ? "s" : ""} for this tool. Upgrade your plan or wait for your next monthly reset.`,
      },
      { status: 402 }
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