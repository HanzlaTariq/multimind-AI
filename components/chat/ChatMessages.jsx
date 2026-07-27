// components/chat/ChatMessages.jsx
import AnswerBubble from "@/components/AnswerBubble";
import UserMessageBubble from "./UserMessageBubble";

export default function ChatMessages({
  turns,
  pending,
  regeneratingIndex,
  onRegenerate,
  onEditPrompt,
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
          const canEditOrRetry = !!turn.best && pending === false && regeneratingIndex === null;

          return (
            <div
              key={i}
              ref={(el) => (turnRefs.current[i] = el)}
              className={`${settings.reduceMotion ? "" : "animate-rise"} scroll-mt-20 space-y-3`}
            >
              {/* User message */}
              <UserMessageBubble
                turn={turn}
                index={i}
                fontClass={fontClass}
                canEditOrRetry={canEditOrRetry}
                onEditPrompt={onEditPrompt}
                onRetry={turn.best ? () => onRegenerate(i) : null}
              />

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