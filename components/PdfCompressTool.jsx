"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, UploadCloud, FileText, Download, Loader2, AlertTriangle } from "lucide-react";

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function PdfCompressTool() {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | working | done | error
  const [error, setError] = useState("");
  const [result, setResult] = useState(null); // { url, originalSize, compressedSize, savedPercent, filename }
  const fileInputRef = useRef(null);

  function handleFileSelect(e) {
    const selected = e.target.files?.[0];
    e.target.value = "";
    if (!selected) return;
    if (selected.type !== "application/pdf") {
      setError("Please select a PDF file.");
      return;
    }
    setFile(selected);
    setResult(null);
    setError("");
    setStatus("idle");
  }

  async function handleCompress() {
    if (!file) return;
    setStatus("working");
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/pdf/compress", { method: "POST", body: formData });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Compression failed");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const originalSize = Number(res.headers.get("X-Original-Size") || file.size);
      const compressedSize = Number(res.headers.get("X-Compressed-Size") || blob.size);
      const savedPercent = Number(res.headers.get("X-Saved-Percent") || 0);

      setResult({
        url,
        originalSize,
        compressedSize,
        savedPercent,
        filename: `compressed-${file.name}`,
      });
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
        <Link href="/dashboard/document-tools" className="text-mist transition hover:text-paper" aria-label="Back">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <span className="font-display text-sm font-semibold text-paper">Compress PDF</span>
      </header>

      <div className="mx-auto w-full max-w-xl flex-1 px-4 py-10 sm:px-0">
        <h1 className="font-display text-2xl font-semibold text-paper">Shrink a PDF's file size</h1>
        <p className="mt-2 text-sm text-mist">
          Uploads a PDF and rewrites its internal structure to remove duplicate/unused data. Works
          best on text-heavy PDFs — image-heavy files will shrink less, since we don't re-encode
          embedded images.
        </p>

        <div className="mt-8 rounded-2xl border border-dashed border-line bg-surface p-8 text-center">
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            onChange={handleFileSelect}
            className="hidden"
          />

          {!file && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full flex-col items-center gap-3 text-mist transition hover:text-paper"
            >
              <UploadCloud className="h-8 w-8" />
              <span className="text-sm">Click to choose a PDF file</span>
              <span className="text-xs text-mist/60">Max 15MB</span>
            </button>
          )}

          {file && (
            <div className="flex flex-col items-center gap-3">
              <FileText className="h-8 w-8 text-signal" />
              <div>
                <p className="text-sm text-paper">{file.name}</p>
                <p className="text-xs text-mist">{formatBytes(file.size)}</p>
              </div>

              {status !== "done" && (
                <button
                  onClick={handleCompress}
                  disabled={status === "working"}
                  className="mt-2 flex items-center gap-2 rounded-full bg-signal px-5 py-2.5 text-sm font-semibold text-ink transition hover:brightness-110 disabled:opacity-60"
                >
                  {status === "working" && <Loader2 className="h-4 w-4 animate-spin" />}
                  {status === "working" ? "Compressing…" : "Compress PDF"}
                </button>
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
          <div className="mt-6 rounded-2xl border border-signal/30 bg-signal/5 p-6">
            <div className="flex items-center justify-between text-sm">
              <span className="text-mist">Original size</span>
              <span className="text-paper">{formatBytes(result.originalSize)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="text-mist">Compressed size</span>
              <span className="font-semibold text-signal">{formatBytes(result.compressedSize)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="text-mist">Saved</span>
              <span className="text-paper">{result.savedPercent}%</span>
            </div>

            <a
              href={result.url}
              download={result.filename}
              className="mt-5 flex items-center justify-center gap-2 rounded-full bg-signal px-5 py-2.5 text-sm font-semibold text-ink transition hover:brightness-110"
            >
              <Download className="h-4 w-4" />
              Download compressed PDF
            </a>
          </div>
        )}
      </div>
    </div>
  );
}