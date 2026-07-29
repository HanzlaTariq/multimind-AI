"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, Save, CalendarClock, Zap } from "lucide-react";

function todayLocalDate() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

function ToolRow({ tool, onSave }) {
  const [cost, setCost] = useState(tool.cost);
  const [minCost, setMinCost] = useState(tool.minCost || 0);
  const [scheduleMode, setScheduleMode] = useState(false);
  const [effectiveDate, setEffectiveDate] = useState(todayLocalDate());
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const isPerLength = tool.costType === "per-length";

  const setField = (setter) => (value) => {
    setter(value);
    setDirty(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      await onSave(tool.toolId, {
        cost: Number(cost),
        minCost: isPerLength ? Number(minCost) : undefined,
        effectiveAt: scheduleMode ? new Date(`${effectiveDate}T00:00:00`).toISOString() : null,
      });
      setDirty(false);
    } finally {
      setSaving(false);
    }
  };

  const hasSchedule = tool.effectiveAt && tool.scheduledCost != null;

  return (
    <div className="rounded-2xl border border-line bg-surface p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-display text-sm font-semibold text-paper">{tool.label}</p>
          <p className="font-mono text-[11px] text-mist">{tool.toolId}</p>
        </div>
        {dirty && (
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-lg bg-signal px-3 py-1.5 text-xs font-medium text-ink hover:opacity-90 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save
          </button>
        )}
      </div>

      {hasSchedule && (
        <p className="mb-3 flex items-center gap-1.5 rounded-lg border border-signal/30 bg-signal/10 px-3 py-2 text-[11px] text-signal">
          <CalendarClock className="h-3.5 w-3.5 shrink-0" />
          Scheduled: {tool.scheduledCost} credit{tool.scheduledCost === 1 ? "" : "s"} starting{" "}
          {new Date(tool.effectiveAt).toLocaleDateString(undefined, {
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </p>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="mb-1 block text-[11px] text-mist">
            {isPerLength ? "Credits per unit" : "Credits per use"}
          </label>
          <input
            type="number"
            min="0"
            className="w-full rounded-lg border border-line bg-surface2 px-2.5 py-1.5 text-sm text-paper"
            value={cost}
            onChange={(e) => setField(setCost)(e.target.value)}
          />
        </div>
        {isPerLength && (
          <div>
            <label className="mb-1 block text-[11px] text-mist">Minimum credits</label>
            <input
              type="number"
              min="0"
              className="w-full rounded-lg border border-line bg-surface2 px-2.5 py-1.5 text-sm text-paper"
              value={minCost}
              onChange={(e) => setField(setMinCost)(e.target.value)}
            />
          </div>
        )}
        <div className="flex items-end lg:col-span-2">
          <label className="flex items-center gap-1.5 text-xs text-mist">
            <input
              type="checkbox"
              checked={scheduleMode}
              onChange={(e) => setField(setScheduleMode)(e.target.checked)}
            />
            Schedule this for a future date instead of applying now
          </label>
        </div>
      </div>

      {scheduleMode && (
        <div className="mt-3">
          <label className="mb-1 block text-[11px] text-mist">Effective from</label>
          <input
            type="date"
            min={todayLocalDate()}
            className="w-full max-w-[200px] rounded-lg border border-line bg-surface2 px-2.5 py-1.5 text-sm text-paper"
            value={effectiveDate}
            onChange={(e) => setField(setEffectiveDate)(e.target.value)}
          />
          <p className="mt-1.5 text-[11px] text-mist/70">
            Current cost stays in effect until this date. Users get a heads-up notification now,
            and the price switches over automatically on the day.
          </p>
        </div>
      )}
      {!scheduleMode && (
        <p className="mt-2 flex items-center gap-1 text-[11px] text-mist/70">
          <Zap className="h-3 w-3" />
          Applies immediately and notifies users right away.
        </p>
      )}
    </div>
  );
}

export default function AdminToolCostsPage() {
  const [tools, setTools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/tool-costs");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load tool costs");
      setTools(data.tools);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const saveTool = async (toolId, form) => {
    const res = await fetch(`/api/admin/tool-costs/${toolId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Save failed");
    setTools((prev) => prev.map((t) => (t.toolId === toolId ? data.tool : t)));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-semibold text-paper sm:text-2xl">Tool Costs</h1>
        <p className="mt-1 text-sm text-mist">
          Set how many credits each document/PDF/TTS tool charges per use. Apply a change right
          away, or schedule it for a future date — either way, users are notified.
        </p>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {loading ? (
        <div className="flex items-center gap-2 text-mist">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading…
        </div>
      ) : (
        <div className="space-y-4">
          {tools.map((tool) => (
            <ToolRow key={tool.toolId} tool={tool} onSave={saveTool} />
          ))}
        </div>
      )}
    </div>
  );
}