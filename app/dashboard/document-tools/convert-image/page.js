import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getToolCreditConfigs } from "@/lib/plans";
import DocumentConvertTool from "@/components/DocumentConvertTool";

export default async function ConvertImagePage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const costs = await getToolCreditConfigs();
  const cost = costs["convert-image"]?.cost ?? 1;

  return (
    <DocumentConvertTool
      title="Convert Image"
      description="Convert between JPG, PNG, WebP, and AVIF, with optional resizing."
      badge={`${cost} credit${cost === 1 ? "" : "s"} • Instant`}
      accept="image/*"
      endpoint="/api/documents/convert-image"
      targetFormats={[
        { value: "jpeg", label: "JPG" },
        { value: "png", label: "PNG" },
        { value: "webp", label: "WebP" },
        { value: "avif", label: "AVIF" },
      ]}
      extraFieldName="width"
      extraFieldLabel="Resize width in px (optional)"
      maxSizeLabel="15MB"
      toolId="convert-image"
      toolLabel="Convert Image"
      toolHref="/dashboard/document-tools/convert-image"
    />
  );
}