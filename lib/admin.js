import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * Verifies the current request comes from a signed-in admin.
 * Returns the session on success, or a Response to return immediately
 * (401 if not signed in, 403 if signed in but not an admin).
 *
 * Usage inside a route handler:
 *   const check = await requireAdmin();
 *   if (check instanceof Response) return check;
 *   const session = check;
 */
export async function requireAdmin() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return Response.json({ error: "You must be signed in" }, { status: 401 });
  }

  if (!session.user?.isAdmin) {
    return Response.json({ error: "Admin access required" }, { status: 403 });
  }

  return session;
}