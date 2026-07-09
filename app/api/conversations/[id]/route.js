import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Conversation from "@/models/Conversation";

export async function GET(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "You must be signed in" }, { status: 401 });
  }

  await dbConnect();

  const conversation = await Conversation.findOne({
    _id: params.id,
    user: session.user.id,
  });

  if (!conversation) {
    return Response.json({ error: "Conversation not found" }, { status: 404 });
  }

  return Response.json({ conversation });
}

export async function DELETE(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "You must be signed in" }, { status: 401 });
  }

  await dbConnect();

  await Conversation.deleteOne({ _id: params.id, user: session.user.id });

  return Response.json({ message: "Deleted" });
}

export async function PATCH(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "You must be signed in" }, { status: 401 });
  }

  const { turnIndex, pinned } = await req.json();

  if (typeof turnIndex !== "number") {
    return Response.json({ error: "turnIndex is required" }, { status: 400 });
  }

  await dbConnect();

  const conversation = await Conversation.findOne({
    _id: params.id,
    user: session.user.id,
  });

  if (!conversation) {
    return Response.json({ error: "Conversation not found" }, { status: 404 });
  }

  if (!conversation.turns[turnIndex]) {
    return Response.json({ error: "Turn not found" }, { status: 404 });
  }

  conversation.turns[turnIndex].pinned = pinned;
  await conversation.save();

  return Response.json({ conversation });
}