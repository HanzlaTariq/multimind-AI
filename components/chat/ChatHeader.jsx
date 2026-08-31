"use client";

import { useEffect, useRef, useState } from "react";
import { Menu, FileDown, Share2, ListTree, EyeOff, Pin, MoreVertical } from "lucide-react";
import NotificationBell from "@/components/NotificationBell";

export default function ChatHeader({
  onToggleSidebar,
  onNewChat,
  onToggleTemporary,
  temporaryMode,
  isEmpty,
  conversationId,
  turns,
  onExport,
  onShare,
  onToggleOutline,
  pinnedCount,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Close the mobile overflow menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  const actionButtons = (
    <>
      <button
        onClick={() => {
          onToggleTemporary();
          setMenuOpen(false);
        }}
        className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition ${
          temporaryMode
            ? "border-signal/50 bg-signal/10 text-signal"
            : "border-line text-mist hover:border-mist/40 hover:text-paper"
        }`}
        title={
          temporaryMode
            ? "Temporary Chat is on — click to turn off"
            : "Start a Temporary Chat — won't be saved to history"
        }
      >
        <EyeOff className="h-3.5 w-3.5" />
        <span>Temporary</span>
      </button>

      {!isEmpty && (
        <>
          {conversationId && !temporaryMode && (
            <button
              onClick={() => {
                onShare();
                setMenuOpen(false);
              }}
              className="flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs text-mist transition hover:border-mist/40 hover:text-paper"
              title="Share this conversation"
            >
              <Share2 className="h-3.5 w-3.5" />
              <span>Share</span>
            </button>
          )}

          <button
            onClick={() => {
              onExport();
              setMenuOpen(false);
            }}
            className="flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs text-mist transition hover:border-mist/40 hover:text-paper"
            title="Export this whole conversation as a PDF"
          >
            <FileDown className="h-3.5 w-3.5" />
            <span>Export</span>
          </button>

          <button
            onClick={() => {
              onToggleOutline();
              setMenuOpen(false);
            }}
            className="flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs text-mist transition hover:border-mist/40 hover:text-paper"
          >
            <ListTree className="h-3.5 w-3.5" />
            <span>Outline</span>
            {pinnedCount > 0 && (
              <span className="flex items-center gap-0.5 rounded-full bg-signal/15 px-1.5 py-0.5 text-signal">
                <Pin className="h-2.5 w-2.5" />
                {pinnedCount}
              </span>
            )}
          </button>
        </>
      )}
    </>
  );

  return (
    <header className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
      {" "}
      <button
        onClick={onToggleSidebar}
        aria-label="Open sidebar"
        className="lg:hidden"
      >
        <Menu className="h-5 w-5 text-paper" />
      </button>
      <span className="flex items-center gap-2 lg:hidden">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-gemini via-groq to-deepseek">
          <span className="h-2 w-2 rounded-sm bg-ink" />
        </span>
        <span className="font-display text-sm font-semibold text-paper">MultiMind</span>
      </span>
      {/* Desktop/tablet: full row of action buttons with labels */}
      <div className="ml-auto hidden items-center gap-2 sm:flex">
        {actionButtons}
        <NotificationBell />
      </div>

      {/* Mobile: just the bell + a single overflow menu, so the header never wraps/grows */}
      <div className="ml-auto flex items-center gap-1.5 sm:hidden">
        <NotificationBell />
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="More actions"
            className={`flex h-8 w-8 items-center justify-center rounded-full border transition ${
              menuOpen
                ? "border-mist/40 text-paper"
                : "border-line text-mist hover:border-mist/40 hover:text-paper"
            }`}
          >
            <MoreVertical className="h-4 w-4" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-10 z-30 flex w-48 flex-col gap-1.5 rounded-2xl border border-line bg-surface p-2 shadow-xl shadow-black/30">
              {actionButtons}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}