import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
// pages/dashboard/page.jsx or app/dashboard/page.jsx
import ChatDashboard from "@/components/chat/ChatDashboard";
export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  return <ChatDashboard user={session.user} />;
}
