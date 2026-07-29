import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getToolCreditConfigs } from "@/lib/plans";
import DocumentConvertTool from "@/components/DocumentConvertTool";

export default async function PdfToImagesPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const costs = await getToolCreditConfigs();
  const cost = costs["pdf-to-images"]?.cost ?? 2;

  return (
    <DocumentConvertTool
      title="PDF to Images"
      description="Export each page of a PDF as an image. Powered by CloudConvert — larger files may take a moment."
      badge={`${cost} credit${cost === 1 ? "" : "s"} • via CloudConvert`}
      accept=".pdf"
      endpoint="/api/documents/convert"
      targetFormats={[
        { value: "png", label: "PNG" },
        { value: "jpg", label: "JPG" },
      ]}
      maxSizeLabel="20MB"
      toolId="pdf-to-images"
      toolLabel="PDF to Images"
      toolHref="/dashboard/document-tools/pdf-to-images"
    />
  );
}