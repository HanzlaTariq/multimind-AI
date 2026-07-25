import { X } from "lucide-react";

export default function DeleteModal({ open, onClose, onConfirm }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-md rounded-3xl border border-line bg-surface p-6 text-left shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-signal">
              Confirm delete
            </p>
            <h3 className="mt-3 text-xl font-semibold text-paper">
              Are you sure you want to delete this chat?
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-mist transition hover:text-paper"
            aria-label="Close delete confirmation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mb-6 text-sm leading-6 text-mist/80">
          This action cannot be undone. The chat and its messages will be removed from your conversation history.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            onClick={onClose}
            className="rounded-full border border-line bg-transparent px-4 py-2 text-sm text-mist transition hover:border-mist/40 hover:text-paper"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="rounded-full bg-red-500 px-4 py-2 text-sm font-semibold text-paper transition hover:bg-red-600"
          >
            Yes, delete it
          </button>
        </div>
      </div>
    </div>
  );
}