// components/chat/ChatMessages.jsx
import { FileText } from "lucide-react";
import AnswerBubble from "@/components/AnswerBubble";

export default function ChatMessages({
  turns,
  pending,
  regeneratingIndex,
  onRegenerate,
  onTogglePin,
  conversationId,
  temporaryMode,
  settings,
  alreadyShownRef,
  turnRefs,
  bottomRef,
  onShare,
}) {
  const fontClass =
    settings.chatFont === "serif"
      ? "font-serif"
      : settings.chatFont === "mono"
      ? "font-mono"
      : "";

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-6 sm:px-8">
      <div className="mx-auto max-w-2xl space-y-8">
        {turns.map((turn, i) => {
          const isLastPending = pending && i === turns.length - 1;

          return (
            <div
              key={i}
              ref={(el) => (turnRefs.current[i] = el)}
              className={`${settings.reduceMotion ? "" : "animate-rise"} scroll-mt-20 space-y-3`}
            >
              {/* User message */}
              <div className="flex justify-end">
                <div className="flex max-w-[85%] flex-col items-end gap-1.5 sm:max-w-[75%]">
                  {turn.attachmentName && (
                    <div className="flex items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1 text-xs text-mist">
                      <FileText className="h-3 w-3" />
                      {turn.attachmentName}
                    </div>
                  )}
                  <div
                    className={`rounded-2xl rounded-tr-sm bg-surface px-4 py-2.5 text-[15px] text-paper ${fontClass}`}
                  >
                    {turn.prompt}
                  </div>
                </div>
              </div>

              {/* AI response */}
              <AnswerBubble
                best={turn.best}
                responses={turn.responses}
                pending={isLastPending && !turn.best}
                pendingLabel={turn._pendingType === "image" ? "Generating image…" : undefined}
                regenerating={regeneratingIndex === i}
                onRegenerate={
                  turn.best && regeneratingIndex === null ? () => onRegenerate(i) : null
                }
                pinned={!!turn.pinned}
                onTogglePin={turn.best && conversationId ? () => onTogglePin(i) : null}
                onShare={onShare}
                shouldType={!!turn.best && !alreadyShownRef.current.has(i) && !settings.reduceMotion}
                onTypingDone={() => alreadyShownRef.current.add(i)}
                fontClass={fontClass}
              />
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}