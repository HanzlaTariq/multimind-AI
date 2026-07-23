import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import * as XLSX from "xlsx";
import { getToolCreditState, chargeCreditsAtomic } from "@/lib/plans";

export const runtime = "nodejs";

const MAX_BYTES = 15 * 1024 * 1024;

const FORMAT_MAP = {
  xlsx: {
    bookType: "xlsx",
    mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  },
  csv: { bookType: "csv", mime: "text/csv" },
  ods: { bookType: "ods", mime: "application/vnd.oasis.opendocument.spreadsheet" },
};

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "You must be signed in" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file");
  const format = formData.get("format");

  if (!file || typeof file === "string") {
    return Response.json({ error: "No spreadsheet was provided" }, { status: 400 });
  }

  const target = FORMAT_MAP[format];
  if (!target) {
    return Response.json({ error: "Unsupported target format" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return Response.json({ error: "File is too large — please use a file under 15MB" }, { status: 400 });
  }

  await dbConnect();
  const user = await User.findById(session.user.id);
  if (!user) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  const creditState = getToolCreditState(user, "convert-spreadsheet");
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
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const output = XLSX.write(workbook, { bookType: target.bookType, type: "buffer" });

    const baseName = file.name.replace(/\.[^.]+$/, "");

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
        "Content-Type": target.mime,
        "Content-Disposition": `attachment; filename="${baseName}.${format}"`,
      },
    });
  } catch (err) {
    console.error("Spreadsheet conversion error:", err);
    return Response.json(
      { error: "Couldn't convert this file — it may be corrupted or in an unsupported format." },
      { status: 500 }
    );
  }
}