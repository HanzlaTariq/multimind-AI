import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import {
  FileDown,
  Image as ImageIcon,
  Sheet,
  FileType,
  ArrowLeft,
  Combine,
  Scissors,
  Images,
  FileImage,
  Clock,
  Mic,
} from "lucide-react";

const TOOLS = [
  {
    id: "compress-pdf",
    href: "/dashboard/document-tools/compress-pdf",
    icon: FileDown,
    title: "Compress File",
    desc: "Shrink a PDF, image, or Office doc",
    badge: "1 credit",
  },
  {
    id: "convert-image",
    href: "/dashboard/document-tools/convert-image",
    icon: ImageIcon,
    title: "Convert Image",
    desc: "JPG, PNG, WebP, AVIF — any to any",
    badge: "1 credit",
  },
  {
    id: "convert-spreadsheet",
    href: "/dashboard/document-tools/convert-spreadsheet",
    icon: Sheet,
    title: "Convert Spreadsheet",
    desc: "XLSX, CSV, ODS — any to any",
    badge: "1 credit",
  },
  {
    id: "convert-document",
    href: "/dashboard/document-tools/convert-document",
    icon: FileType,
    title: "Convert Document",
    desc: "Word, PDF, PowerPoint — any to any",
    badge: "2 credits",
  },
  {
    id: "merge-pdf",
    href: "/dashboard/document-tools/merge-pdf",
    icon: Combine,
    title: "Merge PDFs",
    desc: "Combine multiple PDFs into one",
    badge: "1 credit",
  },
  {
    id: "split-pdf",
    href: "/dashboard/document-tools/split-pdf",
    icon: Scissors,
    title: "Split PDF",
    desc: "Pull a page range into a new PDF",
    badge: "1 credit",
  },
  {
    id: "images-to-pdf",
    href: "/dashboard/document-tools/images-to-pdf",
    icon: Images,
    title: "Images to PDF",
    desc: "Combine photos into a single PDF",
    badge: "1 credit",
  },
  {
    id: "pdf-to-images",
    href: "/dashboard/document-tools/pdf-to-images",
    icon: FileImage,
    title: "PDF to Images",
    desc: "Export each page as an image",
    badge: "2 credits",
  },
  {
    id: "text-to-speech",
    href: "/dashboard/document-tools/text-to-speech",
    icon: Mic,
    title: "Text to Speech",
    desc: "Generate speech, or clone your own voice",
    badge: "3+ credits",
  },
];

const ICON_BY_ID = Object.fromEntries(TOOLS.map((t) => [t.id, t.icon]));

export default async function DocumentToolsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  await dbConnect();
  const user = await User.findById(session.user.id).select("recentTools").lean();
  const recentTools = user?.recentTools || [];

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

        {recentTools.length > 0 && (
          <>
            <div className="mt-8 flex items-center gap-1.5 text-xs font-medium uppercase tracking-widest text-mist/50">
              <Clock className="h-3 w-3" />
              Recent
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {recentTools.map((t) => {
                const Icon = ICON_BY_ID[t.toolId] || FileType;
                return (
                  <Link
                    key={t.toolId}
                    href={t.href}
                    className="flex items-center gap-3 rounded-xl border border-line bg-surface/60 px-4 py-3 transition hover:border-signal/40 hover:bg-surface2"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-signal/10 text-signal">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="truncate text-sm text-paper">{t.label}</span>
                  </Link>
                );
              })}
            </div>
          </>
        )}

        <div className="mt-8 text-xs font-medium uppercase tracking-widest text-mist/50">
          All tools
        </div>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          {TOOLS.map((t) => (
            <Link
              key={t.id}
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