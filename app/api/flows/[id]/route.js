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

  const flow = await Flow.findOne({ _id: params.id, user: session.user.id });
  if (!flow) {
    return Response.json({ error: "Flow not found" }, { status: 404 });
  }

  return Response.json({ flow });
}

// The canvas editor calls this on every meaningful change (node moved,
// wire connected, node config edited) to auto-save — so this stays cheap
// and does a full replace of nodes/edges rather than diffing.
export async function PUT(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "You must be signed in" }, { status: 401 });
  }

  const body = await req.json();

  await dbConnect();

  const flow = await Flow.findOne({ _id: params.id, user: session.user.id });
  if (!flow) {
    return Response.json({ error: "Flow not found" }, { status: 404 });
  }

  if (typeof body.name === "string" && body.name.trim()) {
    flow.name = body.name.trim().slice(0, 80);
  }

  if (typeof body.description === "string") {
    flow.description = body.description.slice(0, 500);
  }

  if (Array.isArray(body.nodes)) {
    for (const node of body.nodes) {
      if (!node.nodeId || !node.type || !node.position) {
        return Response.json(
          { error: "Each node needs nodeId, type, and position" },
          { status: 400 },
        );
      }
    }
    flow.nodes = body.nodes;
  }

  if (Array.isArray(body.edges)) {
    // Referential integrity: an edge dangling off a node id that was
    // removed (e.g. the client sent nodes and edges out of sync) would
    // silently break graph traversal at execution time — reject it now
    // instead of failing later inside the execution engine.
    const nodeIds = new Set((flow.nodes || []).map((n) => n.nodeId));
    for (const edge of body.edges) {
      if (!edge.edgeId || !edge.source || !edge.target) {
        return Response.json(
          { error: "Each edge needs edgeId, source, and target" },
          { status: 400 },
        );
      }
      if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
        return Response.json(
          { error: `Edge ${edge.edgeId} references a node that isn't in this flow` },
          { status: 400 },
        );
      }
    }
    flow.edges = body.edges;
  }

  if (body.status && ["draft", "active", "paused"].includes(body.status)) {
    flow.status = body.status;
  }

  await flow.save();

  return Response.json({ flow });
}

export async function DELETE(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "You must be signed in" }, { status: 401 });
  }

  await dbConnect();

  const flow = await Flow.findOne({ _id: params.id, user: session.user.id });
  if (!flow) {
    return Response.json({ error: "Flow not found" }, { status: 404 });
  }

  await FlowRun.deleteMany({ flow: params.id, user: session.user.id });
  await Flow.deleteOne({ _id: params.id, user: session.user.id });

  return Response.json({ message: "Deleted" });
}
