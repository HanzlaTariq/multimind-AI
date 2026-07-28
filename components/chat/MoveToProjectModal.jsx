"use client";

import { useEffect, useState } from "react";
import { X, FolderKanban, Plus, Loader2, Check } from "lucide-react";

export default function MoveToProjectModal({ onClose, onMove }) {
  const [projects, setProjects] = useState(null);
  const [error, setError] = useState("");
  const [creatingNew, setCreatingNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [movingId, setMovingId] = useState(null);
  const [submittingNew, setSubmittingNew] = useState(false);

  useEffect(() => {
    fetch("/api/projects")
      .then((res) => res.json())
      .then((data) => setProjects(data.projects || []))
      .catch(() => setError("Couldn't load your projects"));
  }, []);

  async function handleMoveExisting(project) {
    setMovingId(project._id);
    setError("");
    const ok = await onMove(project._id);
    if (!ok) {
      setError("Couldn't move this chat — please try again");
      setMovingId(null);
    }
  }

  async function handleCreateAndMove(e) {
    e.preventDefault();
    if (!newName.trim() || submittingNew) return;
    setSubmittingNew(true);
    setError("");
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Couldn't create project");
        setSubmittingNew(false);
        return;
      }
      const ok = await onMove(data.project._id);
      if (!ok) {
        setError("Project created, but couldn't move this chat — please try again");
        setSubmittingNew(false);
      }
    } catch (e) {
      setError("Network error — please try again");
      setSubmittingNew(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-surface p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-base font-semibold text-paper">Move to project</h3>
          <button onClick={onClose} className="text-mist transition hover:text-paper" aria-label="Close">
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {error && <p className="mb-3 text-xs text-red-400">{error}</p>}

        {!projects && !error && (
          <div className="flex items-center gap-2 py-4 text-sm text-mist">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading projects…
          </div>
        )}

        {projects && (
          <div className="max-h-64 space-y-1 overflow-y-auto scrollbar-thin">
            {projects.length === 0 && !creatingNew && (
              <p className="px-1 py-2 text-xs text-mist/60">
                You don't have any projects yet — create one below.
              </p>
            )}
            {projects.map((p) => (
              <button
                key={p._id}
                onClick={() => handleMoveExisting(p)}
                disabled={movingId !== null}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-paper transition hover:bg-surface2 disabled:opacity-50"
              >
                <FolderKanban className="h-3.5 w-3.5 shrink-0 text-signal" />
                <span className="flex-1 truncate">{p.name}</span>
                {movingId === p._id && <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />}
              </button>
            ))}
          </div>
        )}

        <div className="mt-3 border-t border-line/60 pt-3">
          {creatingNew ? (
            <form onSubmit={handleCreateAndMove} className="flex items-center gap-1.5">
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="New project name"
                className="min-w-0 flex-1 rounded-lg border border-line bg-surface2 px-2.5 py-1.5 text-sm text-paper outline-none focus:border-signal/50"
              />
              <button
                type="submit"
                disabled={!newName.trim() || submittingNew}
                className="flex shrink-0 items-center gap-1 rounded-lg bg-signal px-2.5 py-1.5 text-xs font-semibold text-ink transition hover:opacity-90 disabled:opacity-50"
              >
                {submittingNew ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              </button>
            </form>
          ) : (
            <button
              onClick={() => setCreatingNew(true)}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-signal transition hover:bg-surface2"
            >
              <Plus className="h-3.5 w-3.5" />
              Create a new project
            </button>
          )}
        </div>
      </div>
    </div>
  );
}