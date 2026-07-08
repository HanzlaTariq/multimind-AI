export default function Footer() {
  return (
    <footer className="border-t border-line/60 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 text-sm text-mist sm:flex-row">
        <p>© {new Date().getFullYear()} MultiMind. Built on Gemini, Groq &amp; DeepSeek.</p>
        <p className="font-mono text-xs text-mist/60">
          Not affiliated with Google, Groq Inc., or DeepSeek.
        </p>
      </div>
    </footer>
  );
}
