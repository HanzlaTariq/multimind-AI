"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2 } from "lucide-react";

const ACTION_LABELS = {
  "user.update": "Updated user",
  "user.delete": "Deleted user",
  "user.credit_grant": "Adjusted credits",
  "user.voice_delete": "Deleted TTS voice",
  "conversation.delete": "Deleted conversation",
  "pending_signup.delete": "Removed pending signup",
};

function describeDetails(entry) {
  const d = entry.details || {};
  if (entry.action === "user.credit_grant") {
    return `${d.amount > 0 ? "+" : ""}${d.amount} credits — "${d.reason}" (new balance: ${d.newBalance})`;
  }
  if (entry.action === "user.update") {
    return Object.entries(d)
      .map(([k, v]) => `${k}: ${v}`)
      .join(", ");
  }
  if (entry.action === "user.voice_delete") {
    return d.voiceName ? `Voice "${d.voiceName}"` : "";
  }
  return "";
}

export default function AdminActivityPage() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(page), limit: "30" });
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const res = await fetch(`/api/admin/activity?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setItems(data.items);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, from, to]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-semibold text-paper sm:text-2xl">
          Activity log
        </h1>
        <p className="mt-1 text-sm text-mist">{total} recorded admin actions</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-xs text-mist">
          From
          <input
            type="date"
            value={from}
            onChange={(e) => {
              setPage(1);
              setFrom(e.target.value);
            }}
            className="rounded-lg border border-line bg-surface px-2.5 py-1.5 text-sm text-paper focus:border-signal focus:outline-none"
          />
        </label>
        <label className="flex items-center gap-2 text-xs text-mist">
          To
          <input
            type="date"
            value={to}
            onChange={(e) => {
              setPage(1);
              setTo(e.target.value);
            }}
            className="rounded-lg border border-line bg-surface px-2.5 py-1.5 text-sm text-paper focus:border-signal focus:outline-none"
          />
        </label>
        {(from || to) && (
          <button
            onClick={() => {
              setPage(1);
              setFrom("");
              setTo("");
            }}
            className="text-xs text-mist underline underline-offset-2 hover:text-paper"
          >
            Clear
          </button>
        )}
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="rounded-2xl border border-line bg-surface">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-mist" />
          </div>
        ) : items.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-mist">No activity recorded yet.</p>
        ) : (
          <ul className="divide-y divide-line/60">
            {items.map((entry) => (
              <li key={entry._id} className="px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm text-paper">
                    <span className="font-medium">{entry.adminEmail}</span>{" "}
                    <span className="text-mist">
                      {ACTION_LABELS[entry.action] || entry.action}
                    </span>{" "}
                    <span className="text-paper">{entry.targetLabel}</span>
                  </p>
                  <span className="whitespace-nowrap text-xs text-mist">
                    {new Date(entry.createdAt).toLocaleString()}
                  </span>
                </div>
                {describeDetails(entry) && (
                  <p className="mt-1 font-mono text-xs text-mist/80">{describeDetails(entry)}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-mist">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-lg border border-line px-3 py-1.5 disabled:opacity-40"
          >
            Previous
          </button>
          <span>
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded-lg border border-line px-3 py-1.5 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}