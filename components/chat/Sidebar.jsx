"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import {
  Plus,
  LogOut,
  Menu,
  X,
  Trash2,
  FileDown,
  Settings as SettingsIcon,
  Gift,
  Search,
  Pin,
  PinOff,
  Pencil,
  Check,
  FolderKanban,
  FolderInput,
} from "lucide-react";
import SearchModal from "./SearchModal";

function ConversationRow({ c, active, onOpen, onDelete, onRename, onTogglePin, onMoveToProject }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(c.title);
  const inputRef = useRef(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  function startEdit(e) {
    e.stopPropagation();
    setValue(c.title);
    setEditing(true);
  }

  function save() {
    const trimmed = value.trim();
    setEditing(false);
    if (trimmed && trimmed !== c.title) onRename(c._id, trimmed);
  }

  if (editing) {
    return (
      <div className="flex w-full items-center gap-1 rounded-lg bg-surface px-2.5 py-1.5">
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              save();
            } else if (e.key === "Escape") {
              e.preventDefault();
              setEditing(false);
            }
          }}
          className="min-w-0 flex-1 bg-transparent text-sm text-paper outline-none"
        />
        <button
          onClick={(e) => {
            e.stopPropagation();
            save();
          }}
          className="shrink-0 rounded p-1 text-signal hover:bg-surface2"
          aria-label="Save name"
        >
          <Check className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => onOpen(c._id)}
      className={`group flex w-full items-center gap-1.5 rounded-lg px-2.5 py-2 text-left text-sm transition ${
        active ? "bg-surface text-paper" : "text-mist hover:bg-surface hover:text-paper"
      }`}
    >
      {c.pinned && <Pin className="h-3 w-3 shrink-0 text-signal" />}
      <span className="flex-1 truncate">{c.title}</span>

      <span
        role="button"
        tabIndex={0}
        onClick={(e) => {
          e.stopPropagation();
          onTogglePin(c._id, !c.pinned);
        }}
        className={`shrink-0 rounded p-1 transition hover:bg-surface2 hover:text-signal ${
          c.pinned ? "text-signal" : "text-mist/0 group-hover:text-mist/60"
        }`}
        aria-label={c.pinned ? "Unpin conversation" : "Pin conversation"}
        title={c.pinned ? "Unpin" : "Pin"}
      >
        {c.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
      </span>

      <span
        role="button"
        tabIndex={0}
        onClick={(e) => {
          e.stopPropagation();
          onMoveToProject(c._id);
        }}
        className="shrink-0 rounded p-1 text-mist/0 transition hover:bg-surface2 hover:text-paper group-hover:text-mist/60"
        aria-label="Move to project"
        title="Move to project"
      >
        <FolderInput className="h-3.5 w-3.5" />
      </span>

      <span
        role="button"
        tabIndex={0}
        onClick={startEdit}
        className="shrink-0 rounded p-1 text-mist/0 transition hover:bg-surface2 hover:text-paper group-hover:text-mist/60"
        aria-label="Rename conversation"
        title="Rename"
      >
        <Pencil className="h-3.5 w-3.5" />
      </span>

      <span
        role="button"
        tabIndex={0}
        onClick={(e) => {
          e.stopPropagation();
          onDelete(c._id);
        }}
        className="shrink-0 rounded p-1 text-mist/0 transition hover:bg-red-500/10 hover:text-red-400 group-hover:text-mist/60"
        aria-label="Delete conversation"
        title="Delete"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </span>
    </button>
  );
}

