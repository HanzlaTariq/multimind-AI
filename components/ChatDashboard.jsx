"use client";

import { useEffect, useRef, useState } from "react";
import { signOut } from "next-auth/react";
import { Send, Plus, LogOut, MessageSquare, Menu, X } from "lucide-react";
import AnswerBubble from "@/components/AnswerBubble";

export default function ChatDashboard({ user }) {
  const [conversations, setConversations] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [turns, setTurns] = useState([]);
  const [prompt, setPrompt] = useState("");
  const [pending, setPending] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns, pending]);

  async function fetchConversations() {
    try {
      const res = await fetch("/api/conversations");
      const data = await res.json();
      if (res.ok) setConversations(data.conversations || []);
    } catch (e) {
      // silent — sidebar is a nice-to-have
    }
  }

  async function openConversation(id) {
    setSidebarOpen(false);
    const res = await fetch(`/api/conversations/${id}`);
    const data = await res.json();
    if (res.ok) {
      setConversationId(id);
      setTurns(data.conversation.turns || []);
    }
  }

  function startNewChat() {
    setConversationId(null);
    setTurns([]);
    setSidebarOpen(false);
  }

  async function handleSend(e) {
    e.preventDefault();
    if (!prompt.trim() || pending) return;

    setError("");
    const currentPrompt = prompt;
    setPrompt("");
    setPending(true);

    // optimistic turn with empty responses so the columns render immediately
    setTurns((prev) => [...prev, { prompt: currentPrompt, responses: [] }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: currentPrompt, conversationId }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong");
        setTurns((prev) => prev.slice(0, -1));
        setPending(false);
        return;
      }

      setConversationId(data.conversationId);
      setTurns((prev) => [...prev.slice(0, -1), data.turn]);
      fetchConversations();
    } catch (err) {
      setError("Network error — please try again");
      setTurns((prev) => prev.slice(0, -1));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex h-screen bg-ink">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 transform border-r border-line bg-surface transition-transform lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col p-4">
          <div className="mb-4 flex items-center justify-between">
            <span className="font-display text-sm font-semibold text-paper">MultiMind</span>
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-mist lg:hidden"
              aria-label="Close sidebar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <button
            onClick={startNewChat}
            className="mb-4 flex items-center justify-center gap-2 rounded-lg border border-line px-3 py-2 text-sm font-medium text-paper transition hover:border-mist"
          >
            <Plus className="h-4 w-4" /> New chat
          </button>

          <div className="flex-1 space-y-1 overflow-y-auto scrollbar-thin">
            {conversations.length === 0 && (
              <p className="px-2 py-4 text-center text-xs text-mist/60">
                Your conversations will show up here.
              </p>
            )}
            {conversations.map((c) => (
              <button
                key={c._id}
                onClick={() => openConversation(c._id)}
                className={`flex w-full items-center gap-2 truncate rounded-lg px-3 py-2 text-left text-sm transition hover:bg-surface2 ${
                  conversationId === c._id ? "bg-surface2 text-paper" : "text-mist"
                }`}
              >
                <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{c.title}</span>
              </button>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-line pt-4">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface2 font-mono text-xs text-paper">
                {user?.name?.[0]?.toUpperCase() || "U"}
              </div>
              <span className="truncate text-sm text-mist">{user?.name}</span>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="text-mist transition hover:text-paper"
              aria-label="Log out"
              title="Log out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {sidebarOpen && (
        <button
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close sidebar overlay"
        />
      )}

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-line px-4 py-3 lg:hidden">
          <button onClick={() => setSidebarOpen(true)} aria-label="Open sidebar">
            <Menu className="h-5 w-5 text-paper" />
          </button>
          <span className="font-display text-sm font-semibold text-paper">MultiMind</span>
        </header>

        <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-6 sm:px-8">
          {turns.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <h2 className="font-display text-2xl font-semibold text-paper">
                Ask something. Get three takes.
              </h2>
              <p className="mt-2 max-w-sm text-sm text-mist">
                Gemini, Groq, and DeepSeek will all answer at once, side by side.
              </p>
            </div>
          )}

          <div className="mx-auto max-w-5xl space-y-8">
            {turns.map((turn, i) => {
              const isLastPending = pending && i === turns.length - 1;

              return (
                <div key={i} className="animate-rise">
                  <div className="mb-3 inline-block rounded-xl bg-surface2 px-4 py-2 text-sm text-paper">
                    {turn.prompt}
                  </div>
                  <AnswerBubble best={turn.best} pending={isLastPending && !turn.best} />
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        </div>

        <div className="border-t border-line p-4 sm:p-6">
          <form onSubmit={handleSend} className="mx-auto flex max-w-5xl items-end gap-3">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(e);
                }
              }}
              rows={1}
              placeholder="Ask Gemini, Groq, and DeepSeek at once…"
              className="max-h-32 flex-1 resize-none rounded-xl border border-line bg-surface px-4 py-3 text-sm text-paper outline-none transition focus:border-signal"
            />
            <button
              type="submit"
              disabled={pending || !prompt.trim()}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-signal text-ink transition hover:brightness-110 disabled:opacity-40"
              aria-label="Send"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
          {error && <p className="mx-auto mt-2 max-w-5xl text-xs text-red-400">{error}</p>}
        </div>
      </div>
    </div>
  );
}
