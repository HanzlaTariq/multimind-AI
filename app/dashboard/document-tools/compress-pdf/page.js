import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getToolCreditConfigs } from "@/lib/plans";
import PdfCompressTool from "@/components/PdfCompressTool";

export default async function CompressPdfPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const costs = await getToolCreditConfigs();
  return <PdfCompressTool creditCost={costs["compress-pdf"]?.cost ?? 1} />;
}