export default function Sidebar({
  open,
  onClose,
  conversations,
  conversationId,
  onNewChat,
  onOpenConversation,
  onDeleteConversation,
  onRenameConversation,
  onToggleConversationPin,
  onMoveToProject,
  user,
  initials,
  settings,
}) {
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    function handleKeydown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    }
    document.addEventListener("keydown", handleKeydown);
    return () => document.removeEventListener("keydown", handleKeydown);
  }, []);

  const pinnedConversations = conversations.filter((c) => c.pinned);
  const recentConversations = conversations.filter((c) => !c.pinned);

  return (
    <>
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 transform flex-col border-r border-line/70 bg-ink transition-transform duration-200 lg:static lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col p-3">
          <div className="mb-4 flex items-center justify-between px-1.5 pt-1">
            <span className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-gemini via-groq to-deepseek">
                <span className="h-2 w-2 rounded-sm bg-ink" />
              </span>
              <span className="font-display text-[15px] font-semibold text-paper">MultiMind</span>
            </span>
            <button
              onClick={onClose}
              className="text-mist lg:hidden"
              aria-label="Close sidebar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <button
            onClick={onNewChat}
            className="mb-1 flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-paper transition hover:bg-surface"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-surface2">
              <Plus className="h-3.5 w-3.5" />
            </span>
            New chat
          </button>

          <button
            onClick={() => setSearchOpen(true)}
            className="mb-1 flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-mist transition hover:bg-surface hover:text-paper"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-surface2">
              <Search className="h-3.5 w-3.5" />
            </span>
            <span className="flex-1 text-left">Search chats</span>
            <span className="rounded border border-line px-1.5 py-0.5 font-mono text-[10px] text-mist/60">
              ⌘K
            </span>
          </button>

          <Link
            href="/dashboard/projects"
            className="mb-1 flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-mist transition hover:bg-surface hover:text-paper"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-surface2">
              <FolderKanban className="h-3.5 w-3.5" />
            </span>
            Projects
          </Link>

          <Link
            href="/dashboard/document-tools"
            className="mb-3 flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-mist transition hover:bg-surface hover:text-paper"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-surface2">
              <FileDown className="h-3.5 w-3.5" />
            </span>
            Document Tools
          </Link>

          <Link
            href="/dashboard/referrals"
            className="mb-3 flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-mist transition hover:bg-surface hover:text-paper"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-surface2">
              <Gift className="h-3.5 w-3.5" />
            </span>
            Refer & Earn
          </Link>

          <div className="flex-1 space-y-3 overflow-y-auto scrollbar-thin">
            {conversations.length === 0 && (
              <p className="px-2.5 py-4 text-xs text-mist/50">Your chats will show up here.</p>
            )}

            {pinnedConversations.length > 0 && (
              <div>
                <div className="mb-1 px-2.5 text-xs font-medium text-mist/60">Pinned</div>
                <div className="space-y-0.5">
                  {pinnedConversations.map((c) => (
                    <ConversationRow
                      key={c._id}
                      c={c}
                      active={conversationId === c._id}
                      onOpen={onOpenConversation}
                      onDelete={onDeleteConversation}
                      onRename={onRenameConversation}
                      onTogglePin={onToggleConversationPin}
                      onMoveToProject={onMoveToProject}
                    />
                  ))}
                </div>
              </div>
            )}

            {recentConversations.length > 0 && (
              <div>
                <div className="mb-1 px-2.5 text-xs font-medium text-mist/60">Recents</div>
                <div className="space-y-0.5">
                  {recentConversations.map((c) => (
                    <ConversationRow
                      key={c._id}
                      c={c}
                      active={conversationId === c._id}
                      onOpen={onOpenConversation}
                      onDelete={onDeleteConversation}
                      onRename={onRenameConversation}
                      onTogglePin={onToggleConversationPin}
                      onMoveToProject={onMoveToProject}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="mt-2 flex items-center justify-between rounded-lg px-2 py-2">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface2 font-mono text-xs font-semibold text-paper">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm text-paper">{user?.name}</p>
                <p className="text-xs text-mist/60">
                  {settings.plan === "free"
                    ? "Free plan"
                    : `${settings.plan.charAt(0).toUpperCase()}${settings.plan.slice(1)} plan`}
                  {" · "}
                  {settings.credits ?? 0} credits
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Link
                href="/dashboard/settings"
                className="rounded-lg p-1.5 text-mist transition hover:bg-surface2 hover:text-paper"
                aria-label="Settings"
                title="Settings"
              >
                <SettingsIcon className="h-4 w-4" />
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="rounded-lg p-1.5 text-mist transition hover:bg-surface2 hover:text-paper"
                aria-label="Log out"
                title="Log out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {open && (
        <button
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={onClose}
          aria-label="Close sidebar overlay"
        />
      )}

      <SearchModal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onOpenConversation={onOpenConversation}
      />
    </>
  );
}