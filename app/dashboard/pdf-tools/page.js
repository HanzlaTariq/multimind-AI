import { redirect } from "next/navigation";

export default function OldPdfToolsRedirect() {
  redirect("/dashboard/document-tools/compress-pdf");
}