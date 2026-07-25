import { useRef } from "react";
import { Send, Paperclip, Image as ImageIcon, X, FileText } from "lucide-react";

const MAX_ATTACHMENT_BYTES = 150 * 1024;
const ATTACHMENT_ACCEPT =
  ".js,.jsx,.ts,.tsx,.py,.java,.c,.cpp,.h,.cs,.go,.rb,.php,.html,.css,.scss,.json,.txt,.md,.sql,.sh,.yaml,.yml,.xml";

export default function ChatInput({
  prompt,
  setPrompt,
  pending,
  attachment,
  setAttachment,
  imageMode,
  setImageMode,
  temporaryMode,
  error,
  onSend,
  isEmpty,
}) {
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (file.size > MAX_ATTACHMENT_BYTES) {
      setError(`"${file.name}" is too large — please attach a file under 150KB.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setError("");
      setAttachment({ name: file.name, content: reader.result });
      textareaRef.current?.focus();
    };
    reader.onerror = () => setError("Couldn't read that file — please try again.");
    reader.readAsText(file);
  };

  const removeAttachment = () => {
    setAttachment(null);
  };

  const handleSend = (e) => {
    e.preventDefault();
    if ((!prompt.trim() && !attachment) || pending) return;
    const text = prompt;
    const currentAttachment = attachment;
    const currentImageMode = imageMode;
    setPrompt("");
    setAttachment(null);
    onSend(text, { attachment: currentAttachment, imageMode: currentImageMode });
  };

  return (
    <div className="mx-auto w-full max-w-2xl">
      {attachment && (
        <div className="mb-2 flex w-fit items-center gap-2 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs text-paper">
          <FileText className="h-3.5 w-3.5 text-signal" />
          {attachment.name}
          <button
            onClick={removeAttachment}
            className="text-mist transition hover:text-paper"
            aria-label="Remove attachment"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <form
        onSubmit={handleSend}
        className={`flex items-end gap-2 rounded-[1.75rem] border border-line bg-surface p-2.5 transition-all focus-within:border-mist/50 ${
          isEmpty ? "shadow-2xl shadow-black/30" : "shadow-lg shadow-black/20"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ATTACHMENT_ACCEPT}
          onChange={handleFileChange}
          className="hidden"
        />
        
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={imageMode}
          className="mb-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-mist transition hover:bg-surface2 hover:text-paper disabled:opacity-30"
          title="Attach a code/text file"
          aria-label="Attach file"
        >
          <Paperclip className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => setImageMode((v) => !v)}
          disabled={temporaryMode}
          className={`mb-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition disabled:opacity-30 ${
            imageMode ? "bg-signal/15 text-signal" : "text-mist hover:bg-surface2 hover:text-paper"
          }`}
          title={
            temporaryMode
              ? "Image generation isn't available in Temporary Chat"
              : imageMode
              ? "Image mode on"
              : "Generate an image instead"
          }
          aria-label="Toggle image generation mode"
        >
          <ImageIcon className="h-4 w-4" />
        </button>

        <textarea
          ref={textareaRef}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend(e);
            }
          }}
          rows={1}
          placeholder={imageMode ? "Describe an image to generate…" : "How can I help you today?"}
          className="scrollbar-thin max-h-40 flex-1 resize-none bg-transparent px-1.5 py-2.5 text-[15px] text-paper outline-none placeholder:text-mist/50"
        />
        
        <button
          type="submit"
          disabled={pending || (!prompt.trim() && !attachment)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-paper text-ink transition-all hover:bg-signal active:scale-95 disabled:cursor-not-allowed disabled:bg-surface2 disabled:text-mist/40"
          aria-label="Send"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>

      {imageMode && (
        <p className="mt-2 text-center text-[11px] text-mist/50">
          Image mode is on — your next message will generate an image instead of a chat reply.
        </p>
      )}
      {error && <p className="mt-2 text-center text-xs text-red-400">{error}</p>}
    </div>
  );
}