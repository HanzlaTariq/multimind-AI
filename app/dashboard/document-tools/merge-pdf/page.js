import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getToolCreditConfigs } from "@/lib/plans";
import MergePdfTool from "@/components/MergePdfTool";

export default async function MergePdfPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  const costs = await getToolCreditConfigs();
  return <MergePdfTool creditCost={costs["merge-pdf"]?.cost ?? 1} />;
}