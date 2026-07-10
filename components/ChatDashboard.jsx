"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
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
  ListTree,
  Pin,
  Paperclip,
  Image as ImageIcon,
  FileText,
  FileDown,
} from "lucide-react";
import AnswerBubble from "@/components/AnswerBubble";
import { exportConversationToPdf } from "@/lib/pdfExport";

const MAX_ATTACHMENT_BYTES = 150 * 1024; // 150KB — keeps token usage/cost reasonable
const ATTACHMENT_ACCEPT =
  ".js,.jsx,.ts,.tsx,.py,.java,.c,.cpp,.h,.cs,.go,.rb,.php,.html,.css,.scss,.json,.txt,.md,.sql,.sh,.yaml,.yml,.xml";

const SUGGESTIONS = [
  { icon: Code2, label: "Debug my code", prompt: "Explain what's wrong with this code and fix it:\n\n" },
  { icon: Lightbulb, label: "Explain a concept", prompt: "Explain how " },
  { icon: PenLine, label: "Write something", prompt: "Write a short " },
  { icon: Sparkles, label: "Just chat", prompt: "" },
];

export default function ChatDashboard({ user }) {
  const [conversations, setConversations] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [turns, setTurns] = useState([]);
  const [prompt, setPrompt] = useState("");
  const [pending, setPending] = useState(false);
  const [regeneratingIndex, setRegeneratingIndex] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [outlineOpen, setOutlineOpen] = useState(false);
  const [outlineTab, setOutlineTab] = useState("outline"); // "outline" | "pinned"
  const [error, setError] = useState("");
  const [attachment, setAttachment] = useState(null); // { name, content }
  const [imageMode, setImageMode] = useState(false);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);
  const turnRefs = useRef([]);
  const fileInputRef = useRef(null);
  const alreadyShownRef = useRef(new Set()); // indices that shouldn't (re)play the typewriter

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns.length, pending]);

  useEffect(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = "auto";
    textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
  }, [prompt]);

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
      const loadedTurns = data.conversation.turns || [];
      alreadyShownRef.current = new Set(loadedTurns.map((_, i) => i));
      setConversationId(id);
      setTurns(loadedTurns);
    }
  }

  function startNewChat() {
    alreadyShownRef.current = new Set();
    setConversationId(null);
    setTurns([]);
    setPrompt("");
    setAttachment(null);
    setImageMode(false);
    setSidebarOpen(false);
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;

    if (file.size > MAX_ATTACHMENT_BYTES) {
      setError(`"${file.name}" is too large — please attach a file under 150KB.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setError("");
      setAttachment({ name: file.name, content: reader.result });
      textareaRef.current?.focus();
    };
    reader.onerror = () => setError("Couldn't read that file — please try again.");
    reader.readAsText(file);
  }

  function removeAttachment() {
    setAttachment(null);
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

  async function sendPrompt(text, opts = {}) {
    const useImageMode = opts.imageMode ?? imageMode;
    const useAttachment = opts.attachment ?? attachment;

    if ((!text.trim() && !useAttachment) || pending) return;

    setError("");
    setPending(true);
    setTurns((prev) => [
      ...prev,
      {
        prompt: text || `Review ${useAttachment?.name || "this file"}`,
        attachmentName: useAttachment?.name || "",
        responses: [],
        _pendingType: useImageMode ? "image" : "text",
      },
    ]);

    try {
      const endpoint = useImageMode ? "/api/image" : "/api/chat";
      const body = useImageMode
        ? { prompt: text, conversationId }
        : { prompt: text, conversationId, attachment: useAttachment };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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
    if ((!prompt.trim() && !attachment) || pending) return;
    const text = prompt;
    const currentAttachment = attachment;
    const currentImageMode = imageMode;
    setPrompt("");
    setAttachment(null);
    await sendPrompt(text, { attachment: currentAttachment, imageMode: currentImageMode });
  }

  async function handleRegenerate(index) {
    const turn = turns[index];
    if (!turn || regeneratingIndex !== null) return;

    const isImageTurn = turn.best?.type === "image";

    setRegeneratingIndex(index);
    setError("");

    try {
      const endpoint = isImageTurn ? "/api/image" : "/api/chat";
      const res = await fetch(endpoint, {
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
      alreadyShownRef.current.delete(index);
      fetchConversations();
    } catch (err) {
      setError("Network error — please try again");
    } finally {
      setRegeneratingIndex(null);
    }
  }

  async function handleTogglePin(index) {
    if (!conversationId) return;
    const nextPinned = !turns[index]?.pinned;

    // optimistic update
    setTurns((prev) => prev.map((t, i) => (i === index ? { ...t, pinned: nextPinned } : t)));

    try {
      await fetch(`/api/conversations/${conversationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ turnIndex: index, pinned: nextPinned }),
      });
    } catch (e) {
      // revert on failure
      setTurns((prev) => prev.map((t, i) => (i === index ? { ...t, pinned: !nextPinned } : t)));
    }
  }

  function scrollToTurn(index) {
    setOutlineOpen(false);
    turnRefs.current[index]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const pinnedTurns = turns
    .map((t, i) => ({ ...t, index: i }))
    .filter((t) => t.pinned);

  return (
    <div className="flex h-screen bg-ink">
      {/* Left sidebar — conversation history */}
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
            className="mb-2 flex items-center justify-center gap-2 rounded-lg border border-line px-3 py-2 text-sm font-medium text-paper transition hover:border-signal/50 hover:bg-surface2"
          >
            <Plus className="h-4 w-4" /> New chat
          </button>

          <Link
            href="/dashboard/pdf-tools"
            className="mb-4 flex items-center justify-center gap-2 rounded-lg border border-line px-3 py-2 text-sm font-medium text-mist transition hover:border-signal/50 hover:bg-surface2 hover:text-paper"
          >
            <FileDown className="h-4 w-4" /> Compress PDF
          </Link>

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
        <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} aria-label="Open sidebar" className="lg:hidden">
              <Menu className="h-5 w-5 text-paper" />
            </button>
            <span className="font-display text-sm font-semibold text-paper lg:hidden">MultiMind</span>
          </div>

          {turns.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => exportConversationToPdf(turns)}
                className="flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs text-mist transition hover:border-signal/40 hover:text-paper"
                title="Export this whole conversation as a PDF"
              >
                <FileDown className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Export PDF</span>
              </button>
              <button
                onClick={() => setOutlineOpen(true)}
                className="flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs text-mist transition hover:border-signal/40 hover:text-paper"
              >
                <ListTree className="h-3.5 w-3.5" />
                Outline
                {pinnedTurns.length > 0 && (
                  <span className="ml-1 flex items-center gap-0.5 rounded-full bg-signal/15 px-1.5 py-0.5 text-signal">
                    <Pin className="h-2.5 w-2.5" />
                    {pinnedTurns.length}
                  </span>
                )}
              </button>
            </div>
          )}
        </header>

        <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-6 sm:px-8">
          {turns.length === 0 && (
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
          )}

          <div className="mx-auto max-w-3xl space-y-7">
            {turns.map((turn, i) => {
              const isLastPending = pending && i === turns.length - 1;

              return (
                <div
                  key={i}
                  ref={(el) => (turnRefs.current[i] = el)}
                  className="animate-rise scroll-mt-20 space-y-3"
                >
                  <div className="flex justify-end">
                    <div className="flex max-w-[85%] flex-col items-end gap-1.5 sm:max-w-[75%]">
                      {turn.attachmentName && (
                        <div className="flex items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1 text-xs text-mist">
                          <FileText className="h-3 w-3" />
                          {turn.attachmentName}
                        </div>
                      )}
                      <div className="rounded-2xl rounded-tr-sm bg-signal/10 px-4 py-2.5 text-sm text-paper">
                        {turn.prompt}
                      </div>
                    </div>
                  </div>
                  <AnswerBubble
                    best={turn.best}
                    pending={isLastPending && !turn.best}
                    pendingLabel={turn._pendingType === "image" ? "Generating image…" : undefined}
                    regenerating={regeneratingIndex === i}
                    onRegenerate={
                      turn.best && regeneratingIndex === null ? () => handleRegenerate(i) : null
                    }
                    pinned={!!turn.pinned}
                    onTogglePin={turn.best && conversationId ? () => handleTogglePin(i) : null}
                  />
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        </div>

        <div className="border-t border-line bg-ink/95 p-3 backdrop-blur sm:p-5">
          <div className="mx-auto max-w-3xl">
            {attachment && (
              <div className="mb-2 flex w-fit items-center gap-2 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs text-paper">
                <FileText className="h-3.5 w-3.5 text-signal" />
                {attachment.name}
                <button
                  onClick={removeAttachment}
                  className="text-mist transition hover:text-paper"
                  aria-label="Remove attachment"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            <form
              onSubmit={handleSend}
              className="flex items-end gap-2.5 rounded-2xl border border-line bg-surface p-2 shadow-lg shadow-black/20 transition focus-within:border-signal/60 focus-within:shadow-signal/10"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept={ATTACHMENT_ACCEPT}
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={imageMode}
                className="mb-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-mist transition hover:bg-surface2 hover:text-paper disabled:opacity-30"
                title="Attach a code/text file"
                aria-label="Attach file"
              >
                <Paperclip className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => setImageMode((v) => !v)}
                className={`mb-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition ${
                  imageMode
                    ? "bg-signal/15 text-signal"
                    : "text-mist hover:bg-surface2 hover:text-paper"
                }`}
                title={imageMode ? "Image mode on — click to switch back to chat" : "Generate an image instead"}
                aria-label="Toggle image generation mode"
              >
                <ImageIcon className="h-4 w-4" />
              </button>

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
                placeholder={imageMode ? "Describe an image to generate…" : "Message MultiMind…"}
                className="scrollbar-thin max-h-40 flex-1 resize-none bg-transparent px-2.5 py-2 text-sm text-paper outline-none placeholder:text-mist/60"
              />
              <button
                type="submit"
                disabled={pending || (!prompt.trim() && !attachment)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-signal text-ink transition-all hover:brightness-110 hover:shadow-md hover:shadow-signal/30 active:scale-95 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:brightness-100 disabled:hover:shadow-none"
                aria-label="Send"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
            {imageMode && (
              <p className="mt-1.5 px-1 text-[11px] text-mist/60">
                Image mode is on — your next message will generate an image instead of a chat reply.
              </p>
            )}
            {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
          </div>
        </div>
      </div>

      {/* Right panel — outline + pinned answers */}
      {outlineOpen && (
        <button
          className="fixed inset-0 z-40 bg-black/40"
          onClick={() => setOutlineOpen(false)}
          aria-label="Close outline overlay"
        />
      )}
      <aside
        className={`fixed inset-y-0 right-0 z-50 w-80 max-w-[85vw] transform border-l border-line bg-surface transition-transform duration-200 ${
          outlineOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-line px-4 py-4">
            <span className="font-display text-sm font-semibold text-paper">This conversation</span>
            <button onClick={() => setOutlineOpen(false)} className="text-mist" aria-label="Close">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex border-b border-line px-4">
            <button
              onClick={() => setOutlineTab("outline")}
              className={`border-b-2 px-3 py-2.5 text-xs font-medium transition ${
                outlineTab === "outline"
                  ? "border-signal text-paper"
                  : "border-transparent text-mist hover:text-paper"
              }`}
            >
              Outline
            </button>
            <button
              onClick={() => setOutlineTab("pinned")}
              className={`flex items-center gap-1 border-b-2 px-3 py-2.5 text-xs font-medium transition ${
                outlineTab === "pinned"
                  ? "border-signal text-paper"
                  : "border-transparent text-mist hover:text-paper"
              }`}
            >
              Pinned {pinnedTurns.length > 0 && `(${pinnedTurns.length})`}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-thin p-3">
            {outlineTab === "outline" &&
              (turns.length === 0 ? (
                <p className="px-2 py-6 text-center text-xs text-mist/60">Nothing here yet.</p>
              ) : (
                <div className="space-y-1">
                  {turns.map((t, i) => (
                    <button
                      key={i}
                      onClick={() => scrollToTurn(i)}
                      className="flex w-full items-start gap-2 rounded-lg px-3 py-2.5 text-left text-xs text-mist transition hover:bg-surface2 hover:text-paper"
                    >
                      <span className="mt-0.5 shrink-0 font-mono text-[10px] text-mist/50">
                        {i + 1}
                      </span>
                      <span className="line-clamp-2">{t.prompt}</span>
                      {t.pinned && <Pin className="ml-auto h-3 w-3 shrink-0 text-signal" />}
                    </button>
                  ))}
                </div>
              ))}

            {outlineTab === "pinned" &&
              (pinnedTurns.length === 0 ? (
                <p className="px-2 py-6 text-center text-xs text-mist/60">
                  Pin any answer and it'll show up here for quick access.
                </p>
              ) : (
                <div className="space-y-1">
                  {pinnedTurns.map((t) => (
                    <button
                      key={t.index}
                      onClick={() => scrollToTurn(t.index)}
                      className="flex w-full items-start gap-2 rounded-lg px-3 py-2.5 text-left text-xs text-mist transition hover:bg-surface2 hover:text-paper"
                    >
                      <Pin className="mt-0.5 h-3 w-3 shrink-0 text-signal" />
                      <span className="line-clamp-2">{t.prompt}</span>
                    </button>
                  ))}
                </div>
              ))}
          </div>
        </div>
      </aside>
    </div>
  );
}