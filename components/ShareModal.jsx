"use client";

import { useState } from "react";
import { X, Copy, Check, Globe, Lock, MessageCircle, Mail } from "lucide-react";

export default function ShareModal({ open, onClose, conversationId, shareInfo, onShareInfoChange }) {
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  const isPublic = !!shareInfo?.isPublic;
  const url =
    shareInfo?.shareId && typeof window !== "undefined"
      ? `${window.location.origin}/share/${shareInfo.shareId}`
      : "";

  async function handleToggle(nextPublic) {
    if (!conversationId) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/conversations/${conversationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublic: nextPublic }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't update sharing");
      onShareInfoChange({
        isPublic: data.conversation.isPublic,
        shareId: data.conversation.shareId,
      });
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      // clipboard may be unavailable — fail silently
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-surface p-6">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold text-paper">Share chat</h3>
          <button
            onClick={onClose}
            className="text-mist transition hover:text-paper"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-line bg-ink px-4 py-3">
          <div className="flex items-center gap-2.5">
            {isPublic ? (
              <Globe className="h-4 w-4 shrink-0 text-signal" />
            ) : (
              <Lock className="h-4 w-4 shrink-0 text-mist" />
            )}
            <p className="text-sm text-paper">
              {isPublic ? "Anyone with the link can view" : "Only you can view"}
            </p>
          </div>
          <button
            onClick={() => handleToggle(!isPublic)}
            disabled={loading}
            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-60 ${
              isPublic ? "bg-signal" : "bg-surface2"
            }`}
            aria-pressed={isPublic}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-ink transition-transform ${
                isPublic ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>

        {error && <p className="mt-2 text-xs text-red-400">{error}</p>}

        {isPublic && url && (
          <>
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-line bg-ink px-3 py-2.5">
              <span className="flex-1 truncate text-xs text-mist">{url}</span>
              <button
                onClick={handleCopy}
                className="flex shrink-0 items-center gap-1 rounded-md bg-surface2 px-2.5 py-1.5 text-xs text-paper transition hover:bg-surface"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-signal" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <a
                href={`https://wa.me/?text=${encodeURIComponent(url)}`}
                target="_blank"
                rel="noreferrer"
                className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-line py-2.5 text-xs text-paper transition hover:border-mist/40"
              >
                <MessageCircle className="h-4 w-4 text-signal" />
                WhatsApp
              </a>
              <a
                href={`mailto:?subject=${encodeURIComponent(
                  "Check out this MultiMind conversation"
                )}&body=${encodeURIComponent(url)}`}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-line py-2.5 text-xs text-paper transition hover:border-mist/40"
              >
                <Mail className="h-4 w-4 text-signal" />
                Email
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}