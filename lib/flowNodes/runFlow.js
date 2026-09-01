// The actual "run a flow" engine — pulled out of
// app/api/flows/[id]/run/route.js (Phase 5) so a second caller can kick
// off a run without an HTTP request/session in the loop. The manual Run
// button still goes through that route (it needs the session to check
// ownership before it ever gets here); the Drive-poll cron
// (app/api/cron/drive-poll/route.js) is the second caller — it already
// knows the flow belongs to a user from the Flow doc itself, and has no
// browser session to check. Behavior is unchanged from the original
// route, this is a pure extraction plus one new parameter (`seedOutputs`)
// for the cron caller to hand a trigger node its discovered payload
// (e.g. which Drive file showed up) before traversal starts.

import Connection from "@/models/Connection";
import FlowRun from "@/models/FlowRun";
import { executeNode } from "@/lib/flowNodes/registry";
import { topologicalOrder, getDescendants, getParents } from "@/lib/flowNodes/traverse";

/**
 * @param {object} flow - a loaded Flow document (or plain object with the
 *   same shape: nodes, edges, _id, user)
 * @param {object} opts
 * @param {string} opts.userId
 * @param {"manual"|"scheduled"|"webhook"} opts.triggerType
 * @param {Map<string, any>} [opts.seedOutputs] - nodeId -> output value,
 *   pre-populated before that node even runs. Used by the cron poller to
 *   hand a trigger.driveNewFile node the specific file it found, so the
 *   executor doesn't have to (and can't, since it has no HTTP context)
 *   go looking for one itself.
 */
export async function runFlow(flow, { userId, triggerType, seedOutputs = new Map() }) {
  if (!flow.nodes.length) {
    throw new Error("Flow has no nodes to run");
  }

  const connectionIds = [
    ...new Set(flow.nodes.map((n) => n.data?.config?.connectionId).filter(Boolean)),
  ];
  const connectionDocs = connectionIds.length
    ? await Connection.find({ _id: { $in: connectionIds }, user: userId })
        .select("platform accountName")
        .lean()
    : [];
  const connections = Object.fromEntries(
    connectionDocs.map((c) => [String(c._id), { platform: c.platform, accountName: c.accountName }]),
  );

  const run = await FlowRun.create({
    flow: flow._id,
    user: userId,
    status: "running",
    triggerType,
    logs: [],
    startedAt: new Date(),
  });

  const outputs = new Map(seedOutputs);
  const preSeededIds = new Set(seedOutputs.keys());
  const skipped = new Set();
  let orderedNodes;

  try {
    orderedNodes = topologicalOrder(flow.nodes, flow.edges);
  } catch (err) {
    run.status = "failed";
    run.error = err.message;
    run.finishedAt = new Date();
    await run.save();
    return run;
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

    const startedAt = new Date();
    let result;

    if (preSeededIds.has(node.nodeId)) {
      // A seeded node (the trigger the cron already resolved) doesn't
      // get re-executed — its "output" IS the seed, so the executor
      // still runs once (to produce a consistent log message) but with
      // that seed threaded in as context so it can just echo it back
      // rather than re-detecting anything.
      const config = node.data?.config || {};
      result = await executeNode(node.type, config, {
        previousOutput: null,
        connections,
        userId,
        triggerSeed: seedOutputs.get(node.nodeId),
      });
    } else {
      const parentIds = getParents(node.nodeId, flow.edges);
      const previousOutput = parentIds
        .map((id) => outputs.get(id))
        .find((v) => v !== undefined && v !== null) ?? null;

      const config = node.data?.config || {};
      result = await executeNode(node.type, config, {
        previousOutput,
        connections,
        userId,
      });
    }

    outputs.set(node.nodeId, result.output ?? null);

    run.logs.push({
      nodeId: node.nodeId,
      nodeType: node.type,
      status: result.error ? "failed" : "success",
      output: result,
      startedAt,
      finishedAt: new Date(),
    });

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

  return run;
}
