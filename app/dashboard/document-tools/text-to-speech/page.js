import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getToolCreditConfigs } from "@/lib/plans";
import TextToSpeechTool from "@/components/TextToSpeechTool";

export default async function TextToSpeechPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  const costs = await getToolCreditConfigs();
  return <TextToSpeechTool minCreditCost={costs["text-to-speech"]?.minCost ?? 3} />;
}