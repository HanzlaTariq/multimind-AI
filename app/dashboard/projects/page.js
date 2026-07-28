"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  FolderKanban,
  Plus,
  Loader2,
  MessageSquare,
  FileText,
  X,
  Trash2,
} from "lucide-react";
import DeleteModal from "@/components/chat/DeleteModal";

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState(null);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [instructions, setInstructions] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, []);

  async function fetchProjects() {
    try {
      const res = await fetch("/api/projects");
      const data = await res.json();
      if (res.ok) setProjects(data.projects || []);
      else setError(data.error || "Couldn't load projects");
    } catch (e) {
      setError("Network error — please try again");
    }
  }

  async function handleDeleteProject() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await fetch(`/api/projects/${deleteTarget._id}`, { method: "DELETE" });
      setProjects((prev) => prev.filter((p) => p._id !== deleteTarget._id));
    } catch (e) {
      setError("Couldn't delete project — please try again");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!name.trim() || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, instructions }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Couldn't create project");
        setSubmitting(false);
        return;
      }
      router.push(`/dashboard/projects/${data.project._id}`);
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
              <FolderKanban className="h-6 w-6 text-signal" />
              Projects
            </h1>
            <p className="mt-1.5 text-sm text-mist">
              Give a project custom instructions and reference files — every chat inside it will
              follow those instructions and use those files automatically.
            </p>
          </div>
          <button
            onClick={() => setCreating(true)}
            className="flex shrink-0 items-center gap-1.5 rounded-lg bg-signal px-3.5 py-2.5 text-sm font-semibold text-ink transition hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            New project
          </button>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        {creating && (
          <form
            onSubmit={handleCreate}
            className="space-y-3 rounded-2xl border border-signal/40 bg-surface p-5"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-sm font-semibold text-paper">New project</h2>
              <button
                type="button"
                onClick={() => setCreating(false)}
                className="text-mist transition hover:text-paper"
                aria-label="Cancel"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div>
              <label className="mb-1 block text-xs text-mist">Project name</label>
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Client website redesign"
                className="w-full rounded-lg border border-line bg-surface2 px-3 py-2 text-sm text-paper outline-none focus:border-signal/50"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-mist">
                Instructions <span className="text-mist/50">(optional — you can add these later)</span>
              </label>
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                rows={4}
                placeholder="e.g. Always reply in formal English. This project is about..."
                className="w-full resize-none rounded-lg border border-line bg-surface2 px-3 py-2 text-sm text-paper outline-none focus:border-signal/50"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setCreating(false)}
                className="rounded-lg px-3.5 py-2 text-sm text-mist transition hover:bg-surface2 hover:text-paper"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!name.trim() || submitting}
                className="rounded-lg bg-signal px-3.5 py-2 text-sm font-semibold text-ink transition hover:opacity-90 disabled:opacity-50"
              >
                {submitting ? "Creating…" : "Create project"}
              </button>
            </div>
          </form>
        )}

        {!projects && !error && (
          <div className="flex items-center gap-2 text-mist">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        )}

        {projects && projects.length === 0 && !creating && (
          <div className="rounded-2xl border border-dashed border-line p-8 text-center">
            <FolderKanban className="mx-auto mb-3 h-8 w-8 text-mist/50" />
            <p className="text-sm text-mist">
              No projects yet. Create one to give a set of chats their own instructions and files.
            </p>
          </div>
        )}

        {projects && projects.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2">
            {projects.map((p) => (
              <div
                key={p._id}
                className="group relative rounded-2xl border border-line bg-surface p-4 transition hover:border-signal/40"
              >
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    setDeleteTarget(p);
                  }}
                  className="absolute right-3 top-3 z-10 rounded-md p-1.5 text-mist/0 transition hover:bg-red-500/10 hover:text-red-400 group-hover:text-mist/60"
                  aria-label={`Delete ${p.name}`}
                  title="Delete project"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
                <Link href={`/dashboard/projects/${p._id}`} className="block">
                  <div className="mb-2 flex items-center gap-2 pr-6">
                    <FolderKanban className="h-4 w-4 shrink-0 text-signal" />
                    <p className="truncate text-sm font-medium text-paper">{p.name}</p>
                  </div>
                  {p.instructions ? (
                    <p className="mb-3 line-clamp-2 text-xs text-mist">{p.instructions}</p>
                  ) : (
                    <p className="mb-3 text-xs text-mist/50">No instructions set</p>
                  )}
                  <div className="flex items-center gap-3 text-[11px] text-mist/60">
                    <span className="flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      {p.chatCount} {p.chatCount === 1 ? "chat" : "chats"}
                    </span>
                    <span className="flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      {p.fileCount} {p.fileCount === 1 ? "file" : "files"}
                    </span>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )}

        <DeleteModal
          open={!!deleteTarget}
          onClose={() => !deleting && setDeleteTarget(null)}
          onConfirm={handleDeleteProject}
          title={`Delete "${deleteTarget?.name}"?`}
          message="This deletes the project, its instructions, and its files. Chats inside it move back to your main Recents list instead of being deleted."
        />
      </div>
    </div>
  );
}