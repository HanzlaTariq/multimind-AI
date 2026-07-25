"use client";

import { useEffect, useRef, useState } from "react";
import { useSettings } from "@/lib/SettingsContext";
import Sidebar from "./Sidebar";
import ChatHeader from "./ChatHeader";
import ChatInput from "./ChatInput";
import ChatMessages from "./ChatMessages";
import OutlinePanel from "./OutlinePanel";
import DeleteModal from "./DeleteModal";
import TemporaryBanner from "./TemporaryBanner";
import ShareModal from "@/components/ShareModal";
import { exportConversationToPdf } from "@/lib/pdfExport";
import { Sparkles } from "lucide-react";

export default function ChatDashboard({ user }) {
  const { settings } = useSettings();
  
  // State
  const [conversations, setConversations] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [turns, setTurns] = useState([]);
  const [prompt, setPrompt] = useState("");
  const [pending, setPending] = useState(false);
  const [regeneratingIndex, setRegeneratingIndex] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [outlineOpen, setOutlineOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteConversationId, setDeleteConversationId] = useState(null);
  const [shareInfo, setShareInfo] = useState({ isPublic: false, shareId: null });
  const [error, setError] = useState("");
  const [attachment, setAttachment] = useState(null);
  const [imageMode, setImageMode] = useState(false);
  const [temporaryMode, setTemporaryMode] = useState(false);
  const [outlineTab, setOutlineTab] = useState("outline");
  
  const bottomRef = useRef(null);
  const turnRefs = useRef([]);
  const alreadyShownRef = useRef(new Set());

  // Fetch conversations
  useEffect(() => {
    fetchConversations();
  }, []);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns.length, pending]);

  // API functions
  async function fetchConversations() {
    try {
      const res = await fetch("/api/conversations");
      const data = await res.json();
      if (res.ok) setConversations(data.conversations || []);
    } catch (e) {
      // Fail quietly
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
      setShareInfo({
        isPublic: !!data.conversation.isPublic,
        shareId: data.conversation.shareId || null,
      });
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
    setShareInfo({ isPublic: false, shareId: null });
  }

  // ✅ ADD THIS FUNCTION - Ye missing tha
  function handleToggleTemporary() {
    startNewChat();
    setTemporaryMode((v) => !v);
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
        : {
            prompt: text,
            conversationId,
            attachment: useAttachment,
            temporary: temporaryMode,
            clientHistory: temporaryMode
              ? turns.map((t) => ({ prompt: t.prompt, answer: t.best?.text || "" }))
              : undefined,
          };

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
      if (!temporaryMode) fetchConversations();

      if (
        settings.notifyOnComplete &&
        typeof Notification !== "undefined" &&
        Notification.permission === "granted" &&
        document.visibilityState !== "visible"
      ) {
        new Notification("MultiMind", { body: "Your response is ready." });
      }
    } catch (err) {
      setError("Network error — please try again");
      setTurns((prev) => prev.slice(0, -1));
    } finally {
      setPending(false);
    }
  }

  // ✅ FIX: handleSend ko define karo
  async function handleSend(text, opts = {}) {
    await sendPrompt(text, opts);
  }

  async function handleRegenerate(index) {
    const turn = turns[index];
    if (!turn || regeneratingIndex !== null) return;

    const isImageTurn = turn.best?.type === "image";
    setRegeneratingIndex(index);
    setError("");

    try {
      const endpoint = isImageTurn ? "/api/image" : "/api/chat";
      const body = isImageTurn
        ? { prompt: turn.prompt, conversationId }
        : {
            prompt: turn.prompt,
            conversationId,
            temporary: temporaryMode,
            clientHistory: temporaryMode
              ? turns.slice(0, index).map((t) => ({ prompt: t.prompt, answer: t.best?.text || "" }))
              : undefined,
          };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Couldn't regenerate — please try again");
        return;
      }

      setTurns((prev) => prev.map((t, i) => (i === index ? data.turn : t)));
      alreadyShownRef.current.delete(index);
      if (!temporaryMode) fetchConversations();
    } catch (err) {
      setError("Network error — please try again");
    } finally {
      setRegeneratingIndex(null);
    }
  }

  async function handleTogglePin(index) {
    if (!conversationId) return;
    const nextPinned = !turns[index]?.pinned;

    setTurns((prev) => prev.map((t, i) => (i === index ? { ...t, pinned: nextPinned } : t)));

    try {
      await fetch(`/api/conversations/${conversationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ turnIndex: index, pinned: nextPinned }),
      });
    } catch (e) {
      setTurns((prev) => prev.map((t, i) => (i === index ? { ...t, pinned: !nextPinned } : t)));
    }
  }

  async function deleteConversation(id) {
    setDeleteModalOpen(false);
    setDeleteConversationId(null);
    setConversations((prev) => prev.filter((c) => c._id !== id));
    if (id === conversationId) startNewChat();
    try {
      await fetch(`/api/conversations/${id}`, { method: "DELETE" });
    } catch (e) {
      fetchConversations();
    }
  }

  function scrollToTurn(index) {
    setOutlineOpen(false);
    turnRefs.current[index]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function firstName(name) {
    return name?.split(" ")[0] || name || "there";
  }

  const pinnedTurns = turns.map((t, i) => ({ ...t, index: i })).filter((t) => t.pinned);
  const isEmpty = turns.length === 0;
  const initials = user?.name?.[0]?.toUpperCase() || "U";

  return (
    <div className="flex h-screen bg-ink">
      {/* Sidebar */}
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        conversations={conversations}
        conversationId={conversationId}
        onNewChat={startNewChat}
        onOpenConversation={openConversation}
        onDeleteConversation={(id) => {
          setDeleteConversationId(id);
          setDeleteModalOpen(true);
        }}
        user={user}
        initials={initials}
        settings={settings}
      />

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col">
        <ChatHeader
          onToggleSidebar={() => setSidebarOpen(true)}
          onNewChat={startNewChat}
          onToggleTemporary={handleToggleTemporary}
          temporaryMode={temporaryMode}
          isEmpty={isEmpty}
          conversationId={conversationId}
          turns={turns}
          onExport={() => exportConversationToPdf(turns)}
          onShare={() => setShareModalOpen(true)}
          onToggleOutline={() => setOutlineOpen((v) => !v)}
          pinnedCount={pinnedTurns.length}
        />

        {temporaryMode && <TemporaryBanner />}

        {isEmpty ? (
          <div className="flex flex-1 flex-col items-center justify-center px-4 pb-24">
            <div className="mb-8 flex items-center gap-3">
              <Sparkles className="h-7 w-7 shrink-0 text-groq" />
              <h1 className="font-serif text-3xl italic tracking-tight text-paper sm:text-5xl">
                Back at it, {firstName(user?.name)}
              </h1>
            </div>
            <ChatInput
              prompt={prompt}
              setPrompt={setPrompt}
              pending={pending}
              attachment={attachment}
              setAttachment={setAttachment}
              imageMode={imageMode}
              setImageMode={setImageMode}
              temporaryMode={temporaryMode}
              error={error}
              onSend={handleSend}
              isEmpty={isEmpty}
            />
          </div>
        ) : (
          <>
            <ChatMessages
              turns={turns}
              pending={pending}
              regeneratingIndex={regeneratingIndex}
              onRegenerate={handleRegenerate}
              onTogglePin={handleTogglePin}
              conversationId={conversationId}
              temporaryMode={temporaryMode}
              settings={settings}
              alreadyShownRef={alreadyShownRef}
              turnRefs={turnRefs}
              bottomRef={bottomRef}
              onShare={()=>setShareModalOpen(true)}
            />
            <ChatInput
              prompt={prompt}
              setPrompt={setPrompt}
              pending={pending}
              attachment={attachment}
              setAttachment={setAttachment}
              imageMode={imageMode}
              setImageMode={setImageMode}
              temporaryMode={temporaryMode}
              error={error}
              onSend={handleSend}
              isEmpty={isEmpty}
            />
          </>
        )}
      </div>

      {/* Outline Panel */}
      <OutlinePanel
        open={outlineOpen}
        onClose={() => setOutlineOpen(false)}
        turns={turns}
        pinnedTurns={pinnedTurns}
        outlineTab={outlineTab}
        setOutlineTab={setOutlineTab}
        onScrollToTurn={scrollToTurn}
      />

      {/* Delete Modal */}
      <DeleteModal
        open={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setDeleteConversationId(null);
        }}
        onConfirm={() => deleteConversation(deleteConversationId)}
      />

      {/* Share Modal */}
      <ShareModal
        open={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        conversationId={conversationId}
        shareInfo={shareInfo}
        onShareInfoChange={setShareInfo}
      />
    </div>
  );
}