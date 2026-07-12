import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { FileDown, Image as ImageIcon, Sheet, FileType, ArrowLeft } from "lucide-react";

const TOOLS = [
  {
    href: "/dashboard/document-tools/compress-pdf",
    icon: FileDown,
    title: "Compress PDF",
    desc: "Shrink a PDF's file size",
    badge: "Free",
  },
  {
    href: "/dashboard/document-tools/convert-image",
    icon: ImageIcon,
    title: "Convert Image",
    desc: "JPG, PNG, WebP, AVIF — any to any",
    badge: "Free",
  },
  {
    href: "/dashboard/document-tools/convert-spreadsheet",
    icon: Sheet,
    title: "Convert Spreadsheet",
    desc: "XLSX, CSV, ODS — any to any",
    badge: "Free",
  },
  {
    href: "/dashboard/document-tools/convert-document",
    icon: FileType,
    title: "Convert Document",
    desc: "Word, PDF, PowerPoint — any to any",
    badge: "Premium",
  },
];

export default async function DocumentToolsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen bg-ink px-4 py-10 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 text-sm text-mist transition hover:text-paper"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to chat
        </Link>
        <h1 className="mt-4 font-display text-3xl font-semibold text-paper">Document Tools</h1>
        <p className="mt-2 text-sm text-mist">Everything you need for your files, in one place.</p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {TOOLS.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className="group flex flex-col gap-3 rounded-2xl border border-line bg-surface p-5 transition hover:border-signal/40 hover:bg-surface2"
            >
              <div className="flex items-center justify-between">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-signal/10 text-signal">
                  <t.icon className="h-4 w-4" />
                </span>
                <span className="rounded-full border border-line px-2 py-0.5 text-[10px] text-mist">
                  {t.badge}
                </span>
              </div>
              <div>
                <p className="font-medium text-paper">{t.title}</p>
                <p className="mt-0.5 text-xs text-mist">{t.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}