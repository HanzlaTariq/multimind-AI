import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import ImagesToPdfTool from "@/components/ImagesToPdfTool";

export default async function ImagesToPdfPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  return <ImagesToPdfTool />;
}