import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Connection from "@/models/Connection";

// DELETE /api/connections/:id — disconnects one social account.
// Note: this only removes MultiMind's copy of the token; it does not
// revoke the grant on Meta's side. Good enough for v1 (Phase 4) — a
// "also revoke on Meta" call can be added later via
// DELETE https://graph.facebook.com/{user-id}/permissions.
export async function DELETE(_req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "You must be signed in" }, { status: 401 });
  }

  await dbConnect();

  const connection = await Connection.findOne({ _id: params.id, user: session.user.id });
  if (!connection) {
    return Response.json({ error: "Connection not found" }, { status: 404 });
  }

  await connection.deleteOne();

  return Response.json({ success: true });
}