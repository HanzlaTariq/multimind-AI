"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Inbox as InboxIcon,
  Loader2,
  MessageCircle,
  MessageSquareText,
  Send,
  Instagram,
  Facebook,
} from "lucide-react";

const PLATFORM_ICON = {
  instagram: Instagram,
  facebook: Facebook,
};

const PLATFORM_LABEL = {
  instagram: "Instagram",
  facebook: "Facebook",
  whatsapp: "WhatsApp",
  tiktok: "TikTok",
  twitter: "X",
};

function timeAgo(dateStr) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(dateStr).toLocaleDateString();
}

function ThreadRow({ thread, active, onClick }) {
  const Icon = PLATFORM_ICON[thread.platform] || MessageCircle;
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition ${
        active ? "bg-surface" : "hover:bg-surface"
      }`}
    >
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface2 text-signal">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-medium text-paper">{thread.senderName}</span>
          <span className="shrink-0 text-[11px] text-mist/60">{timeAgo(thread.lastCreatedAt)}</span>
        </span>
        <span className="mt-0.5 flex items-center gap-1.5">
          <span className="truncate text-xs text-mist">
            {thread.lastDirection === "outbound" ? "You: " : ""}
            {thread.lastText || (thread.type === "comment" ? "(comment)" : "(message)")}
          </span>
        </span>
        <span className="mt-1 flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-mist/50">
          {PLATFORM_LABEL[thread.platform] || thread.platform}
          <span className="text-mist/30">·</span>
          {thread.type === "comment" ? "Comment" : "DM"}
          {thread.accountName ? (
            <>
              <span className="text-mist/30">·</span>
              {thread.accountName}
            </>
          ) : null}
        </span>
      </span>
      {thread.unreadCount > 0 && (
        <span className="mt-1 flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-signal px-1.5 text-[10px] font-semibold text-ink">
          {thread.unreadCount}
        </span>
      )}
    </button>
  );
}

function MessageBubble({ message }) {
  const mine = message.direction === "outbound";
  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${
          mine ? "bg-signal text-ink" : "bg-surface text-paper"
        }`}
      >
        {!mine && message.senderName ? (
          <p className="mb-0.5 text-[11px] font-medium text-mist">{message.senderName}</p>
        ) : null}
        <p className="whitespace-pre-wrap break-words">{message.text}</p>
        <p className={`mt-1 text-right text-[10px] ${mine ? "text-ink/60" : "text-mist/50"}`}>
          {new Date(message.createdAt).toLocaleString()}
        </p>
      </div>
    </div>
  );
}

