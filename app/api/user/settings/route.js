import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { resetCreditsIfNeeded } from "@/lib/plans";

const SELECT_FIELDS =
  "name email image preferredName role customInstructions chatFont theme reduceMotion notifyOnComplete plan credits creditsResetAt planExpiresAt";

const ALLOWED_UPDATE_FIELDS = [
  "name",
  "preferredName",
  "role",
  "customInstructions",
  "chatFont",
  "theme",
  "reduceMotion",
  "notifyOnComplete",
];

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "You must be signed in" }, { status: 401 });
  }

  await dbConnect();
  const user = await User.findById(session.user.id).select(SELECT_FIELDS);
  if (!user) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  // Catches the case where a JazzCash/Razorpay plan expired since the
  // user's last chat message — keeps the settings page honest even if
  // they haven't sent anything since it lapsed.
  if (resetCreditsIfNeeded(user)) {
    await user.save();
  }

  return Response.json({ user });
}

export async function PATCH(req) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "You must be signed in" }, { status: 401 });
  }

  const body = await req.json();
  const updates = {};

  for (const key of ALLOWED_UPDATE_FIELDS) {
    if (key in body) updates[key] = body[key];
  }

  if (typeof updates.customInstructions === "string" && updates.customInstructions.length > 2000) {
    return Response.json({ error: "Instructions must be under 2000 characters" }, { status: 400 });
  }
  if (typeof updates.name === "string" && !updates.name.trim()) {
    return Response.json({ error: "Name cannot be empty" }, { status: 400 });
  }

  await dbConnect();
  const user = await User.findByIdAndUpdate(session.user.id, updates, {
    new: true,
    runValidators: true,
  }).select(SELECT_FIELDS);

  if (!user) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  return Response.json({ user });
}