import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Project from "@/models/Project";
import Conversation from "@/models/Conversation";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "You must be signed in" }, { status: 401 });
  }

  await dbConnect();

  const projects = await Project.find({ user: session.user.id })
    .select("name instructions updatedAt createdAt files")
    .sort({ updatedAt: -1 });

  // Attach a lightweight chat count per project without loading full turns.
  const counts = await Conversation.aggregate([
    { $match: { project: { $in: projects.map((p) => p._id) } } },
    { $group: { _id: "$project", count: { $sum: 1 } } },
  ]);
  const countMap = Object.fromEntries(counts.map((c) => [String(c._id), c.count]));

  const result = projects.map((p) => ({
    _id: p._id,
    name: p.name,
    instructions: p.instructions,
    fileCount: p.files?.length || 0,
    chatCount: countMap[String(p._id)] || 0,
    updatedAt: p.updatedAt,
    createdAt: p.createdAt,
  }));

  return Response.json({ projects: result });
}

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "You must be signed in" }, { status: 401 });
  }

  const { name, instructions } = await req.json();

  if (!name || !name.trim()) {
    return Response.json({ error: "Project name is required" }, { status: 400 });
  }

  await dbConnect();

  const project = await Project.create({
    user: session.user.id,
    name: name.trim().slice(0, 80),
    instructions: (instructions || "").slice(0, 8000),
    files: [],
  });

  return Response.json({ project });
}