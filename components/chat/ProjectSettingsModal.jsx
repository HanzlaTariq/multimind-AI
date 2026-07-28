"use client";

import { useRef, useState } from "react";
import { X, FileText, Trash2, Upload, Check, Loader2 } from "lucide-react";

const MAX_FILE_BYTES = 200 * 1024;
const FILE_ACCEPT =
  ".js,.jsx,.ts,.tsx,.py,.java,.c,.cpp,.h,.cs,.go,.rb,.php,.html,.css,.scss,.json,.txt,.md,.sql,.sh,.yaml,.yml,.xml,.csv";

export default function ProjectSettingsModal({
  project,
  onClose,
  onSave,
  onUploadFile,
  onDeleteFile,
  onRequestDeleteProject,
}) {
  const [name, setName] = useState(project.name);
  const [instructions, setInstructions] = useState(project.instructions || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  async function handleSave() {
    setSaving(true);
    setError("");
    const ok = await onSave({ name: name.trim() || project.name, instructions });
    setSaving(false);
    if (ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } else {
      setError("Couldn't save — please try again");
    }
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (file.size > MAX_FILE_BYTES) {
      setError(`"${file.name}" is too large — please attach a file under 200KB.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      setError("");
      setUploading(true);
      const ok = await onUploadFile({ name: file.name, content: reader.result });
      setUploading(false);
      if (!ok) setError("Couldn't add that file — please try again.");
    };
    reader.onerror = () => setError("Couldn't read that file — please try again.");
    reader.readAsText(file);
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4">
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-2xl border border-line bg-surface p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold text-paper">Project settings</h3>
          <button onClick={onClose} className="text-mist transition hover:text-paper" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto scrollbar-thin pr-1">
          <div>
            <label className="mb-1 block text-xs text-mist">Project name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-line bg-surface2 px-3 py-2 text-sm text-paper outline-none focus:border-signal/50"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-mist">
              Instructions — applied to every chat in this project
            </label>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={6}
              placeholder="e.g. You're helping with our Q3 marketing plan. Always respond in a professional tone and reference the uploaded brand guidelines."
              className="w-full resize-none rounded-lg border border-line bg-surface2 px-3 py-2 text-sm text-paper outline-none focus:border-signal/50"
            />
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-xs text-mist">Files — used as context in this project</label>
              <input
                ref={fileInputRef}
                type="file"
                accept={FILE_ACCEPT}
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-signal transition hover:bg-surface2 disabled:opacity-50"
              >
                {uploading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Upload className="h-3.5 w-3.5" />
                )}
                Add file
              </button>
            </div>

            {(!project.files || project.files.length === 0) && (
              <p className="rounded-lg border border-dashed border-line px-3 py-3 text-xs text-mist/60">
                No files yet — text and code files up to 200KB.
              </p>
            )}

            {project.files?.length > 0 && (
              <ul className="space-y-1">
                {project.files.map((f) => (
                  <li
                    key={f._id}
                    className="flex items-center justify-between rounded-lg border border-line bg-surface2 px-3 py-2 text-xs text-paper"
                  >
                    <span className="flex min-w-0 items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5 shrink-0 text-signal" />
                      <span className="truncate">{f.name}</span>
                    </span>
                    <button
                      onClick={() => onDeleteFile(f._id)}
                      className="shrink-0 rounded p-1 text-mist transition hover:bg-red-500/10 hover:text-red-400"
                      aria-label={`Remove ${f.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
            <p className="mb-1 text-xs font-medium text-red-400">Danger zone</p>
            <p className="mb-2 text-[11px] text-mist/70">
              Deletes this project, its instructions, and its files. Chats inside it move back to
              your main Recents list.
            </p>
            <button
              onClick={() => onRequestDeleteProject?.()}
              className="rounded-md border border-red-500/30 px-2.5 py-1 text-xs text-red-400 transition hover:bg-red-500/10"
            >
              Delete project
            </button>
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2 border-t border-line/60 pt-4">
          <button
            onClick={onClose}
            className="rounded-lg px-3.5 py-2 text-sm text-mist transition hover:bg-surface2 hover:text-paper"
          >
            Close
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-lg bg-signal px-3.5 py-2 text-sm font-semibold text-ink transition hover:opacity-90 disabled:opacity-60"
          >
            {saved ? <Check className="h-4 w-4" /> : null}
            {saving ? "Saving…" : saved ? "Saved" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}