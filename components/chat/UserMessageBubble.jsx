"use client";

import { useEffect, useRef, useState } from "react";
import { FileText, Copy, Check, Pencil, RefreshCw, X as XIcon } from "lucide-react";

function formatTime(date) {
  if (!date) return "";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function formatFullDate(date) {
  if (!date) return "";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function UserMessageBubble({
  turn,
  index,
  fontClass,
  canEditOrRetry,
  onEditPrompt,
  onRetry,
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(turn.prompt);
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(draft.length, draft.length);
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  function startEdit() {
    setDraft(turn.prompt);
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    setDraft(turn.prompt);
  }

  function saveEdit() {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === turn.prompt) {
      setEditing(false);
      return;
    }
    setEditing(false);
    onEditPrompt(index, trimmed);
  }

  function handleKeyDown(e) {
    if (e.key === "Escape") {
      e.preventDefault();
      cancelEdit();
    } else if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      saveEdit();
    }
  }

  async function handleCopy() {
    if (!turn.prompt) return;
    try {
      await navigator.clipboard.writeText(turn.prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      // clipboard may be unavailable — fail silently
    }
  }

  return (
    <div className="flex justify-end">
      <div className="group flex max-w-[85%] flex-col items-end gap-1.5 sm:max-w-[75%]">
        {turn.attachmentName && (
          <div className="flex items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1 text-xs text-mist">
            <FileText className="h-3 w-3" />
            {turn.attachmentName}
          </div>
        )}

        {editing ? (
          <div className="w-full min-w-[240px] rounded-2xl rounded-tr-sm border border-signal/50 bg-surface px-3 py-2.5">
            <textarea
              ref={textareaRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              className={`w-full resize-none bg-transparent text-[15px] text-paper outline-none ${fontClass}`}
              style={{ overflow: "hidden" }}
              onInput={(e) => {
                e.target.style.height = "auto";
                e.target.style.height = `${e.target.scrollHeight}px`;
              }}
            />
            <div className="mt-2 flex items-center justify-end gap-1.5 border-t border-line/60 pt-2">
              <button
                onClick={cancelEdit}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-mist transition hover:bg-surface2 hover:text-paper"
                title="Cancel (Esc)"
              >
                <XIcon className="h-3.5 w-3.5" />
                Cancel
              </button>
              <button
                onClick={saveEdit}
                disabled={!draft.trim()}
                className="flex items-center gap-1 rounded-md bg-signal/90 px-2.5 py-1 text-xs font-medium text-ink transition hover:bg-signal disabled:opacity-50"
                title="Save and resend (Enter)"
              >
                <Check className="h-3.5 w-3.5" />
                Save & resend
              </button>
            </div>
          </div>
        ) : (
          <>
            <div
              className={`rounded-2xl rounded-tr-sm bg-surface px-4 py-2.5 text-[15px] text-paper ${fontClass}`}
            >
              {turn.prompt}
            </div>

            <div
              className={`flex items-center gap-1 text-[10px] text-mist/60 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100 ${
                copied ? "opacity-100" : ""
              }`}
            >
              {turn.createdAt && (
                <span className="mr-1 select-none" title={formatFullDate(turn.createdAt)}>
                  {formatTime(turn.createdAt)}
                </span>
              )}

              <button
                onClick={handleCopy}
                className="flex items-center gap-1 rounded-md px-1.5 py-1 transition hover:bg-surface2 hover:text-paper"
                title="Copy message"
              >
                {copied ? <Check className="h-3 w-3 text-signal" /> : <Copy className="h-3 w-3" />}
              </button>

              {canEditOrRetry && (
                <button
                  onClick={startEdit}
                  className="flex items-center gap-1 rounded-md px-1.5 py-1 transition hover:bg-surface2 hover:text-paper"
                  title="Edit and resend"
                >
                  <Pencil className="h-3 w-3" />
                </button>
              )}

              {canEditOrRetry && onRetry && (
                <button
                  onClick={onRetry}
                  className="flex items-center gap-1 rounded-md px-1.5 py-1 transition hover:bg-surface2 hover:text-paper"
                  title="Retry (regenerate response)"
                >
                  <RefreshCw className="h-3 w-3" />
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}