import { X, Pin } from "lucide-react";

export default function OutlinePanel({
  open,
  onClose,
  turns,
  pinnedTurns,
  outlineTab,
  setOutlineTab,
  onScrollToTurn,
}) {
  return (
    <>
      {open && (
        <button
          className="fixed inset-0 z-40 bg-black/40"
          onClick={onClose}
          aria-label="Close outline overlay"
        />
      )}
      
      <aside
        className={`fixed inset-y-0 right-0 z-50 w-80 max-w-[85vw] transform border-l border-line bg-ink transition-transform duration-200 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-line px-4 py-4">
            <span className="font-display text-sm font-semibold text-paper">This conversation</span>
            <button onClick={onClose} className="text-mist" aria-label="Close">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex border-b border-line px-4">
            <button
              onClick={() => setOutlineTab("outline")}
              className={`border-b-2 px-3 py-2.5 text-xs font-medium transition ${
                outlineTab === "outline"
                  ? "border-signal text-paper"
                  : "border-transparent text-mist hover:text-paper"
              }`}
            >
              Outline
            </button>
            <button
              onClick={() => setOutlineTab("pinned")}
              className={`flex items-center gap-1 border-b-2 px-3 py-2.5 text-xs font-medium transition ${
                outlineTab === "pinned"
                  ? "border-signal text-paper"
                  : "border-transparent text-mist hover:text-paper"
              }`}
            >
              Pinned {pinnedTurns.length > 0 && `(${pinnedTurns.length})`}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-thin p-3">
            {outlineTab === "outline" &&
              (turns.length === 0 ? (
                <p className="px-2 py-6 text-center text-xs text-mist/60">Nothing here yet.</p>
              ) : (
                <div className="space-y-1">
                  {turns.map((t, i) => (
                    <button
                      key={i}
                      onClick={() => onScrollToTurn(i)}
                      className="flex w-full items-start gap-2 rounded-lg px-3 py-2.5 text-left text-xs text-mist transition hover:bg-surface2 hover:text-paper"
                    >
                      <span className="mt-0.5 shrink-0 font-mono text-[10px] text-mist/50">
                        {i + 1}
                      </span>
                      <span className="line-clamp-2">{t.prompt}</span>
                      {t.pinned && <Pin className="ml-auto h-3 w-3 shrink-0 text-signal" />}
                    </button>
                  ))}
                </div>
              ))}

            {outlineTab === "pinned" &&
              (pinnedTurns.length === 0 ? (
                <p className="px-2 py-6 text-center text-xs text-mist/60">
                  Pin any answer and it'll show up here for quick access.
                </p>
              ) : (
                <div className="space-y-1">
                  {pinnedTurns.map((t) => (
                    <button
                      key={t.index}
                      onClick={() => onScrollToTurn(t.index)}
                      className="flex w-full items-start gap-2 rounded-lg px-3 py-2.5 text-left text-xs text-mist transition hover:bg-surface2 hover:text-paper"
                    >
                      <Pin className="mt-0.5 h-3 w-3 shrink-0 text-signal" />
                      <span className="line-clamp-2">{t.prompt}</span>
                    </button>
                  ))}
                </div>
              ))}
          </div>
        </div>
      </aside>
    </>
  );
}