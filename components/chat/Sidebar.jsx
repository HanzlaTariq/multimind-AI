import Link from "next/link";
import { signOut } from "next-auth/react";
import { Plus, LogOut, Menu, X, Trash2, FileDown, Settings as SettingsIcon } from "lucide-react";

export default function Sidebar({
  open,
  onClose,
  conversations,
  conversationId,
  onNewChat,
  onOpenConversation,
  onDeleteConversation,
  user,
  initials,
  settings,
}) {
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

          <Link
            href="/dashboard/document-tools"
            className="mb-3 flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-mist transition hover:bg-surface hover:text-paper"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-surface2">
              <FileDown className="h-3.5 w-3.5" />
            </span>
            Document Tools
          </Link>

          <div className="mb-1 mt-2 px-2.5 text-xs font-medium text-mist/60">Recents</div>

          <div className="flex-1 space-y-0.5 overflow-y-auto scrollbar-thin">
            {conversations.length === 0 && (
              <p className="px-2.5 py-4 text-xs text-mist/50">Your chats will show up here.</p>
            )}
            {conversations.map((c) => (
              <button
                key={c._id}
                onClick={() => onOpenConversation(c._id)}
                className={`group flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition ${
                  conversationId === c._id
                    ? "bg-surface text-paper"
                    : "text-mist hover:bg-surface hover:text-paper"
                }`}
              >
                <span className="flex-1 truncate">{c.title}</span>
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteConversation(c._id);
                  }}
                  className="shrink-0 rounded p-1 text-mist/0 transition hover:bg-red-500/10 hover:text-red-400 group-hover:text-mist/60"
                  aria-label="Delete conversation"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </span>
              </button>
            ))}
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
    </>
  );
}