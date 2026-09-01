import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Flow from "@/models/Flow";
import { runFlow } from "@/lib/flowNodes/runFlow";

export async function POST(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "You must be signed in" }, { status: 401 });
  }

  await dbConnect();

  const flow = await Flow.findOne({ _id: params.id, user: session.user.id });
  if (!flow) {
    return Response.json({ error: "Flow not found" }, { status: 404 });
  }

  if (!flow.nodes.length) {
    return Response.json({ error: "Flow has no nodes to run" }, { status: 400 });
  }

  // Real graph traversal, connection resolution, and per-node execution
  // all live in lib/flowNodes/runFlow.js now -- shared with the Drive-poll
  // cron route (app/api/cron/drive-poll/route.js), which needs the exact
  // same engine but has no browser session to check here. This route's
  // job is just: is this really the caller's flow, then hand off.
  const run = await runFlow(flow, { userId: session.user.id, triggerType: "manual" });

  return Response.json({ run });
}
