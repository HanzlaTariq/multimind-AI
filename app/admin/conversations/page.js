"use client";

import { useEffect, useState, useCallback } from "react";
import { Search, Loader2, X, Trash2, Globe, Eye } from "lucide-react";

function ViewConversationModal({ id, onClose }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin/conversations/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load conversation");
        return res.json();
      })
      .then((d) => {
        if (!cancelled) setData(d.conversation);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button className="absolute inset-0 bg-black/60" onClick={onClose} aria-label="Close" />
      <div className="relative flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-line bg-ink">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="truncate font-display text-sm font-semibold text-paper">
            {data?.title || "Loading…"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg border border-line bg-surface p-1.5 text-mist hover:text-paper"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {error && <p className="text-sm text-red-400">{error}</p>}
          {!data && !error && (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-mist" />
            </div>
          )}
          {data && (
            <div className="space-y-5">
              <p className="text-xs text-mist">
                {data.user?.name} · {data.user?.email}
              </p>
              {(data.turns || []).map((turn, i) => (
                <div key={i} className="space-y-2 border-b border-line/60 pb-4 last:border-0">
                  <p className="rounded-lg bg-surface px-3 py-2 text-sm text-paper">
                    {turn.prompt}
                  </p>
                  {(turn.responses || []).map((r, j) => (
                    <p
                      key={j}
                      className="ml-4 rounded-lg border border-line bg-surface2 px-3 py-2 text-xs text-mist"
                    >
                      <span className="mr-2 font-mono uppercase text-signal">{r.model}</span>
                      {r.type === "image" ? "[image response]" : r.text?.slice(0, 300)}
                    </p>
                  ))}
                </div>
              ))}
              {(!data.turns || data.turns.length === 0) && (
                <p className="text-sm text-mist">No turns in this conversation.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminConversationsPage() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [viewingId, setViewingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (q) params.set("q", q);
      const res = await fetch(`/api/admin/conversations?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load conversations");
      setItems(data.items);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, q]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const remove = async (id) => {
    if (!confirm("Delete this conversation? This can't be undone.")) return;
    try {
      const res = await fetch(`/api/admin/conversations/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed");
      setItems((prev) => prev.filter((c) => c._id !== id));
      setTotal((t) => t - 1);
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-semibold text-paper sm:text-2xl">
          Conversations
        </h1>
        <p className="mt-1 text-sm text-mist">{total} total conversations</p>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mist" />
        <input
          value={q}
          onChange={(e) => {
            setPage(1);
            setQ(e.target.value);
          }}
          placeholder="Search by title…"
          className="w-full rounded-lg border border-line bg-surface py-2.5 pl-9 pr-3 text-sm text-paper placeholder:text-mist/60 focus:border-signal focus:outline-none sm:max-w-sm"
        />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-line text-xs uppercase tracking-wide text-mist">
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">User</th>
              <th className="px-4 py-3 font-medium">Turns</th>
              <th className="px-4 py-3 font-medium">Updated</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-mist">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-mist">
                  No conversations found.
                </td>
              </tr>
            ) : (
              items.map((c) => (
                <tr key={c._id} className="border-b border-line/60 transition last:border-0 hover:bg-surface2">
                  <td className="max-w-[220px] truncate px-4 py-3 font-medium text-paper">
                    <span className="flex items-center gap-1.5">
                      {c.isPublic && <Globe className="h-3.5 w-3.5 shrink-0 text-signal" />}
                      {c.title}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-mist">
                    {c.user?.name || "Deleted user"}
                    <br />
                    {c.user?.email}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-paper">{c.turnCount}</td>
                  <td className="px-4 py-3 text-xs text-mist">
                    {new Date(c.updatedAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setViewingId(c._id)}
                        className="rounded-lg border border-line p-1.5 text-mist transition hover:text-paper"
                        title="View"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => remove(c._id)}
                        className="rounded-lg border border-red-500/30 bg-red-500/10 p-1.5 text-red-400 transition hover:bg-red-500/20"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
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

      {viewingId && (
        <ViewConversationModal id={viewingId} onClose={() => setViewingId(null)} />
      )}
    </div>
  );
}