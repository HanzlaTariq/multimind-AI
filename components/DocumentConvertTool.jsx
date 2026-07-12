"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, UploadCloud, FileText, Download, Loader2, AlertTriangle } from "lucide-react";

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function DocumentConvertTool({
  title,
  description,
  badge,
  accept,
  targetFormats,
  endpoint,
  extraFieldLabel,
  extraFieldName,
  maxSizeLabel = "15MB",
}) {
  const [file, setFile] = useState(null);
  const [targetFormat, setTargetFormat] = useState(targetFormats[0]?.value || "");
  const [extraValue, setExtraValue] = useState("");
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

  async function handleConvert() {
    if (!file) return;
    setStatus("working");
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("format", targetFormat);
      if (extraFieldName && extraValue) formData.append(extraFieldName, extraValue);

      const res = await fetch(endpoint, { method: "POST", body: formData });
      const contentType = res.headers.get("Content-Type") || "";

      if (!res.ok) {
        const data = contentType.includes("application/json") ? await res.json() : {};
        throw new Error(data.error || "Conversion failed");
      }

      if (contentType.includes("application/json")) {
        const data = await res.json();
        setResult({ url: data.downloadUrl, filename: data.filename, external: true });
      } else {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const baseName = file.name.replace(/\.[^.]+$/, "");
        setResult({ url, filename: `${baseName}.${targetFormat}`, external: false });
      }
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
        <span className="font-display text-sm font-semibold text-paper">{title}</span>
      </header>

      <div className="mx-auto w-full max-w-xl flex-1 px-4 py-10 sm:px-0">
        <div className="mb-2 flex items-center gap-2">
          <h1 className="font-display text-2xl font-semibold text-paper">{title}</h1>
          {badge && (
            <span className="rounded-full border border-line bg-surface px-2.5 py-0.5 text-[10px] text-mist">
              {badge}
            </span>
          )}
        </div>
        <p className="text-sm text-mist">{description}</p>

        <div className="mt-8 rounded-2xl border border-dashed border-line bg-surface p-8 text-center">
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={handleFileSelect}
            className="hidden"
          />

          {!file && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full flex-col items-center gap-3 text-mist transition hover:text-paper"
            >
              <UploadCloud className="h-8 w-8" />
              <span className="text-sm">Click to choose a file</span>
              <span className="text-xs text-mist/60">Max {maxSizeLabel}</span>
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
                <>
                  <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
                    {targetFormats.map((f) => (
                      <button
                        key={f.value}
                        onClick={() => setTargetFormat(f.value)}
                        className={`rounded-full border px-3 py-1.5 text-xs transition ${
                          targetFormat === f.value
                            ? "border-signal bg-signal/10 text-signal"
                            : "border-line text-mist hover:text-paper"
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  {extraFieldName && (
                    <input
                      type="number"
                      value={extraValue}
                      onChange={(e) => setExtraValue(e.target.value)}
                      placeholder={extraFieldLabel}
                      className="mt-2 w-56 rounded-lg border border-line bg-ink px-3 py-2 text-center text-sm text-paper outline-none focus:border-signal"
                    />
                  )}

                  <button
                    onClick={handleConvert}
                    disabled={status === "working"}
                    className="mt-3 flex items-center gap-2 rounded-full bg-signal px-5 py-2.5 text-sm font-semibold text-ink transition hover:brightness-110 disabled:opacity-60"
                  >
                    {status === "working" && <Loader2 className="h-4 w-4 animate-spin" />}
                    {status === "working" ? "Converting…" : "Convert"}
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
            <p className="text-sm text-paper">Your file is ready</p>
            <a
              href={result.url}
              download={result.external ? undefined : result.filename}
              target={result.external ? "_blank" : undefined}
              rel={result.external ? "noreferrer" : undefined}
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