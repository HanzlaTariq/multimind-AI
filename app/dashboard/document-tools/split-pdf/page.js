import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getToolCreditConfigs } from "@/lib/plans";
import SplitPdfTool from "@/components/SplitPdfTool";

export default async function SplitPdfPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  const costs = await getToolCreditConfigs();
  return <SplitPdfTool creditCost={costs["split-pdf"]?.cost ?? 1} />;
}