"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Workflow,
  Plus,
  Loader2,
  Boxes,
  X,
  Trash2,
} from "lucide-react";
import DeleteModal from "@/components/chat/DeleteModal";
import TemplatePicker from "@/components/flows/TemplatePicker";
import { getFlowTemplate } from "@/lib/flowTemplates";

const STATUS_STYLES = {
  draft: "text-mist bg-surface2",
  active: "text-emerald-400 bg-emerald-400/10",
  paused: "text-amber-400 bg-amber-400/10",
};

export default function FlowsPage() {
  const router = useRouter();
  const [flows, setFlows] = useState(null);
  const [error, setError] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [templateId, setTemplateId] = useState(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchFlows();
  }, []);

  async function fetchFlows() {
    try {
      const res = await fetch("/api/flows");
      const data = await res.json();
      if (res.ok) setFlows(data.flows || []);
      else setError(data.error || "Couldn't load flows");
    } catch (e) {
      setError("Network error — please try again");
    }
  }

  async function handleDeleteFlow() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await fetch(`/api/flows/${deleteTarget._id}`, { method: "DELETE" });
      setFlows((prev) => prev.filter((f) => f._id !== deleteTarget._id));
    } catch (e) {
      setError("Couldn't delete flow — please try again");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  function handlePickTemplate(id) {
    setTemplateId(id);
    const template = id ? getFlowTemplate(id) : null;
    setName(template?.flowName || "");
    setDescription(template?.flowDescription || "");
    setPickerOpen(false);
    setCreating(true);
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!name.trim() || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/flows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, templateId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Couldn't create flow");
        setSubmitting(false);
        return;
      }
      router.push(`/dashboard/flows/${data.flow._id}`);
    } catch (e) {
      setError("Network error — please try again");
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-ink px-4 py-8 text-paper sm:px-8">
      <div className="mx-auto max-w-3xl space-y-8">
        <Link href="/dashboard" className="flex items-center gap-1.5 text-sm text-mist hover:text-paper">
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 font-display text-2xl font-semibold text-paper">
              <Workflow className="h-6 w-6 text-signal" />
              Flows
            </h1>
            <p className="mt-1.5 text-sm text-mist">
              Build automations that generate content and post it across your connected
              accounts — connect nodes on a canvas, no code required.
            </p>
          </div>
          <button
            onClick={() => setPickerOpen(true)}
            className="flex shrink-0 items-center gap-1.5 rounded-lg bg-signal px-3.5 py-2.5 text-sm font-semibold text-ink transition hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            New flow
          </button>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        {creating && (
          <form
            onSubmit={handleCreate}
            className="space-y-3 rounded-2xl border border-signal/40 bg-surface p-5"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-sm font-semibold text-paper">
                {templateId ? `New flow — ${getFlowTemplate(templateId)?.name}` : "New flow"}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setCreating(false);
                  setTemplateId(null);
                }}
                className="text-mist transition hover:text-paper"
                aria-label="Cancel"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {templateId && (
              <p className="-mt-1 text-xs text-mist/70">
                Pre-filled with the {getFlowTemplate(templateId)?.name} template — you can rename it
                and adjust the nodes once you're on the canvas.
              </p>
            )}
            <div>
              <label className="mb-1 block text-xs text-mist">Flow name</label>
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Daily Instagram auto-post"
                className="w-full rounded-lg border border-line bg-surface2 px-3 py-2 text-sm text-paper outline-none focus:border-signal/50"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-mist">
                Description <span className="text-mist/50">(optional)</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="What does this flow do?"
                className="w-full resize-none rounded-lg border border-line bg-surface2 px-3 py-2 text-sm text-paper outline-none focus:border-signal/50"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setCreating(false);
                  setTemplateId(null);
                }}
                className="rounded-lg px-3.5 py-2 text-sm text-mist transition hover:bg-surface2 hover:text-paper"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!name.trim() || submitting}
                className="rounded-lg bg-signal px-3.5 py-2 text-sm font-semibold text-ink transition hover:opacity-90 disabled:opacity-50"
              >
                {submitting ? "Creating…" : "Create flow"}
              </button>
            </div>
          </form>
        )}

        {!flows && !error && (
          <div className="flex items-center gap-2 text-mist">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        )}

        {flows && flows.length === 0 && !creating && (
          <div className="rounded-2xl border border-dashed border-line p-8 text-center">
            <Workflow className="mx-auto mb-3 h-8 w-8 text-mist/50" />
            <p className="mb-4 text-sm text-mist">
              No flows yet. Start from a template, or build one from scratch.
            </p>
            <button
              onClick={() => setPickerOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-signal px-3.5 py-2 text-sm font-semibold text-ink transition hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
              New flow
            </button>
          </div>
        )}

        {flows && flows.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2">
            {flows.map((f) => (
              <div
                key={f._id}
                className="group relative rounded-2xl border border-line bg-surface p-4 transition hover:border-signal/40"
              >
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    setDeleteTarget(f);
                  }}
                  className="absolute right-3 top-3 z-10 rounded-md p-1.5 text-mist/0 transition hover:bg-red-500/10 hover:text-red-400 group-hover:text-mist/60"
                  aria-label={`Delete ${f.name}`}
                  title="Delete flow"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
                <Link href={`/dashboard/flows/${f._id}`} className="block">
                  <div className="mb-2 flex items-center gap-2 pr-6">
                    <Workflow className="h-4 w-4 shrink-0 text-signal" />
                    <p className="truncate text-sm font-medium text-paper">{f.name}</p>
                  </div>
                  {f.description ? (
                    <p className="mb-3 line-clamp-2 text-xs text-mist">{f.description}</p>
                  ) : (
                    <p className="mb-3 text-xs text-mist/50">No description</p>
                  )}
                  <div className="flex items-center gap-3 text-[11px] text-mist/60">
                    <span className={`rounded px-1.5 py-0.5 font-medium capitalize ${STATUS_STYLES[f.status] || STATUS_STYLES.draft}`}>
                      {f.status}
                    </span>
                    <span className="flex items-center gap-1">
                      <Boxes className="h-3 w-3" />
                      {f.nodeCount} {f.nodeCount === 1 ? "node" : "nodes"}
                    </span>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )}

        <TemplatePicker
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          onPick={handlePickTemplate}
        />

        <DeleteModal
          open={!!deleteTarget}
          onClose={() => !deleting && setDeleteTarget(null)}
          onConfirm={handleDeleteFlow}
          title={`Delete "${deleteTarget?.name}"?`}
          message="This deletes the flow, its nodes, and its run history. This can't be undone."
        />
      </div>
    </div>
  );
}
