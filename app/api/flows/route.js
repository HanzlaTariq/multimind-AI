import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Flow from "@/models/Flow";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "You must be signed in" }, { status: 401 });
  }

  await dbConnect();

  // List view only needs enough to render a card — not the full node/edge
  // graph, which can get large once a flow has many nodes.
  const flows = await Flow.find({ user: session.user.id })
    .select("name description status updatedAt createdAt nodes")
    .sort({ updatedAt: -1 })
    .lean();

  const result = flows.map((f) => ({
    _id: f._id,
    name: f.name,
    description: f.description,
    status: f.status,
    nodeCount: f.nodes?.length || 0,
    updatedAt: f.updatedAt,
    createdAt: f.createdAt,
  }));

  return Response.json({ flows: result });
}

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "You must be signed in" }, { status: 401 });
  }

  const { name, description } = await req.json();

  if (!name || !name.trim()) {
    return Response.json({ error: "Flow name is required" }, { status: 400 });
  }

  await dbConnect();

  const flow = await Flow.create({
    user: session.user.id,
    name: name.trim().slice(0, 80),
    description: (description || "").slice(0, 500),
    nodes: [],
    edges: [],
  });

  return Response.json({ flow });
}
