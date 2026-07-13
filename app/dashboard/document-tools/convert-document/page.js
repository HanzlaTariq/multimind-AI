import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import DocumentConvertTool from "@/components/DocumentConvertTool";

export default async function ConvertDocumentPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <DocumentConvertTool
      title="Convert Document"
      description="Convert between Word, PDF, and PowerPoint. Powered by CloudConvert — larger files may take up to a minute."
      badge="Premium • via CloudConvert"
      accept=".docx,.doc,.pdf,.pptx,.ppt,.odt,.rtf"
      endpoint="/api/documents/convert"
      targetFormats={[
        { value: "pdf", label: "PDF" },
        { value: "docx", label: "Word (DOCX)" },
        { value: "pptx", label: "PowerPoint (PPTX)" },
        { value: "odt", label: "ODT" },
      ]}
      maxSizeLabel="20MB"
      toolId="convert-document"
      toolLabel="Convert Document"
      toolHref="/dashboard/document-tools/convert-document"
    />
  );
}