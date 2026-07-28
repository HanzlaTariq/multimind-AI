import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Project from "@/models/Project";
import Conversation from "@/models/Conversation";

export async function GET(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "You must be signed in" }, { status: 401 });
  }

  await dbConnect();

  const project = await Project.findOne({ _id: params.id, user: session.user.id });
  if (!project) {
    return Response.json({ error: "Project not found" }, { status: 404 });
  }

  return Response.json({ project });
}

export async function PATCH(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "You must be signed in" }, { status: 401 });
  }

  const body = await req.json();

  await dbConnect();

  const project = await Project.findOne({ _id: params.id, user: session.user.id });
  if (!project) {
    return Response.json({ error: "Project not found" }, { status: 404 });
  }

  if (typeof body.name === "string" && body.name.trim()) {
    project.name = body.name.trim().slice(0, 80);
  }

  if (typeof body.instructions === "string") {
    project.instructions = body.instructions.slice(0, 8000);
  }

  await project.save();

  return Response.json({ project });
}

export async function DELETE(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "You must be signed in" }, { status: 401 });
  }

  await dbConnect();

  const project = await Project.findOne({ _id: params.id, user: session.user.id });
  if (!project) {
    return Response.json({ error: "Project not found" }, { status: 404 });
  }

  // Don't destroy the user's chat history — unlink its conversations back
  // to the main "Recents" list instead of deleting them.
  await Conversation.updateMany(
    { project: params.id, user: session.user.id },
    { $set: { project: null } }
  );
  await Project.deleteOne({ _id: params.id, user: session.user.id });

  return Response.json({ message: "Deleted" });
}