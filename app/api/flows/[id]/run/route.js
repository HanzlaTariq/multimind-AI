import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Flow from "@/models/Flow";
import FlowRun from "@/models/FlowRun";
import Connection from "@/models/Connection";
import { executeNode } from "@/lib/flowNodes/registry";

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

  // Fetch every connection any platform node in this flow references, once,
  // up front — cheaper than each platform executor hitting the DB itself,
  // and gives the executors an accountName to report without touching
  // encrypted token fields (select: false keeps them out of this query).
  const connectionIds = [
    ...new Set(flow.nodes.map((n) => n.data?.config?.connectionId).filter(Boolean)),
  ];
  const connectionDocs = connectionIds.length
    ? await Connection.find({ _id: { $in: connectionIds }, user: session.user.id })
        .select("platform accountName")
        .lean()
    : [];
  const connections = Object.fromEntries(
    connectionDocs.map((c) => [String(c._id), { platform: c.platform, accountName: c.accountName }]),
  );

  const run = await FlowRun.create({
    flow: flow._id,
    user: session.user.id,
    status: "running",
    triggerType: "manual",
    logs: [],
    startedAt: new Date(),
  });

  // --- Execution -----------------------------------------------------------
  // Each node's execute() now comes from the plugin registry in
  // lib/flowNodes/registry.js (per-type behavior, still simulated — no
  // live platform calls until Phase 4 connects real accounts). Traversal
  // is still array order rather than a real graph walk driven by `edges`;
  // Phase 5 replaces this loop with proper topological execution and
  // branching support for logic.condition/logic.loop.
  let previousOutput = null;
  for (const node of flow.nodes) {
    const startedAt = new Date();
    const config = node.data?.config || {};
    const result = await executeNode(node.type, config, { previousOutput, connections });
    previousOutput = result.output ?? previousOutput;

    run.logs.push({
      nodeId: node.nodeId,
      nodeType: node.type,
      status: result.error ? "failed" : "success",
      output: result,
      startedAt,
      finishedAt: new Date(),
    });
  }

  const failed = run.logs.some((l) => l.status === "failed");
  run.status = failed ? "failed" : "success";
  run.finishedAt = new Date();
  await run.save();

  return Response.json({ run });
}
