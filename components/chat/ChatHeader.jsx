import { Menu, FileDown, Share2, ListTree, EyeOff, Pin } from "lucide-react";
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
      <div className="ml-auto flex items-center gap-2">
        <button
          onClick={onToggleTemporary}
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
          <span className="hidden sm:inline">Temporary</span>
        </button>

        {!isEmpty && (
          <>
            {conversationId && !temporaryMode && (
              <button
                onClick={onShare}
                className="flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs text-mist transition hover:border-mist/40 hover:text-paper"
                title="Share this conversation"
              >
                <Share2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Share</span>
              </button>
            )}

            <button
              onClick={onExport}
              className="flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs text-mist transition hover:border-mist/40 hover:text-paper"
              title="Export this whole conversation as a PDF"
            >
              <FileDown className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Export</span>
            </button>

            <button
              onClick={onToggleOutline}
              className="flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs text-mist transition hover:border-mist/40 hover:text-paper"
            >
              <ListTree className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Outline</span>
              {pinnedCount > 0 && (
                <span className="flex items-center gap-0.5 rounded-full bg-signal/15 px-1.5 py-0.5 text-signal">
                  <Pin className="h-2.5 w-2.5" />
                  {pinnedCount}
                </span>
              )}
            </button>
          </>
        )}

        <NotificationBell />
      </div>
    </header>
  );
}