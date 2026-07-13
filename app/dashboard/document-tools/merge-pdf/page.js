import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import MergePdfTool from "@/components/MergePdfTool";

export default async function MergePdfPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  return <MergePdfTool />;
}