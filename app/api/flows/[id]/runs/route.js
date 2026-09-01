import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Flow from "@/models/Flow";
import FlowRun from "@/models/FlowRun";

export async function GET(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "You must be signed in" }, { status: 401 });
  }

  await dbConnect();

  // Confirm ownership via Flow before returning any runs — FlowRun rows
  // carry `user` too, but checking Flow first gives a clean 404 instead of
  // an empty-but-ambiguous runs list when the flow id is someone else's.
  const flow = await Flow.findOne({ _id: params.id, user: session.user.id }).select("_id");
  if (!flow) {
    return Response.json({ error: "Flow not found" }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10) || 20, 100);

  // Logs can get sizeable across many runs; list view omits them and the
  // client fetches a single run's full logs from a detail view if needed.
  const runs = await FlowRun.find({ flow: params.id, user: session.user.id })
    .select("status triggerType startedAt finishedAt error")
    .sort({ startedAt: -1 })
    .limit(limit)
    .lean();

  return Response.json({ runs });
}