export default function InboxPage() {
  const [threads, setThreads] = useState(null);
  const [error, setError] = useState("");
  const [activeThreadId, setActiveThreadId] = useState(null);
  const [messages, setMessages] = useState(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [replyError, setReplyError] = useState("");
  const scrollRef = useRef(null);

  useEffect(() => {
    fetchThreads();
    const interval = setInterval(fetchThreads, 20000); // light polling — no push channel to the browser
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!activeThreadId) return;
    loadThread(activeThreadId);
  }, [activeThreadId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  async function fetchThreads() {
    try {
      const res = await fetch("/api/inbox");
      const data = await res.json();
      if (res.ok) setThreads(data.threads || []);
      else setError(data.error || "Couldn't load inbox");
    } catch {
      setError("Network error — please try again");
    }
  }

  async function loadThread(threadId) {
    setMessages(null);
    setReplyError("");
    try {
      const res = await fetch(`/api/inbox/${encodeURIComponent(threadId)}`);
      const data = await res.json();
      if (res.ok) {
        setMessages(data.messages || []);
        fetch(`/api/inbox/${encodeURIComponent(threadId)}`, { method: "PATCH" }).then(() => fetchThreads());
      } else {
        setError(data.error || "Couldn't load thread");
      }
    } catch {
      setError("Network error — please try again");
    }
  }

  async function handleSend(e) {
    e.preventDefault();
    if (!reply.trim() || sending || !activeThreadId) return;
    setSending(true);
    setReplyError("");
    try {
      const res = await fetch(`/api/inbox/${encodeURIComponent(activeThreadId)}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: reply.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setReplyError(data.error || "Reply failed");
        return;
      }
      setMessages((prev) => [...(prev || []), data.message]);
      setReply("");
      fetchThreads();
    } catch {
      setReplyError("Network error — please try again");
    } finally {
      setSending(false);
    }
  }

  const activeThread = threads?.find((t) => t.threadId === activeThreadId);

  return (
    <div className="h-screen bg-ink text-paper">
      <div className="mx-auto flex h-full max-w-6xl flex-col">
        <div className="flex items-center gap-3 border-b border-line px-4 py-3 sm:px-6">
          <Link href="/dashboard" className="flex items-center gap-1.5 text-sm text-mist hover:text-paper">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="flex items-center gap-2 font-display text-lg font-semibold text-paper">
            <InboxIcon className="h-5 w-5 text-signal" />
            Inbox
          </h1>
          <p className="hidden text-sm text-mist sm:block">
            Comments and DMs from your connected accounts, in one place.
          </p>
        </div>

        {error && <p className="px-4 pt-3 text-sm text-red-400 sm:px-6">{error}</p>}

        <div className="flex min-h-0 flex-1">
          {/* Thread list */}
          <div className="w-full shrink-0 overflow-y-auto border-r border-line px-2 py-2 sm:w-80">
            {!threads && !error && (
              <div className="flex items-center gap-2 px-3 py-4 text-sm text-mist">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading…
              </div>
            )}

            {threads && threads.length === 0 && (
              <div className="mx-2 mt-6 rounded-2xl border border-dashed border-line p-6 text-center">
                <MessageSquareText className="mx-auto mb-3 h-7 w-7 text-mist/50" />
                <p className="text-sm text-mist">
                  Nothing here yet. Once someone comments or DMs one of your connected accounts, it'll
                  show up here.
                </p>
              </div>
            )}

            {threads?.map((t) => (
              <ThreadRow
                key={t.threadId}
                thread={t}
                active={t.threadId === activeThreadId}
                onClick={() => setActiveThreadId(t.threadId)}
              />
            ))}
          </div>

          {/* Conversation */}
          <div className={`flex min-h-0 flex-1 flex-col ${activeThreadId ? "flex" : "hidden sm:flex"}`}>
            {!activeThreadId && (
              <div className="flex flex-1 items-center justify-center text-sm text-mist/60">
                Select a conversation
              </div>
            )}

            {activeThreadId && (
              <>
                <div className="flex items-center gap-2 border-b border-line px-4 py-3">
                  <span className="text-sm font-medium text-paper">
                    {activeThread?.senderName || "Conversation"}
                  </span>
                  <span className="text-xs text-mist/60">
                    {PLATFORM_LABEL[activeThread?.platform] || activeThread?.platform}
                    {activeThread?.type === "comment" ? " · Comment thread" : " · Direct message"}
                  </span>
                </div>

                <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
                  {!messages && (
                    <div className="flex items-center gap-2 text-sm text-mist">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading…
                    </div>
                  )}
                  {messages?.map((m) => (
                    <MessageBubble key={m._id} message={m} />
                  ))}
                </div>

                <form onSubmit={handleSend} className="border-t border-line p-3">
                  {replyError && <p className="mb-2 text-xs text-red-400">{replyError}</p>}
                  <div className="flex items-end gap-2">
                    <textarea
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSend(e);
                        }
                      }}
                      rows={1}
                      placeholder={
                        activeThread?.type === "comment" ? "Reply to this comment…" : "Send a message…"
                      }
                      className="max-h-32 min-h-[42px] flex-1 resize-none rounded-lg border border-line bg-surface2 px-3 py-2.5 text-sm text-paper outline-none focus:border-signal/50"
                    />
                    <button
                      type="submit"
                      disabled={!reply.trim() || sending}
                      className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-lg bg-signal text-ink transition hover:opacity-90 disabled:opacity-50"
                      aria-label="Send reply"
                    >
                      {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
