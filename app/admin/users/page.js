"use client";

import { useEffect, useState, useCallback } from "react";
import { Search, Loader2, X, ShieldCheck, ShieldBan, Trash2 } from "lucide-react";

const PLANS = ["free", "basic", "pro", "business"];

function Badge({ children, tone = "default" }) {
  const tones = {
    default: "border-line text-mist",
    signal: "border-signal/30 bg-signal/10 text-signal",
    danger: "border-red-500/30 bg-red-500/10 text-red-400",
  };
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}

function EditUserDrawer({ user, onClose, onSaved }) {
  const [plan, setPlan] = useState(user.plan);
  const [credits, setCredits] = useState(user.credits);
  const [isAdmin, setIsAdmin] = useState(user.isAdmin);
  const [banned, setBanned] = useState(user.banned);
  const [bannedReason, setBannedReason] = useState(user.bannedReason || "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/users/${user._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan,
          credits: Number(credits),
          isAdmin,
          banned,
          bannedReason,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      onSaved(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!confirm(`Delete ${user.email}? This also deletes their conversations. This can't be undone.`)) {
      return;
    }
    setDeleting(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/users/${user._id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed");
      onSaved(null, user._id);
    } catch (err) {
      setError(err.message);
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
        aria-label="Close"
      />
      <aside className="relative flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-line bg-ink p-6">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold text-paper">{user.name}</h2>
            <p className="text-sm text-mist">{user.email}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg border border-line bg-surface p-1.5 text-mist hover:text-paper"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <p className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
            {error}
          </p>
        )}

        <div className="space-y-5">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-mist">Plan</label>
            <select
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
              className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-paper focus:border-signal focus:outline-none"
            >
              {PLANS.map((p) => (
                <option key={p} value={p}>
                  {p[0].toUpperCase() + p.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-mist">Credits</label>
            <input
              type="number"
              min={0}
              value={credits}
              onChange={(e) => setCredits(e.target.value)}
              className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-paper focus:border-signal focus:outline-none"
            />
          </div>

          <label className="flex items-center justify-between rounded-lg border border-line bg-surface px-3 py-2.5">
            <span className="text-sm text-paper">Admin access</span>
            <input
              type="checkbox"
              checked={isAdmin}
              onChange={(e) => setIsAdmin(e.target.checked)}
              className="h-4 w-4 accent-signal"
            />
          </label>

          <label className="flex items-center justify-between rounded-lg border border-line bg-surface px-3 py-2.5">
            <span className="text-sm text-paper">Banned</span>
            <input
              type="checkbox"
              checked={banned}
              onChange={(e) => setBanned(e.target.checked)}
              className="h-4 w-4 accent-red-500"
            />
          </label>

          {banned && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-mist">Ban reason (optional)</label>
              <input
                type="text"
                value={bannedReason}
                onChange={(e) => setBannedReason(e.target.value)}
                className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-paper focus:border-signal focus:outline-none"
              />
            </div>
          )}
        </div>

        <div className="mt-8 flex items-center gap-3">
          <button
            onClick={save}
            disabled={saving || deleting}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-signal px-4 py-2.5 text-sm font-semibold text-ink transition hover:opacity-90 disabled:opacity-50"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Save changes
          </button>
          <button
            onClick={remove}
            disabled={saving || deleting}
            className="flex items-center justify-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-400 transition hover:bg-red-500/20 disabled:opacity-50"
          >
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          </button>
        </div>
      </aside>
    </div>
  );
}

export default function AdminUsersPage() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (q) params.set("q", q);
      if (planFilter) params.set("plan", planFilter);
      const res = await fetch(`/api/admin/users?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load users");
      setItems(data.items);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, q, planFilter]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const handleSaved = (updatedUser, deletedId) => {
    setSelected(null);
    if (deletedId) {
      setItems((prev) => prev.filter((u) => u._id !== deletedId));
      setTotal((t) => t - 1);
    } else if (updatedUser) {
      setItems((prev) => prev.map((u) => (u._id === updatedUser._id ? updatedUser : u)));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-semibold text-paper sm:text-2xl">Users</h1>
        <p className="mt-1 text-sm text-mist">{total} total users</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mist" />
          <input
            value={q}
            onChange={(e) => {
              setPage(1);
              setQ(e.target.value);
            }}
            placeholder="Search by name or email…"
            className="w-full rounded-lg border border-line bg-surface py-2.5 pl-9 pr-3 text-sm text-paper placeholder:text-mist/60 focus:border-signal focus:outline-none"
          />
        </div>
        <select
          value={planFilter}
          onChange={(e) => {
            setPage(1);
            setPlanFilter(e.target.value);
          }}
          className="rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-paper focus:border-signal focus:outline-none"
        >
          <option value="">All plans</option>
          {PLANS.map((p) => (
            <option key={p} value={p}>
              {p[0].toUpperCase() + p.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-line text-xs uppercase tracking-wide text-mist">
              <th className="px-4 py-3 font-medium">User</th>
              <th className="px-4 py-3 font-medium">Plan</th>
              <th className="px-4 py-3 font-medium">Credits</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Joined</th>
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
                  No users found.
                </td>
              </tr>
            ) : (
              items.map((u) => (
                <tr
                  key={u._id}
                  onClick={() => setSelected(u)}
                  className="cursor-pointer border-b border-line/60 transition last:border-0 hover:bg-surface2"
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-paper">{u.name}</p>
                    <p className="text-xs text-mist">{u.email}</p>
                  </td>
                  <td className="px-4 py-3 capitalize text-mist">{u.plan}</td>
                  <td className="px-4 py-3 font-mono text-xs text-paper">{u.credits}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {u.isAdmin && (
                        <Badge tone="signal">
                          <ShieldCheck className="mr-1 inline h-3 w-3" />
                          Admin
                        </Badge>
                      )}
                      {u.banned && (
                        <Badge tone="danger">
                          <ShieldBan className="mr-1 inline h-3 w-3" />
                          Banned
                        </Badge>
                      )}
                      {!u.isAdmin && !u.banned && <Badge>Active</Badge>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-mist">
                    {new Date(u.createdAt).toLocaleDateString()}
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

      {selected && (
        <EditUserDrawer user={selected} onClose={() => setSelected(null)} onSaved={handleSaved} />
      )}
    </div>
  );
}