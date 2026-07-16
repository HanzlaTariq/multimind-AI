import { randomUUID } from "crypto";
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

  const body = await req.json();

  await dbConnect();

  const conversation = await Conversation.findOne({
    _id: params.id,
    user: session.user.id,
  });

  if (!conversation) {
    return Response.json({ error: "Conversation not found" }, { status: 404 });
  }

  if (typeof body.turnIndex === "number" && typeof body.pinned === "boolean") {
    if (!conversation.turns[body.turnIndex]) {
      return Response.json({ error: "Turn not found" }, { status: 404 });
    }
    conversation.turns[body.turnIndex].pinned = body.pinned;
  }

  if (typeof body.isPublic === "boolean") {
    conversation.isPublic = body.isPublic;
    if (body.isPublic && !conversation.shareId) {
      conversation.shareId = randomUUID();
    }
  }

  await conversation.save();

  return Response.json({ conversation });
}