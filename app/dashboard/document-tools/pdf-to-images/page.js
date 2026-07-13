import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import DocumentConvertTool from "@/components/DocumentConvertTool";

export default async function PdfToImagesPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <DocumentConvertTool
      title="PDF to Images"
      description="Export each page of a PDF as an image. Powered by CloudConvert — larger files may take a moment."
      badge="Premium • via CloudConvert"
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