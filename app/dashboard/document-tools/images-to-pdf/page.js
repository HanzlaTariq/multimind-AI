import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getToolCreditConfigs } from "@/lib/plans";
import ImagesToPdfTool from "@/components/ImagesToPdfTool";

export default async function ImagesToPdfPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  const costs = await getToolCreditConfigs();
  return <ImagesToPdfTool creditCost={costs["images-to-pdf"]?.cost ?? 1} />;
}