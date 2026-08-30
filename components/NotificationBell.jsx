"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { Bell } from "lucide-react";

function timeAgo(dateStr) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function NotificationBell() {
  const { status } = useSession();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const containerRef = useRef(null);

  const loadNotifications = async () => {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch {
      // Silent — a failed notification fetch shouldn't disrupt the app.
    }
  };

  useEffect(() => {
    if (status !== "authenticated") return;
    loadNotifications();
    // Light polling so a notification created while the tab is open still
    // shows up without a manual refresh.
    const interval = setInterval(loadNotifications, 60000);
    return () => clearInterval(interval);
  }, [status]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleOpen = async () => {
    const next = !open;
    setOpen(next);
    if (next && unreadCount > 0) {
      setUnreadCount(0);
      try {
        await fetch("/api/notifications", { method: "PATCH" });
      } catch {
        // Best-effort — worst case the badge reappears next load.
      }
    }
  };

  if (status !== "authenticated") return null;

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={toggleOpen}
        aria-label="Notifications"
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface/90 text-mist backdrop-blur transition hover:border-mist/40 hover:text-paper"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-signal px-1 text-[10px] font-semibold text-ink">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 max-h-96 w-80 overflow-y-auto rounded-2xl border border-line bg-surface p-2 shadow-xl">
          <p className="px-2.5 py-1.5 text-xs font-medium text-mist">Notifications</p>
          {notifications.length === 0 ? (
            <p className="px-2.5 py-4 text-center text-xs text-mist/60">You're all caught up.</p>
          ) : (
            <div className="space-y-1">
              {notifications.map((n) => (
                <div key={n._id} className="rounded-xl px-2.5 py-2 hover:bg-surface2">
                  <p className="text-xs font-medium text-paper">{n.title}</p>
                  <p className="mt-0.5 text-xs text-mist">{n.message}</p>
                  <p className="mt-1 text-[10px] text-mist/50">{timeAgo(n.createdAt)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}