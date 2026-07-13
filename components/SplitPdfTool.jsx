"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, UploadCloud, FileText, Download, Loader2, AlertTriangle } from "lucide-react";
import { useTrackTool } from "@/lib/useTrackTool";

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function SplitPdfTool() {
  useTrackTool("split-pdf", "Split PDF", "/dashboard/document-tools/split-pdf");

  const [file, setFile] = useState(null);
  const [from, setFrom] = useState("1");
  const [to, setTo] = useState("1");
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const fileInputRef = useRef(null);

  function handleFileSelect(e) {
    const selected = e.target.files?.[0];
    e.target.value = "";
    if (!selected) return;
    setFile(selected);
    setResult(null);
    setError("");
    setStatus("idle");
  }

  async function handleSplit() {
    if (!file) return;
    setStatus("working");
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("from", from);
      formData.append("to", to);

      const res = await fetch("/api/pdf/split", { method: "POST", body: formData });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Split failed");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const baseName = file.name.replace(/\.[^.]+$/, "");
      setResult({ url, filename: `${baseName}-pages-${from}-${to}.pdf` });
      setStatus("done");
    } catch (err) {
      setError(err.message || "Something went wrong");
      setStatus("error");
    }
  }

  function reset() {
    setFile(null);
    setResult(null);
    setError("");
    setStatus("idle");
  }

  return (
    <div className="flex min-h-screen flex-col bg-ink">
      <header className="flex items-center gap-3 border-b border-line px-4 py-4 sm:px-8">
        <Link
          href="/dashboard/document-tools"
          className="text-mist transition hover:text-paper"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <span className="font-display text-sm font-semibold text-paper">Split PDF</span>
      </header>

      <div className="mx-auto w-full max-w-xl flex-1 px-4 py-10 sm:px-0">
        <div className="mb-2 flex items-center gap-2">
          <h1 className="font-display text-2xl font-semibold text-paper">Split PDF</h1>
          <span className="rounded-full border border-line bg-surface px-2.5 py-0.5 text-[10px] text-mist">
            Free • Instant
          </span>
        </div>
        <p className="text-sm text-mist">Pull a page range out of a PDF into its own file.</p>

        <div className="mt-8 rounded-2xl border border-dashed border-line bg-surface p-8 text-center">
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            onChange={handleFileSelect}
            className="hidden"
          />

          {!file ? (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full flex-col items-center gap-3 text-mist transition hover:text-paper"
            >
              <UploadCloud className="h-8 w-8" />
              <span className="text-sm">Click to choose a PDF</span>
              <span className="text-xs text-mist/60">Max 20MB</span>
            </button>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <FileText className="h-8 w-8 text-signal" />
              <div>
                <p className="text-sm text-paper">{file.name}</p>
                <p className="text-xs text-mist">{formatBytes(file.size)}</p>
              </div>

              {status !== "done" && (
                <>
                  <div className="mt-2 flex items-center justify-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-mist">From page</span>
                      <input
                        type="number"
                        min="1"
                        value={from}
                        onChange={(e) => setFrom(e.target.value)}
                        className="w-16 rounded-lg border border-line bg-ink px-2 py-1.5 text-center text-sm text-paper outline-none focus:border-signal"
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-mist">to</span>
                      <input
                        type="number"
                        min="1"
                        value={to}
                        onChange={(e) => setTo(e.target.value)}
                        className="w-16 rounded-lg border border-line bg-ink px-2 py-1.5 text-center text-sm text-paper outline-none focus:border-signal"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleSplit}
                    disabled={status === "working"}
                    className="mt-2 flex items-center gap-2 rounded-full bg-signal px-5 py-2.5 text-sm font-semibold text-ink transition hover:brightness-110 disabled:opacity-60"
                  >
                    {status === "working" && <Loader2 className="h-4 w-4 animate-spin" />}
                    {status === "working" ? "Splitting…" : "Split PDF"}
                  </button>
                </>
              )}

              <button onClick={reset} className="text-xs text-mist underline underline-offset-4">
                Choose a different file
              </button>
            </div>
          )}
        </div>

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-300">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {result && (
          <div className="mt-6 rounded-2xl border border-signal/30 bg-signal/5 p-6 text-center">
            <p className="text-sm text-paper">Your PDF is ready</p>
            <a
              href={result.url}
              download={result.filename}
              className="mt-4 flex items-center justify-center gap-2 rounded-full bg-signal px-5 py-2.5 text-sm font-semibold text-ink transition hover:brightness-110"
            >
              <Download className="h-4 w-4" />
              Download {result.filename}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}