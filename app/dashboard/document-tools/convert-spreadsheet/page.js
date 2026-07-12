import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import DocumentConvertTool from "@/components/DocumentConvertTool";

export default async function ConvertSpreadsheetPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <DocumentConvertTool
      title="Convert Spreadsheet"
      description="Convert between XLSX, CSV, and ODS. Note: CSV export only includes the first sheet."
      badge="Free • Instant"
      accept=".xlsx,.xls,.csv,.ods"
      endpoint="/api/documents/convert-spreadsheet"
      targetFormats={[
        { value: "xlsx", label: "XLSX" },
        { value: "csv", label: "CSV" },
        { value: "ods", label: "ODS" },
      ]}
      maxSizeLabel="15MB"
    />
  );
}