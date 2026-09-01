"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  TrendingUp,
  Loader2,
  Instagram,
  Facebook,
  Clock,
  Hash,
  Sparkles,
  Info,
} from "lucide-react";

const PLATFORM_ICON = { instagram: Instagram, facebook: Facebook };

export default function GrowthPage() {
  const [connections, setConnections] = useState(null);
  const [connectionsError, setConnectionsError] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  useEffect(() => {
    fetch("/api/connections")
      .then((res) => res.json())
      .then((data) => {
        const eligible = (data.connections || []).filter(
          (c) => c.platform === "facebook" || c.platform === "instagram",
        );
        setConnections(eligible);
        if (eligible.length) setSelectedId(eligible[0]._id);
      })
      .catch(() => setConnectionsError("Couldn't load your connected accounts"));
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    fetchSuggestions(selectedId);
  }, [selectedId]);

  async function fetchSuggestions(connectionId) {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch(`/api/growth/suggestions?connectionId=${connectionId}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Couldn't load suggestions");
        return;
      }
      setResult(data);
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-ink px-4 py-8 text-paper sm:px-8">
      <div className="mx-auto max-w-3xl space-y-8">
        <Link href="/dashboard" className="flex items-center gap-1.5 text-sm text-mist hover:text-paper">
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>

        <div>
          <h1 className="flex items-center gap-2 font-display text-2xl font-semibold text-paper">
            <TrendingUp className="h-6 w-6 text-signal" />
            Growth Suggestions
          </h1>
          <p className="mt-1.5 text-sm text-mist">
            Patterns pulled from your account's own recent posts — best posting time, hashtags that have
            actually worked, and a few content ideas. Directional, not a guarantee.
          </p>
        </div>

        {connectionsError && <p className="text-sm text-red-400">{connectionsError}</p>}

        {connections && connections.length === 0 && (
          <div className="rounded-2xl border border-dashed border-line p-8 text-center">
            <TrendingUp className="mx-auto mb-3 h-8 w-8 text-mist/50" />
            <p className="text-sm text-mist">
              Connect a Facebook Page or Instagram account first —{" "}
              <Link href="/dashboard/settings?tab=connections" className="text-signal hover:underline">
                Settings → Connections
              </Link>
              .
            </p>
          </div>
        )}

        {connections && connections.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {connections.map((c) => {
              const Icon = PLATFORM_ICON[c.platform];
              const active = c._id === selectedId;
              return (
                <button
                  key={c._id}
                  onClick={() => setSelectedId(c._id)}
                  className={`flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm transition ${
                    active
                      ? "border-signal/50 bg-surface text-paper"
                      : "border-line text-mist hover:border-signal/30 hover:text-paper"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {c.accountName || c.platform}
                </button>
              );
            })}
          </div>
        )}

        {loading && (
          <div className="flex items-center gap-2 text-sm text-mist">
            <Loader2 className="h-4 w-4 animate-spin" />
            Analyzing recent posts…
          </div>
        )}

        {error && <p className="text-sm text-red-400">{error}</p>}

        {result?.stats?.insufficientData && (
          <div className="rounded-2xl border border-dashed border-line p-6 text-sm text-mist">
            {result.note}
          </div>
        )}

        {result && !result.stats?.insufficientData && (
          <div className="space-y-6">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-line bg-surface p-4">
                <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-mist">
                  <Clock className="h-3.5 w-3.5 text-signal" />
                  Best posting time
                </p>
                {result.stats.bestHour ? (
                  <p className="text-sm text-paper">
                    Around <span className="font-medium">{result.stats.bestHour.bucket}:00</span> local
                    time{" "}
                    {result.stats.bestDay ? (
                      <>
                        on <span className="font-medium">{result.stats.bestDay.bucket}s</span>
                      </>
                    ) : null}{" "}
                    tends to get the most engagement, based on {result.stats.totalPosts} recent posts.
                  </p>
                ) : (
                  <p className="text-sm text-mist">Not enough spread in post times yet.</p>
                )}
              </div>

              <div className="rounded-2xl border border-line bg-surface p-4">
                <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-mist">
                  <Hash className="h-3.5 w-3.5 text-signal" />
                  Hashtags worth reusing
                </p>
                {result.stats.topHashtags?.length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {result.stats.topHashtags.map((h) => (
                      <span
                        key={h.tag}
                        className="rounded-full bg-surface2 px-2.5 py-1 text-xs text-paper"
                        title={`Used ${h.useCount}x, avg ${h.avgEngagement.toFixed(1)} engagement`}
                      >
                        {h.tag}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-mist">No hashtags found in recent captions.</p>
                )}
              </div>
            </div>

            {result.aiSuggestions && (
              <div className="rounded-2xl border border-signal/30 bg-surface p-5">
                <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-signal">
                  <Sparkles className="h-3.5 w-3.5" />
                  Content ideas
                </p>
                <div className="whitespace-pre-wrap text-sm leading-relaxed text-paper">
                  {result.aiSuggestions}
                </div>
              </div>
            )}

            {result.stats.topPosts?.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-mist">Your top posts</p>
                <div className="space-y-2">
                  {result.stats.topPosts.map((p) => (
                    <a
                      key={p.id}
                      href={p.permalink || "#"}
                      target={p.permalink ? "_blank" : undefined}
                      rel="noreferrer"
                      className="block rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-paper transition hover:border-signal/40"
                    >
                      <p className="line-clamp-2 text-mist">{p.text || "(no caption)"}</p>
                      <p className="mt-1 text-xs text-mist/60">{p.engagement} total engagement</p>
                    </a>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-start gap-2 rounded-xl bg-surface2/60 px-3.5 py-2.5 text-xs text-mist">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {result.note}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
