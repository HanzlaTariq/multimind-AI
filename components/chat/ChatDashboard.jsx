"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSettings } from "@/lib/SettingsContext";
import Sidebar from "./Sidebar";
import ChatHeader from "./ChatHeader";
import ChatInput from "./ChatInput";
import ChatMessages from "./ChatMessages";
import OutlinePanel from "./OutlinePanel";
import DeleteModal from "./DeleteModal";
import TemporaryBanner from "./TemporaryBanner";
import Suggestions from "./Suggestions";
import ShareModal from "@/components/ShareModal";
import ProjectSettingsModal from "./ProjectSettingsModal";
import MoveToProjectModal from "./MoveToProjectModal";
import { exportConversationToPdf } from "@/lib/pdfExport";
import { Sparkles, FolderKanban, ArrowLeft, Settings as SettingsIcon } from "lucide-react";

export default function ChatDashboard({ user, project = null }) {
  const { settings } = useSettings();
  const router = useRouter();
  const projectId = project?._id || null;
  const [projectData, setProjectData] = useState(project);
  const [projectSettingsOpen, setProjectSettingsOpen] = useState(false);
  const [deleteProjectConfirmOpen, setDeleteProjectConfirmOpen] = useState(false);
  const [deletingProject, setDeletingProject] = useState(false);
  const [moveTargetConversationId, setMoveTargetConversationId] = useState(null);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns.length, pending]);

  // API functions
  async function fetchConversations() {
    try {
      const url = projectId ? `/api/conversations?projectId=${projectId}` : "/api/conversations";
      const res = await fetch(url);
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
            projectId,
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

  async function handleSend(text, opts = {}) {
    await sendPrompt(text, opts);
  }

  async function handleEditPrompt(index, newText) {
    if (!newText.trim() || pending || regeneratingIndex !== null) return;

    const truncated = turns.slice(0, index);
    setError("");
    setPending(true);
    setTurns([
      ...truncated,
      { prompt: newText, responses: [], _pendingType: "text" },
    ]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: newText,
          conversationId,
          projectId,
          editIndex: index,
          temporary: temporaryMode,
          clientHistory: temporaryMode
            ? truncated.map((t) => ({ prompt: t.prompt, answer: t.best?.text || "" }))
            : undefined,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Couldn't resend — please try again");
        setTurns(truncated);
        setPending(false);
        return;
      }

      alreadyShownRef.current.delete(index);
      setConversationId(data.conversationId);
      setTurns([...truncated, data.turn]);
      if (!temporaryMode) fetchConversations();
    } catch (err) {
      setError("Network error — please try again");
      setTurns(truncated);
    } finally {
      setPending(false);
    }
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
            projectId,
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

  // Whole-conversation rename — shows up in the sidebar list.
  async function renameConversation(id, newTitle) {
    setConversations((prev) => prev.map((c) => (c._id === id ? { ...c, title: newTitle } : c)));
    try {
      await fetch(`/api/conversations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle }),
      });
    } catch (e) {
      fetchConversations();
    }
  }

  // Whole-conversation pin — pins the chat itself to the top of the
  // sidebar (distinct from pinning a single answer inside a chat).
  async function toggleConversationPin(id, nextPinned) {
    setConversations((prev) => prev.map((c) => (c._id === id ? { ...c, pinned: nextPinned } : c)));
    try {
      await fetch(`/api/conversations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pinned: nextPinned }),
      });
    } catch (e) {
      fetchConversations();
    }
  }

  async function handleSaveProjectSettings({ name, instructions }) {
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, instructions }),
      });
      const data = await res.json();
      if (!res.ok) return false;
      setProjectData(data.project);
      return true;
    } catch (e) {
      return false;
    }
  }

  async function handleUploadProjectFile({ name, content }) {
    try {
      const res = await fetch(`/api/projects/${projectId}/files`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, content }),
      });
      const data = await res.json();
      if (!res.ok) return false;
      setProjectData(data.project);
      return true;
    } catch (e) {
      return false;
    }
  }

  async function handleDeleteProjectFile(fileId) {
    try {
      const res = await fetch(`/api/projects/${projectId}/files?fileId=${fileId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) setProjectData(data.project);
    } catch (e) {
      // Fail quietly
    }
  }

  async function handleDeleteProject() {
    setDeletingProject(true);
    try {
      await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
      router.push("/dashboard/projects");
    } catch (e) {
      setDeletingProject(false);
    }
  }

  // Moves an existing chat into a project — that chat then only shows up
  // inside that project's workspace, not in the main Recents list.
  async function moveConversationToProject(id, targetProjectId) {
    try {
      const res = await fetch(`/api/conversations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: targetProjectId }),
      });
      if (!res.ok) return false;
      setConversations((prev) => prev.filter((c) => c._id !== id));
      if (id === conversationId) startNewChat();
      setMoveTargetConversationId(null);
      return true;
    } catch (e) {
      return false;
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
    <div className="flex h-dvh bg-ink">
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
        onRenameConversation={renameConversation}
        onToggleConversationPin={toggleConversationPin}
        onMoveToProject={(id) => setMoveTargetConversationId(id)}
        user={user}
        initials={initials}
        settings={settings}
      />

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col">
        {project && (
          <div className="flex items-center gap-2 border-b border-line/70 bg-surface/40 px-4 py-2">
            <Link
              href="/dashboard/projects"
              className="flex items-center gap-1 rounded-md px-1.5 py-1 text-xs text-mist transition hover:bg-surface2 hover:text-paper"
              title="Back to projects"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
            </Link>
            <FolderKanban className="h-3.5 w-3.5 shrink-0 text-signal" />
            <span className="truncate text-xs font-medium text-paper">{projectData.name}</span>
            <span className="rounded-full border border-line px-1.5 py-0.5 text-[10px] text-mist/60">
              Project
            </span>
            <button
              onClick={() => setProjectSettingsOpen(true)}
              className="ml-auto flex items-center gap-1 rounded-md px-2 py-1 text-xs text-mist transition hover:bg-surface2 hover:text-paper"
              title="Project instructions & files"
            >
              <SettingsIcon className="h-3.5 w-3.5" />
              Instructions & files
            </button>
          </div>
        )}

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
                {project ? projectData.name : `Back at it, ${firstName(user?.name)}`}
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
              setError={setError}
              onSend={handleSend}
              isEmpty={isEmpty}
            />
            {!project && <Suggestions onSelect={(text) => setPrompt(text)} />}
          </div>
        ) : (
          <>
            <ChatMessages
              turns={turns}
              pending={pending}
              regeneratingIndex={regeneratingIndex}
              onRegenerate={handleRegenerate}
              onEditPrompt={handleEditPrompt}
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
              setError={setError}
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

      {/* Project Settings Modal */}
      {project && projectSettingsOpen && (
        <ProjectSettingsModal
          project={projectData}
          onClose={() => setProjectSettingsOpen(false)}
          onSave={handleSaveProjectSettings}
          onUploadFile={handleUploadProjectFile}
          onDeleteFile={handleDeleteProjectFile}
          onRequestDeleteProject={() => {
            setProjectSettingsOpen(false);
            setDeleteProjectConfirmOpen(true);
          }}
        />
      )}

      {/* Delete Project Modal */}
      {project && (
        <DeleteModal
          open={deleteProjectConfirmOpen}
          onClose={() => !deletingProject && setDeleteProjectConfirmOpen(false)}
          onConfirm={handleDeleteProject}
          title={`Delete "${projectData.name}"?`}
          message="This deletes the project, its instructions, and its files. Chats inside it move back to your main Recents list instead of being deleted."
        />
      )}
      {/* Move to Project Modal */}
      {moveTargetConversationId && (
        <MoveToProjectModal
          onClose={() => setMoveTargetConversationId(null)}
          onMove={(targetProjectId) =>
            moveConversationToProject(moveTargetConversationId, targetProjectId)
          }
        />
      )}
    </div>
  );
}