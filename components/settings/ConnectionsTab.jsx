"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Instagram, Facebook, MessageCircle, Music2, Unlink, Loader2 } from "lucide-react";

// One entry per platform Flows' node library knows how to act on
// (components/flows/nodeTypesConfig.js). `connectHref` is null for
// platforms that don't have a working OAuth route yet — those render as
// "Coming soon" per the plan's advice to ship Instagram+Facebook first.
const PLATFORMS = [
  {
    id: "facebook",
    label: "Facebook",
    icon: Facebook,
    connectHref: "/api/connections/meta/authorize",
    note: "Connects your Facebook Pages.",
  },
  {
    id: "instagram",
    label: "Instagram",
    icon: Instagram,
    connectHref: "/api/connections/meta/authorize",
    note: "Auto-detected from Pages with a linked Instagram Business account.",
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    icon: MessageCircle,
    connectHref: null,
    note: "Coming soon.",
  },
  {
    id: "tiktok",
    label: "TikTok",
    icon: Music2,
    connectHref: null,
    note: "Coming soon.",
  },
];

const ERROR_MESSAGES = {
  denied: "Connection cancelled — you didn't approve access on Meta's side.",
  state_mismatch: "That connect link expired or was invalid. Try again.",
  no_pages: "No Facebook Pages found on that account. You need to be an admin of at least one Page.",
  unknown: "Something went wrong connecting that account. Try again in a bit.",
};

export default function ConnectionsTab() {
  const searchParams = useSearchParams();
  const [connections, setConnections] = useState(null);
  const [disconnectingId, setDisconnectingId] = useState(null);

  async function loadConnections() {
    const res = await fetch("/api/connections");
    const data = await res.json();
    setConnections(data.connections || []);
  }

  useEffect(() => {
    loadConnections();
  }, []);

  async function handleDisconnect(id) {
    setDisconnectingId(id);
    try {
      await fetch(`/api/connections/${id}`, { method: "DELETE" });
      await loadConnections();
    } finally {
      setDisconnectingId(null);
    }
  }

  const connectError = searchParams.get("connect_error");
  const justConnected = searchParams.get("connected");

  return (
    <div className="max-w-xl space-y-8">
      <div>
        <h2 className="font-display text-lg font-semibold text-paper">Connections</h2>
        <p className="mt-1 text-sm text-mist">
          Link your social accounts so Flows nodes (Post, Reply, DM, etc.) can act on your behalf.
        </p>
      </div>

      {connectError && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-400">
          {ERROR_MESSAGES[connectError] || ERROR_MESSAGES.unknown}
        </p>
      )}
      {justConnected && !connectError && (
        <p className="rounded-lg border border-signal/30 bg-signal/10 px-3.5 py-2.5 text-sm text-signal">
          Connected successfully.
        </p>
      )}

      <div className="space-y-3">
        {PLATFORMS.map((platform) => {
          const accountsForPlatform =
            connections?.filter((c) => c.platform === platform.id) || [];
          const Icon = platform.icon;

          return (
            <div key={platform.id} className="rounded-xl border border-line bg-surface p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Icon className="h-5 w-5 text-mist" />
                  <div>
                    <p className="text-sm text-paper">{platform.label}</p>
                    <p className="text-xs text-mist">{platform.note}</p>
                  </div>
                </div>

                {platform.connectHref ? (
                  <a
                    href={platform.connectHref}
                    className="whitespace-nowrap rounded-full border border-line px-3.5 py-1.5 text-xs text-paper transition hover:border-signal hover:text-signal"
                  >
                    Connect
                  </a>
                ) : (
                  <span className="whitespace-nowrap rounded-full border border-line px-3.5 py-1.5 text-xs text-mist/60">
                    Coming soon
                  </span>
                )}
              </div>

              {connections === null && (
                <p className="mt-3 flex items-center gap-2 text-xs text-mist">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading accounts…
                </p>
              )}

              {accountsForPlatform.length > 0 && (
                <div className="mt-3 space-y-2 border-t border-line pt-3">
                  {accountsForPlatform.map((c) => (
                    <div key={c._id} className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            c.status === "connected" ? "bg-signal" : "bg-red-400"
                          }`}
                        />
                        <span className="text-sm text-paper">{c.accountName || c.accountId}</span>
                        {c.status !== "connected" && (
                          <span className="text-xs text-red-400">({c.status})</span>
                        )}
                      </div>
                      <button
                        onClick={() => handleDisconnect(c._id)}
                        disabled={disconnectingId === c._id}
                        className="flex items-center gap-1 text-xs text-mist transition hover:text-red-400 disabled:opacity-50"
                      >
                        {disconnectingId === c._id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Unlink className="h-3.5 w-3.5" />
                        )}
                        Disconnect
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}