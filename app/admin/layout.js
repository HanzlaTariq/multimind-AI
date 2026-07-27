import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import AdminSidebar from "@/components/admin/AdminSidebar";

export const metadata = {
  title: "Admin · MultiMind",
};

export default async function AdminLayout({ children }) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }
  if (!session.user?.isAdmin) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-ink text-paper">
      <AdminSidebar user={session.user} />
      <main className="px-4 py-6 sm:px-8 sm:py-8 lg:pl-72">{children}</main>
    </div>
  );
}