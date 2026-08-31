import { useEffect, useRef, useState } from "react";
import { Send, Paperclip, Image as ImageIcon, X, FileText, Mic, MicOff } from "lucide-react";

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
  setError,
  onSend,
  isEmpty,
}) {
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const recognitionRef = useRef(null);
  const [listening, setListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);

  // Auto-grow the textarea with its content instead of staying pinned to a
  // single row — without this, text beyond one line just gets clipped
  // inside the fixed-height box (very visible on mobile, where the input
  // pill has little room to begin with). Capped at 160px (~max-h-40) to
  // match the scrollbar-thin/max-h-40 classes already on the element.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [prompt]);

  // Feature-detect the browser's built-in speech recognition (Web Speech
  // API). Checked after mount so server and first client render match
  // (no window on the server) — the mic button simply doesn't appear on
  // browsers that don't support it (e.g. Firefox), rather than showing a
  // disabled button that would confuse users.
  useEffect(() => {
    setSpeechSupported(!!(window.SpeechRecognition || window.webkitSpeechRecognition));
    return () => recognitionRef.current?.stop();
  }, []);

  const toggleListening = () => {
    if (!speechSupported) return;

    if (listening) {
      recognitionRef.current?.stop();
      return;
    }

    // The Web Speech API only runs in a "secure context" — https://, or
    // http://localhost during local dev. Over plain http on any other
    // host (e.g. testing via a LAN IP) it silently refuses to start, so
    // check this upfront and tell the user why instead of nothing happening.
    if (!window.isSecureContext) {
      setError?.(
        "Voice input needs a secure connection (https://, or http://localhost during development) — it won't work over a plain http:// address."
      );
      return;
    }

    setError?.("");

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      // Some browsers still fire onresult multiple times with a growing
      // partial transcript even when interimResults is false. Only the
      // LAST result entry's `isFinal` flag can be trusted, so ignore
      // every firing except the genuinely final one — otherwise each
      // partial firing gets appended on top of the last, duplicating
      // words (e.g. "Hello Hello how Hello how are Hello how are you").
      const lastResult = event.results[event.results.length - 1];
      if (!lastResult?.isFinal) return;

      const transcript = lastResult[0]?.transcript?.trim();
      if (transcript) {
        setPrompt((prev) => (prev.trim() ? `${prev.trim()} ${transcript}` : transcript));
      }
    };
    recognition.onerror = (event) => {
      setListening(false);
      const messages = {
        "not-allowed": "Microphone access was denied — allow microphone permission for this site in your browser settings and try again.",
        "service-not-allowed": "Microphone access was denied — allow microphone permission for this site in your browser settings and try again.",
        "no-speech": "Didn't catch that — try speaking again, closer to the mic.",
        "audio-capture": "No microphone was found — check that one is connected and not in use by another app.",
        network: "Voice input needs an internet connection to work.",
      };
      setError?.(messages[event.error] || "Voice input failed — please try again.");
    };
    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  };

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
        className={`flex items-end gap-0.5 rounded-[1.4rem] border border-line bg-surface p-1.5 transition-all focus-within:border-mist/50 sm:rounded-[1.75rem] sm:p-2 ${
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
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-mist transition hover:bg-surface2 hover:text-paper disabled:opacity-30 sm:mb-1 sm:h-8 sm:w-8"
          title="Attach a code/text file"
          aria-label="Attach file"
        >
          <Paperclip className="h-3.5 w-3.5" />
        </button>

        <button
          type="button"
          onClick={() => setImageMode((v) => !v)}
          disabled={temporaryMode}
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition disabled:opacity-30 sm:mb-1 sm:h-8 sm:w-8 ${
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
          <ImageIcon className="h-3.5 w-3.5" />
        </button>

        {speechSupported && (
          <button
            type="button"
            onClick={toggleListening}
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition sm:mb-1 sm:h-8 sm:w-8 ${
              listening
                ? "animate-pulse bg-red-500/15 text-red-400"
                : "text-mist hover:bg-surface2 hover:text-paper"
            }`}
            title={listening ? "Stop recording" : "Speak your message"}
            aria-label={listening ? "Stop voice input" : "Start voice input"}
          >
            {listening ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
          </button>
        )}

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
          className="chat-input-textarea scrollbar-thin max-h-40 min-w-0 flex-1 resize-none bg-transparent px-1.5 py-1.5 text-[14px] text-paper outline-none placeholder:text-mist/50 sm:py-2.5 sm:text-[15px]"
        />
        
        <button
          type="submit"
          disabled={pending || (!prompt.trim() && !attachment)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-paper text-ink transition-all hover:bg-signal active:scale-95 disabled:cursor-not-allowed disabled:bg-surface2 disabled:text-mist/40 sm:h-10 sm:w-10"
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