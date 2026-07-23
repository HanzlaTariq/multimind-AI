"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  AlertTriangle,
  Download,
  Mic,
  Trash2,
  Plus,
  X,
  UploadCloud,
  Play,
  Pause,
} from "lucide-react";
import { useTrackTool } from "@/lib/useTrackTool";

const MAX_CHARS = 5000;

export default function TextToSpeechTool() {
  useTrackTool("text-to-speech", "Text to Speech", "/dashboard/document-tools/text-to-speech");

  const [text, setText] = useState("");
  const [stockVoices, setStockVoices] = useState([]);
  const [myVoices, setMyVoices] = useState([]);
  const [voicesLoading, setVoicesLoading] = useState(true);
  const [selectedVoice, setSelectedVoice] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [audioUrl, setAudioUrl] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const [cloneOpen, setCloneOpen] = useState(false);
  const [cloneName, setCloneName] = useState("");
  const [cloneFile, setCloneFile] = useState(null);
  const [cloning, setCloning] = useState(false);
  const [cloneError, setCloneError] = useState("");

  const audioRef = useRef(null);
  const cloneFileInputRef = useRef(null);

  useEffect(() => {
    fetchVoices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchVoices() {
    setVoicesLoading(true);
    try {
      const res = await fetch("/api/tts/voices");
      const data = await res.json();
      if (res.ok) {
        setStockVoices(data.stock || []);
        setMyVoices(data.mine || []);
        setSelectedVoice((prev) => prev || data.stock?.[0]?.voiceId || "");
      } else {
        setError(data.error || "Couldn't load voices");
      }
    } catch (e) {
      setError("Couldn't load voices — please refresh and try again");
    } finally {
      setVoicesLoading(false);
    }
  }

  async function handleGenerate() {
    if (!text.trim() || !selectedVoice) return;
    setGenerating(true);
    setError("");
    setAudioUrl(null);

    try {
      const res = await fetch("/api/tts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim(), voiceId: selectedVoice }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Couldn't generate speech");
      }

      const blob = await res.blob();
      setAudioUrl(URL.createObjectURL(blob));
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setGenerating(false);
    }
  }

  function handleCloneFileSelect(e) {
    const selected = e.target.files?.[0];
    e.target.value = "";
    if (selected) setCloneFile(selected);
  }

  async function handleCloneSubmit() {
    if (!cloneName.trim() || !cloneFile) {
      setCloneError("Please name your voice and add a sample recording.");
      return;
    }
    setCloning(true);
    setCloneError("");

    try {
      const formData = new FormData();
      formData.append("file", cloneFile);
      formData.append("name", cloneName.trim());

      const res = await fetch("/api/tts/clone-voice", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Voice cloning failed");

      setMyVoices((prev) => [...prev, { voiceId: data.voiceId, name: data.name }]);
      setSelectedVoice(data.voiceId);
      setCloneOpen(false);
      setCloneName("");
      setCloneFile(null);
    } catch (err) {
      setCloneError(err.message || "Something went wrong");
    } finally {
      setCloning(false);
    }
  }

  async function handleDeleteVoice(voiceId) {
    setMyVoices((prev) => prev.filter((v) => v.voiceId !== voiceId));
    if (selectedVoice === voiceId) setSelectedVoice(stockVoices[0]?.voiceId || "");
    try {
      await fetch(`/api/tts/voices/${voiceId}`, { method: "DELETE" });
    } catch (e) {
      fetchVoices();
    }
  }

  function togglePlayback() {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
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
        <span className="font-display text-sm font-semibold text-paper">Text to Speech</span>
      </header>

      <div className="mx-auto w-full max-w-xl flex-1 px-4 py-10 sm:px-0">
        <div className="mb-2 flex items-center gap-2">
          <h1 className="font-display text-2xl font-semibold text-paper">Text to Speech</h1>
          <span className="rounded-full border border-line bg-surface px-2.5 py-0.5 text-[10px] text-mist">
            3+ credits 
          </span>
        </div>
        <p className="text-sm text-mist">
          Turn text into natural-sounding speech — pick a stock voice, or clone your own from a
          short recording.
        </p>

        <div className="mt-6">
          <label className="mb-1.5 block text-sm text-mist">Voice</label>
          {voicesLoading ? (
            <div className="flex items-center gap-2 text-xs text-mist">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Loading voices…
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedVoice}
                onChange={(e) => setSelectedVoice(e.target.value)}
                className="rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm text-paper outline-none focus:border-signal"
              >
                {myVoices.length > 0 && (
                  <optgroup label="My voices">
                    {myVoices.map((v) => (
                      <option key={v.voiceId} value={v.voiceId}>
                        {v.name}
                      </option>
                    ))}
                  </optgroup>
                )}
                <optgroup label="Stock voices">
                  {stockVoices.map((v) => (
                    <option key={v.voiceId} value={v.voiceId}>
                      {v.name}
                    </option>
                  ))}
                </optgroup>
              </select>

              {myVoices.some((v) => v.voiceId === selectedVoice) && (
                <button
                  onClick={() => handleDeleteVoice(selectedVoice)}
                  className="flex items-center gap-1 rounded-lg border border-line px-2.5 py-2 text-xs text-mist transition hover:border-red-500/40 hover:text-red-400"
                  title="Delete this cloned voice"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}

              <button
                onClick={() => setCloneOpen(true)}
                className="flex items-center gap-1.5 rounded-lg border border-dashed border-line px-3 py-2 text-xs text-mist transition hover:border-signal/40 hover:text-paper"
              >
                <Plus className="h-3.5 w-3.5" />
                Clone your voice
              </button>
            </div>
          )}
        </div>

        <div className="mt-6">
          <label className="mb-1.5 block text-sm text-mist">Text</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            maxLength={MAX_CHARS}
            placeholder="Type or paste the text you want spoken…"
            className="w-full resize-none rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm text-paper outline-none placeholder:text-mist/50 focus:border-signal"
          />
          <p className="mt-1 text-right text-xs text-mist/50">
            {text.length}/{MAX_CHARS}
          </p>
        </div>

        <button
          onClick={handleGenerate}
          disabled={generating || !text.trim() || !selectedVoice}
          className="mt-2 flex items-center gap-2 rounded-full bg-signal px-5 py-2.5 text-sm font-semibold text-ink transition hover:brightness-110 disabled:opacity-60"
        >
          {generating && <Loader2 className="h-4 w-4 animate-spin" />}
          {generating ? "Generating…" : "Generate speech"}
        </button>

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-300">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {audioUrl && (
          <div className="mt-6 rounded-2xl border border-signal/30 bg-signal/5 p-6">
            <audio
              ref={audioRef}
              src={audioUrl}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => setIsPlaying(false)}
              className="hidden"
            />
            <div className="flex items-center justify-between">
              <button
                onClick={togglePlayback}
                className="flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm text-paper transition hover:border-mist/40"
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {isPlaying ? "Pause" : "Play"}
              </button>
              <a
                href={audioUrl}
                download="speech.mp3"
                className="flex items-center gap-2 rounded-full bg-signal px-4 py-2 text-sm font-semibold text-ink transition hover:brightness-110"
              >
                <Download className="h-4 w-4" />
                Download
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Clone voice modal */}
      {cloneOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-sm rounded-2xl border border-line bg-surface p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold text-paper">Clone your voice</h3>
              <button
                onClick={() => setCloneOpen(false)}
                className="text-mist transition hover:text-paper"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <label className="mb-1.5 block text-sm text-mist">Voice name</label>
            <input
              value={cloneName}
              onChange={(e) => setCloneName(e.target.value)}
              placeholder="e.g. My voice"
              className="mb-4 w-full rounded-lg border border-line bg-ink px-3.5 py-2.5 text-sm text-paper outline-none placeholder:text-mist/50 focus:border-signal"
            />

            <label className="mb-1.5 block text-sm text-mist">Sample recording</label>
            <input
              ref={cloneFileInputRef}
              type="file"
              accept="audio/*"
              onChange={handleCloneFileSelect}
              className="hidden"
            />
            <button
              onClick={() => cloneFileInputRef.current?.click()}
              className="flex w-full flex-col items-center gap-2 rounded-lg border border-dashed border-line bg-ink px-4 py-6 text-mist transition hover:text-paper"
            >
              <UploadCloud className="h-6 w-6" />
              <span className="text-xs">
                {cloneFile ? cloneFile.name : "Upload a clear 1-3 minute recording of your voice"}
              </span>
            </button>

            {cloneError && <p className="mt-3 text-xs text-red-400">{cloneError}</p>}

            <button
              onClick={handleCloneSubmit}
              disabled={cloning}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-signal px-5 py-2.5 text-sm font-semibold text-ink transition hover:brightness-110 disabled:opacity-60"
            >
              {cloning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic className="h-4 w-4" />}
              {cloning ? "Cloning…" : "Create voice"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}