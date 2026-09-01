import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Flow from "@/models/Flow";
import FlowRun from "@/models/FlowRun";
import Connection from "@/models/Connection";
import { executeNode } from "@/lib/flowNodes/registry";
import { topologicalOrder, getDescendants, getParents } from "@/lib/flowNodes/traverse";

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
  // up front — cheaper than each platform executor hitting the DB itself
  // for display metadata (accountName). The real access token is fetched
  // separately, inside the registry, right before an API call is made.
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
  // Real graph traversal: nodes run in dependency order (Kahn's algorithm,
  // see lib/flowNodes/traverse.js) instead of raw array order, so wiring
  // order on the canvas no longer has to match execution order. Each
  // node's `previousOutput` is its own parent's output (not a single
  // running variable threaded through every node) — for a node with
  // multiple parents, the first parent with a defined output wins.
  //
  // Branching: the canvas only exposes one output handle per node today
  // (see traverse.js's module comment), so a failed logic.condition skips
  // its entire downstream subtree rather than routing to a distinct
  // "false" path. logic.loop still runs its body once (simulated) —
  // real per-item iteration is future work.
  const outputs = new Map(); // nodeId -> output value
  const skipped = new Set();
  let orderedNodes;

  try {
    orderedNodes = topologicalOrder(flow.nodes, flow.edges);
  } catch (err) {
    // Not a per-node failure (there's no single node to blame for a
    // cycle), so this goes on the run itself rather than into logs[],
    // which requires a real nodeId on every entry.
    run.status = "failed";
    run.error = err.message;
    run.finishedAt = new Date();
    await run.save();
    return Response.json({ run });
  }

  for (const node of orderedNodes) {
    if (skipped.has(node.nodeId)) {
      run.logs.push({
        nodeId: node.nodeId,
        nodeType: node.type,
        status: "skipped",
        output: { message: "Skipped — upstream condition didn't pass" },
        startedAt: new Date(),
        finishedAt: new Date(),
      });
      continue;
    }

    const parentIds = getParents(node.nodeId, flow.edges);
    const previousOutput = parentIds
      .map((id) => outputs.get(id))
      .find((v) => v !== undefined && v !== null) ?? null;

    const startedAt = new Date();
    const config = node.data?.config || {};
    const result = await executeNode(node.type, config, {
      previousOutput,
      connections,
      userId: session.user.id,
    });

    outputs.set(node.nodeId, result.output ?? null);

    run.logs.push({
      nodeId: node.nodeId,
      nodeType: node.type,
      status: result.error ? "failed" : "success",
      output: result,
      startedAt,
      finishedAt: new Date(),
    });

    // A condition node that didn't pass prunes its whole downstream
    // subtree rather than running nodes that were only meant to fire on
    // the "true" path.
    if (node.type === "logic.condition" && result.output === false) {
      for (const descendantId of getDescendants(node.nodeId, flow.edges)) {
        skipped.add(descendantId);
      }
    }
  }

  const failed = run.logs.some((l) => l.status === "failed");
  run.status = failed ? "failed" : "success";
  run.finishedAt = new Date();
  await run.save();

  return Response.json({ run });
}