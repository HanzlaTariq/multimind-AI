import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Project from "@/models/Project";

const MAX_FILES = 20;
const MAX_FILE_CHARS = 100_000;
const MAX_TOTAL_CHARS = 400_000;

export async function POST(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "You must be signed in" }, { status: 401 });
  }

  const { name, content } = await req.json();

  if (!name || typeof content !== "string") {
    return Response.json({ error: "A file name and content are required" }, { status: 400 });
  }

  await dbConnect();

  const project = await Project.findOne({ _id: params.id, user: session.user.id });
  if (!project) {
    return Response.json({ error: "Project not found" }, { status: 404 });
  }

  if (project.files.length >= MAX_FILES) {
    return Response.json(
      { error: `Projects can hold up to ${MAX_FILES} files — remove one first.` },
      { status: 400 }
    );
  }

  const trimmedContent = content.slice(0, MAX_FILE_CHARS);
  const currentTotal = project.files.reduce((sum, f) => sum + (f.content?.length || 0), 0);
  if (currentTotal + trimmedContent.length > MAX_TOTAL_CHARS) {
    return Response.json(
      { error: "This project's files are too large in total — remove one before adding more." },
      { status: 400 }
    );
  }

  project.files.push({
    name: name.slice(0, 200),
    content: trimmedContent,
    size: trimmedContent.length,
  });
  await project.save();

  return Response.json({ project });
}

export async function DELETE(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "You must be signed in" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const fileId = searchParams.get("fileId");
  if (!fileId) {
    return Response.json({ error: "fileId is required" }, { status: 400 });
  }

  await dbConnect();

  const project = await Project.findOne({ _id: params.id, user: session.user.id });
  if (!project) {
    return Response.json({ error: "Project not found" }, { status: 404 });
  }

  project.files = project.files.filter((f) => String(f._id) !== fileId);
  await project.save();

  return Response.json({ project });
}