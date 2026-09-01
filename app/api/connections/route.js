import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Connection from "@/models/Connection";

export async function GET(req) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "You must be signed in" }, { status: 401 });
  }

  await dbConnect();

  const { searchParams } = new URL(req.url);
  const platform = searchParams.get("platform");

  const query = { user: session.user.id };
  if (platform) query.platform = platform;

  // accessToken/refreshToken are `select: false` on the schema, so this
  // naturally never returns credentials to the client.
  const connections = await Connection.find(query)
    .select("platform accountId accountName status expiresAt")
    .sort({ createdAt: -1 })
    .lean();

  return Response.json({ connections });
}
