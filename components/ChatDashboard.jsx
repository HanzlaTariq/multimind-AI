"use client";

import { useEffect, useRef, useState } from "react";
import { signOut } from "next-auth/react";
import {
  Send,
  Plus,
  LogOut,
  MessageSquare,
  Menu,
  X,
  Trash2,
  Sparkles,
  Code2,
  Lightbulb,
  PenLine,
  Pin,
} from "lucide-react";
import AnswerBubble from "@/components/AnswerBubble";

const SUGGESTIONS = [
  { icon: Code2, label: "Debug my code", prompt: "Explain what's wrong with this code and fix it:\n\n" },
  { icon: Lightbulb, label: "Explain a concept", prompt: "Explain how " },
  { icon: PenLine, label: "Write something", prompt: "Write a short " },
  { icon: Sparkles, label: "Just chat", prompt: "" },
];

const PIN_STORAGE_KEY = "multimind.pinned-turns.v1";

function summarizeText(text, limit = 120) {
  if (!text) return "";
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length <= limit) return cleaned;
  return `${cleaned.slice(0, limit - 1).trimEnd()}…`;
}

function readPinnedStore() {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(PIN_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (err) {
    return {};
  }
}

function readPinnedConversation(conversationId) {
  if (!conversationId || typeof window === "undefined") return [];
  const store = readPinnedStore();
  const value = store[conversationId];
  return Array.isArray(value) ? value.filter((index) => Number.isInteger(index)) : [];
}

function writePinnedConversation(conversationId, pinnedTurnIndexes) {
  if (!conversationId || typeof window === "undefined") return;
  const store = readPinnedStore();
  store[conversationId] = pinnedTurnIndexes;
  window.localStorage.setItem(PIN_STORAGE_KEY, JSON.stringify(store));
}

export default function ChatDashboard({ user }) {
  const [conversations, setConversations] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [turns, setTurns] = useState([]);
  const [prompt, setPrompt] = useState("");
  const [pending, setPending] = useState(false);
  const [regeneratingIndex, setRegeneratingIndex] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTurnIndex, setActiveTurnIndex] = useState(null);
  const [pinnedTurnIndexes, setPinnedTurnIndexes] = useState([]);
  const [error, setError] = useState("");
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);
  const turnRefs = useRef([]);

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns, pending]);

  useEffect(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = "auto";
    textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
  }, [prompt]);

  useEffect(() => {
    if (!conversationId) {
      setPinnedTurnIndexes([]);
      setActiveTurnIndex(null);
      return;
    }

    setPinnedTurnIndexes(readPinnedConversation(conversationId));
    setActiveTurnIndex(null);
  }, [conversationId]);

  async function fetchConversations() {
    try {
      const res = await fetch("/api/conversations");
      const data = await res.json();
      if (res.ok) setConversations(data.conversations || []);
    } catch (e) {
      // sidebar history is a nice-to-have — fail quietly
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
    setPrompt("");
    setSidebarOpen(false);
    setActiveTurnIndex(null);
    setPinnedTurnIndexes([]);
  }

  async function deleteConversation(e, id) {
    e.stopPropagation();
    setConversations((prev) => prev.filter((c) => c._id !== id));
    if (id === conversationId) startNewChat();
    try {
      await fetch(`/api/conversations/${id}`, { method: "DELETE" });
    } catch (e) {
      fetchConversations();
    }
  }

  async function sendPrompt(text) {
    if (!text.trim() || pending) return;

    setError("");
    setPending(true);
    setTurns((prev) => [...prev, { prompt: text, responses: [] }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: text, conversationId }),
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

  async function handleSend(e) {
    e.preventDefault();
    if (!prompt.trim() || pending) return;
    const text = prompt;
    setPrompt("");
    await sendPrompt(text);
  }

  async function handleRegenerate(index) {
    const turn = turns[index];
    if (!turn || regeneratingIndex !== null) return;

    setRegeneratingIndex(index);
    setError("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: turn.prompt, conversationId }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Couldn't regenerate — please try again");
        return;
      }

      setTurns((prev) => prev.map((t, i) => (i === index ? data.turn : t)));
      fetchConversations();
    } catch (err) {
      setError("Network error — please try again");
    } finally {
      setRegeneratingIndex(null);
    }
  }

  function scrollToTurn(index) {
    setActiveTurnIndex(index);
    turnRefs.current[index]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function togglePin(index) {
    if (!conversationId) return;

    setPinnedTurnIndexes((current) => {
      const next = current.includes(index)
        ? current.filter((item) => item !== index)
        : [...current, index].sort((a, b) => a - b);

      writePinnedConversation(conversationId, next);
      return next;
    });
  }

  const pinnedTurns = turns
    .map((turn, index) => ({ turn, index }))
    .filter(({ index }) => pinnedTurnIndexes.includes(index));

  return (
    <div className="flex h-screen bg-ink">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 transform border-r border-line bg-surface transition-transform duration-200 lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col p-4">
          <div className="mb-4 flex items-center justify-between">
            <span className="flex items-center gap-2 font-display text-sm font-semibold text-paper">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-gemini via-groq to-deepseek">
                <span className="h-2 w-2 rounded-sm bg-ink" />
              </span>
              MultiMind
            </span>
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
            className="mb-4 flex items-center justify-center gap-2 rounded-lg border border-line px-3 py-2 text-sm font-medium text-paper transition hover:border-signal/50 hover:bg-surface2"
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
                className={`group flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition hover:bg-surface2 ${
                  conversationId === c._id ? "bg-surface2 text-paper" : "text-mist"
                }`}
              >
                <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                <span className="flex-1 truncate">{c.title}</span>
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => deleteConversation(e, c._id)}
                  className="shrink-0 rounded p-1 text-mist/0 transition hover:bg-red-500/10 hover:text-red-400 group-hover:text-mist/70"
                  aria-label="Delete conversation"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </span>
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
          <div className="mx-auto flex max-w-7xl flex-col gap-6 xl:flex-row">
            <section className="min-w-0 flex-1">
              {turns.length === 0 ? (
                <div className="mx-auto flex h-full max-w-lg flex-col items-center justify-center text-center">
                  <h2 className="font-display text-2xl font-semibold text-paper sm:text-3xl">
                    Ask something. Get the best answer.
                  </h2>
                  <p className="mt-2 max-w-sm text-sm text-mist">
                    Gemini, Groq, and DeepSeek all answer behind the scenes — you just see the best one.
                  </p>

                  <div className="mt-8 grid w-full grid-cols-2 gap-2.5 sm:grid-cols-4">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s.label}
                        onClick={() => {
                          setPrompt(s.prompt);
                          textareaRef.current?.focus();
                        }}
                        className="flex flex-col items-center gap-2 rounded-xl border border-line bg-surface px-3 py-4 text-center transition hover:border-signal/40 hover:bg-surface2"
                      >
                        <s.icon className="h-4 w-4 text-signal" />
                        <span className="text-xs text-mist">{s.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="mx-auto max-w-3xl space-y-7">
                  {turns.map((turn, i) => {
                    const isLastPending = pending && i === turns.length - 1;
                    const isPinned = pinnedTurnIndexes.includes(i);

                    return (
                      <div
                        key={`${i}-${turn.createdAt || "turn"}`}
                        ref={(el) => {
                          turnRefs.current[i] = el;
                        }}
                        className={`animate-rise space-y-3 rounded-3xl border p-1.5 transition ${
                          activeTurnIndex === i
                            ? "border-signal/40 bg-signal/5 shadow-[0_0_0_1px_rgba(77,224,192,0.12)]"
                            : "border-transparent"
                        }`}
                      >
                        <div className="flex justify-end">
                          <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-signal/10 px-4 py-2.5 text-sm text-paper sm:max-w-[75%]">
                            {turn.prompt}
                          </div>
                        </div>
                        <AnswerBubble
                          best={turn.best}
                          pending={isLastPending && !turn.best}
                          regenerating={regeneratingIndex === i}
                          pinned={isPinned}
                          onTogglePin={turn.best && turn.best.status !== "error" ? () => togglePin(i) : null}
                          onRegenerate={
                            turn.best && regeneratingIndex === null ? () => handleRegenerate(i) : null
                          }
                        />
                      </div>
                    );
                  })}
                  <div ref={bottomRef} />
                </div>
              )}
            </section>

            <aside className="w-full shrink-0 xl:w-80 2xl:w-96">
              <div className="rounded-3xl border border-line bg-surface/70 p-4 shadow-sm shadow-black/10 backdrop-blur">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-mist/60">Conversation map</p>
                    <h3 className="mt-1 font-display text-lg font-semibold text-paper">Important points</h3>
                  </div>
                  <div className="rounded-full border border-line bg-ink/60 px-2.5 py-1 text-xs text-mist">
                    {turns.length} turns
                  </div>
                </div>

                {turns.length === 0 ? (
                  <p className="mt-4 text-sm leading-relaxed text-mist">
                    Your key prompts will appear here once you start chatting. Use this panel to jump back to any part of the conversation.
                  </p>
                ) : (
                  <div className="mt-4 space-y-3">
                    {turns.map((turn, index) => {
                      const isPendingTurn = pending && index === turns.length - 1 && !turn.best;

                      return (
                        <button
                          key={`${index}-map-${turn.createdAt || "turn"}`}
                          onClick={() => scrollToTurn(index)}
                          className={`group w-full rounded-2xl border px-3 py-3 text-left transition ${
                            activeTurnIndex === index
                              ? "border-signal/40 bg-signal/8"
                              : "border-line bg-ink/40 hover:border-signal/25 hover:bg-surface2"
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface2 text-[10px] text-mist">
                              {index + 1}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-mist/60">
                                <MessageSquare className="h-3 w-3" />
                                Turn {index + 1}
                              </div>
                              <div className="mt-1 text-sm text-paper">
                                {summarizeText(turn.prompt, 74)}
                              </div>
                              <p className="mt-1 text-xs leading-relaxed text-mist">
                                {isPendingTurn
                                  ? "Answer is loading..."
                                  : summarizeText(turn.best?.text, 110) || "No answer yet."}
                              </p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="mt-5 border-t border-line pt-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.22em] text-mist/60">Pinned replies</p>
                      <h4 className="mt-1 text-sm font-medium text-paper">
                        {pinnedTurns.length ? `${pinnedTurns.length} saved` : "Nothing pinned yet"}
                      </h4>
                    </div>
                    <Pin className="h-4 w-4 text-signal" />
                  </div>

                  {pinnedTurns.length === 0 ? (
                    <p className="mt-3 text-sm leading-relaxed text-mist">
                      Pin any answer with the button under the response. Saved replies stay tied to this conversation in your browser.
                    </p>
                  ) : (
                    <div className="mt-3 space-y-2">
                      {pinnedTurns.map(({ turn, index }) => (
                        <button
                          key={`${index}-pinned-${turn.createdAt || "turn"}`}
                          onClick={() => scrollToTurn(index)}
                          className="w-full rounded-2xl border border-line bg-ink/40 px-3 py-3 text-left transition hover:border-signal/25 hover:bg-surface2"
                        >
                          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-mist/60">
                            <Pin className="h-3 w-3 text-signal" />
                            Pinned
                          </div>
                          <div className="mt-1 text-sm text-paper">
                            {summarizeText(turn.prompt, 72)}
                          </div>
                          <p className="mt-1 max-h-20 overflow-hidden text-xs leading-relaxed text-mist">
                            {summarizeText(turn.best?.text, 120) || "Saved reply"}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </aside>
          </div>
        </div>

        <div className="border-t border-line bg-ink/95 p-3 backdrop-blur sm:p-5">
          <form onSubmit={handleSend} className="mx-auto flex max-w-3xl items-end gap-3 rounded-2xl border border-line/80 bg-surface/80 p-2.5 shadow-[0_18px_40px_-24px_rgba(0,0,0,0.85)]">
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(e);
                }
              }}
              rows={1}
              placeholder="Message MultiMind…"
                className="max-h-40 min-h-[3rem] flex-1 resize-none rounded-xl border border-transparent bg-ink/60 px-4 py-3 text-sm text-paper outline-none transition placeholder:text-mist/50 focus:border-signal/70 focus:bg-ink/80 focus:shadow-[0_0_0_3px_rgba(77,224,192,0.12)]"
            />
            <button
              type="submit"
              disabled={pending || !prompt.trim()}
                className="group flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br from-signal to-[#32bfa3] text-ink shadow-[0_10px_24px_-12px_rgba(77,224,192,0.75)] transition duration-200 hover:-translate-y-0.5 hover:brightness-110 hover:shadow-[0_16px_28px_-12px_rgba(77,224,192,0.9)] disabled:translate-y-0 disabled:opacity-35"
              aria-label="Send"
            >
                <Send className="h-4 w-4 stroke-[2.4] transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </button>
          </form>
          {error && (
            <p className="mx-auto mt-2 max-w-3xl text-xs text-red-400">{error}</p>
          )}
        </div>
      </div>
    </div>
  );
}