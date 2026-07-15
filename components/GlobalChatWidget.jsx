"use client";

import { useEffect, useRef, useState } from "react";
import {
  MessageCircle,
  X,
  Send,
  Minimize2,
  Maximize2,
  Plus,
  Paperclip,
} from "lucide-react";
import AnswerBubble from "@/components/AnswerBubble";

const MAX_ATTACHMENT_BYTES = 150 * 1024;
const ATTACHMENT_ACCEPT =
  ".js,.jsx,.ts,.tsx,.py,.java,.c,.cpp,.h,.cs,.go,.rb,.php,.html,.css,.scss,.json,.txt,.md,.sql,.sh,.yaml,.yml,.xml";

export default function GlobalChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [turns, setTurns] = useState([]);
  const [prompt, setPrompt] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [attachment, setAttachment] = useState(null);
  const [conversationId, setConversationId] = useState(null);
  const textareaRef = useRef(null);
  const bottomRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns.length, pending]);

  useEffect(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = "auto";
    textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 80)}px`;
  }, [prompt]);

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
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

  async function handleSend(e) {
    e.preventDefault();
    if ((!prompt.trim() && !attachment) || pending) return;

    const text = prompt;
    const currentAttachment = attachment;

    setError("");
    setPending(true);
    setTurns((prev) => [
      ...prev,
      {
        prompt: text || `Review ${currentAttachment?.name || "this file"}`,
        attachmentName: currentAttachment?.name || "",
        responses: [],
        _pendingType: "text",
      },
    ]);
    setPrompt("");
    setAttachment(null);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: text,
          conversationId,
          attachment: currentAttachment,
          temporary: true,
          clientHistory: turns.map((t) => ({ prompt: t.prompt, answer: t.best?.text || "" })),
        }),
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
    } catch (err) {
      setError("Network error — please try again");
      setTurns((prev) => prev.slice(0, -1));
    } finally {
      setPending(false);
    }
  }

  function startNewChat() {
    setConversationId(null);
    setTurns([]);
    setPrompt("");
    setAttachment(null);
    setError("");
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-signal shadow-lg transition hover:scale-110 active:scale-95"
        title="Open chat"
        aria-label="Open chat"
      >
        <MessageCircle className="h-6 w-6 text-ink" />
      </button>
    );
  }

  return (
    <div
      className={`fixed bottom-6 right-6 z-40 flex flex-col rounded-2xl border border-line bg-ink shadow-2xl shadow-black/40 transition-all ${
        isMinimized ? "h-14 w-96" : "h-[600px] w-96"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <h2 className="font-medium text-paper">Chat with MultiMind</h2>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized((v) => !v)}
            className="rounded-md p-1 text-mist transition hover:bg-surface hover:text-paper"
            title={isMinimized ? "Expand" : "Minimize"}
          >
            {isMinimized ? (
              <Maximize2 className="h-4 w-4" />
            ) : (
              <Minimize2 className="h-4 w-4" />
            )}
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="rounded-md p-1 text-mist transition hover:bg-surface hover:text-paper"
            title="Close chat"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto space-y-4 px-4 py-4">
            {turns.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <MessageCircle className="mb-2 h-8 w-8 text-mist/40" />
                <p className="text-sm text-mist">Start a conversation</p>
              </div>
            ) : (
              <>
                {turns.map((turn, index) => (
                  <div key={index} className="space-y-2">
                    {/* User Prompt */}
                    <div className="flex justify-end">
                      <div className="max-w-xs rounded-lg bg-signal/20 px-3 py-2 text-right text-xs text-paper">
                        {turn.prompt}
                      </div>
                    </div>
                    {/* Response */}
                    <div className="flex justify-start">
                      {turn.best ? (
                        <div className="max-w-xs">
                          <AnswerBubble
                            best={turn.best}
                            responses={turn.responses || []}
                            pending={false}
                            regenerating={false}
                            shouldType={false}
                            fontClass="text-[12px]"
                          />
                        </div>
                      ) : (
                        <div className="max-w-xs rounded-lg border border-line bg-surface px-3 py-2">
                          <div className="flex gap-1">
                            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-signal/70 [animation-delay:-0.3s]" />
                            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-signal/70 [animation-delay:-0.15s]" />
                            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-signal/70" />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="border-t border-line bg-red-500/10 px-4 py-2 text-xs text-red-300">
              {error}
            </div>
          )}

          {/* Input Area */}
          <div className="border-t border-line p-3 space-y-2">
            {/* Attachment Display */}
            {attachment && (
              <div className="flex items-center justify-between rounded-lg bg-surface2 px-3 py-2 text-xs">
                <span className="text-mist">{attachment.name}</span>
                <button
                  onClick={removeAttachment}
                  className="text-mist/60 transition hover:text-paper"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}

            {/* Input Form */}
            <form onSubmit={handleSend} className="flex gap-2">
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
                placeholder="Ask anything..."
                className="flex-1 resize-none rounded-lg border border-line bg-surface px-3 py-2 text-xs text-paper outline-none transition placeholder:text-mist/50 hover:border-mist/30 focus:border-signal"
                rows={1}
              />
              <div className="flex gap-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ATTACHMENT_ACCEPT}
                  onChange={handleFileChange}
                  className="hidden"
                  aria-label="Attach file"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-md bg-surface2 p-2 text-mist transition hover:bg-surface hover:text-paper"
                  title="Attach file"
                >
                  <Paperclip className="h-4 w-4" />
                </button>
                <button
                  type="submit"
                  disabled={pending || (!prompt.trim() && !attachment)}
                  className="rounded-md bg-signal p-2 text-ink transition hover:bg-signal/90 disabled:opacity-50"
                  title="Send message"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </form>

            {/* New Chat Button */}
            {turns.length > 0 && (
              <button
                onClick={startNewChat}
                className="w-full flex items-center justify-center gap-1 rounded-md bg-surface2 px-3 py-1.5 text-xs text-mist transition hover:bg-surface hover:text-paper"
              >
                <Plus className="h-3 w-3" />
                New Chat
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
