"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  UploadCloud,
  FileText,
  Download,
  Loader2,
  AlertTriangle,
  X,
  GripVertical,
} from "lucide-react";
import { useTrackTool } from "@/lib/useTrackTool";

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function MergePdfTool() {
  useTrackTool("merge-pdf", "Merge PDFs", "/dashboard/document-tools/merge-pdf");

  const [files, setFiles] = useState([]);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const fileInputRef = useRef(null);

  function handleFileSelect(e) {
    const selected = Array.from(e.target.files || []);
    e.target.value = "";
    if (!selected.length) return;
    setFiles((prev) => [...prev, ...selected]);
    setResult(null);
    setError("");
    setStatus("idle");
  }

  function removeFile(index) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function moveFile(index, direction) {
    setFiles((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function handleMerge() {
    if (files.length < 2) {
      setError("Please add at least two PDFs to merge.");
      return;
    }
    setStatus("working");
    setError("");

    try {
      const formData = new FormData();
      files.forEach((f) => formData.append("files", f));

      const res = await fetch("/api/pdf/merge", { method: "POST", body: formData });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Merge failed");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setResult({ url, filename: "merged.pdf" });
      setStatus("done");
    } catch (err) {
      setError(err.message || "Something went wrong");
      setStatus("error");
    }
  }

  function reset() {
    setFiles([]);
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
        <span className="font-display text-sm font-semibold text-paper">Merge PDFs</span>
      </header>

      <div className="mx-auto w-full max-w-xl flex-1 px-4 py-10 sm:px-0">
        <div className="mb-2 flex items-center gap-2">
          <h1 className="font-display text-2xl font-semibold text-paper">Merge PDFs</h1>
          <span className="rounded-full border border-line bg-surface px-2.5 py-0.5 text-[10px] text-mist">
            1 credit • Instant
          </span>
        </div>
        <p className="text-sm text-mist">Combine multiple PDFs into one, in the order you choose.</p>

        <div className="mt-8 rounded-2xl border border-dashed border-line bg-surface p-8">
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />

          {files.length === 0 ? (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full flex-col items-center gap-3 text-mist transition hover:text-paper"
            >
              <UploadCloud className="h-8 w-8" />
              <span className="text-sm">Click to choose PDF files</span>
              <span className="text-xs text-mist/60">Select two or more, up to 30MB total</span>
            </button>
          ) : (
            <div className="space-y-2">
              {files.map((f, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 rounded-lg border border-line bg-ink px-3 py-2"
                >
                  <GripVertical className="h-3.5 w-3.5 shrink-0 text-mist/40" />
                  <FileText className="h-4 w-4 shrink-0 text-signal" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs text-paper">{f.name}</p>
                    <p className="text-[10px] text-mist">{formatBytes(f.size)}</p>
                  </div>
                  <button
                    onClick={() => moveFile(i, -1)}
                    disabled={i === 0}
                    className="text-mist disabled:opacity-20"
                    aria-label="Move up"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => moveFile(i, 1)}
                    disabled={i === files.length - 1}
                    className="text-mist disabled:opacity-20"
                    aria-label="Move down"
                  >
                    ↓
                  </button>
                  <button
                    onClick={() => removeFile(i)}
                    className="text-mist transition hover:text-red-400"
                    aria-label="Remove"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}

              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full rounded-lg border border-dashed border-line py-2 text-xs text-mist transition hover:text-paper"
              >
                + Add more PDFs
              </button>

              {status !== "done" && (
                <button
                  onClick={handleMerge}
                  disabled={status === "working"}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-full bg-signal px-5 py-2.5 text-sm font-semibold text-ink transition hover:brightness-110 disabled:opacity-60"
                >
                  {status === "working" && <Loader2 className="h-4 w-4 animate-spin" />}
                  {status === "working" ? "Merging…" : `Merge ${files.length} PDFs`}
                </button>
              )}

              <button
                onClick={reset}
                className="w-full text-center text-xs text-mist underline underline-offset-4"
              >
                Start over
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
            <p className="text-sm text-paper">Your merged PDF is ready</p>
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