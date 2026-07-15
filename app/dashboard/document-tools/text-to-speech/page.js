import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import TextToSpeechTool from "@/components/TextToSpeechTool";

export default async function TextToSpeechPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  return <TextToSpeechTool />;
}