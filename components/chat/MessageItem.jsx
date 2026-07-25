import { forwardRef } from "react";
import { FileText } from "lucide-react";
import AnswerBubble from "@/components/AnswerBubble";

const MessageItem = forwardRef(({
  turn,
  index,
  isLastPending,
  pending,
  regenerating,
  onRegenerate,
  onTogglePin,
  conversationId,
  temporaryMode,
  fontClass,
  shouldType,
  onTypingDone,
}, ref) => {
  return (
    <div
      ref={ref}
      className="scroll-mt-20 space-y-3"
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
        regenerating={regenerating}
        onRegenerate={onRegenerate}
        pinned={!!turn.pinned}
        onTogglePin={onTogglePin}
        onShare={turn.best && conversationId && !temporaryMode ? () => setShareModalOpen(true) : null}
        shouldType={shouldType}
        onTypingDone={onTypingDone}
        fontClass={fontClass}
      />
    </div>
  );
});

MessageItem.displayName = "MessageItem";

export default MessageItem;