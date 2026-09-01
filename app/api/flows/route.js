import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Flow from "@/models/Flow";
import { getFlowTemplate, buildFlowFromTemplate } from "@/lib/flowTemplates";

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

  const { name, description, templateId } = await req.json();

  // Phase 8: "New flow" can either start blank or 1-click duplicate one of
  // the built-in templates (lib/flowTemplates.js). Name/description are
  // still optional overrides on top of the template's defaults.
  let template = null;
  if (templateId) {
    template = getFlowTemplate(templateId);
    if (!template) {
      return Response.json({ error: "Unknown template" }, { status: 400 });
    }
  }

  const finalName = (name && name.trim()) || template?.flowName;
  if (!finalName) {
    return Response.json({ error: "Flow name is required" }, { status: 400 });
  }

  const finalDescription =
    typeof description === "string" && description.trim()
      ? description
      : template?.flowDescription || "";

  await dbConnect();

  const graph = template ? buildFlowFromTemplate(template) : { nodes: [], edges: [] };

  const flow = await Flow.create({
    user: session.user.id,
    name: finalName.trim().slice(0, 80),
    description: finalDescription.slice(0, 500),
    nodes: graph.nodes,
    edges: graph.edges,
  });

  return Response.json({ flow });
}
