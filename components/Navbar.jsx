import Link from "next/link";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-line/60 bg-ink/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-gemini via-groq to-deepseek">
            <span className="h-2.5 w-2.5 rounded-sm bg-ink" />
          </span>
          <span className="font-display text-lg font-semibold tracking-tight text-paper">
            MultiMind
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <a href="#models" className="text-sm text-mist transition hover:text-paper">
            Models
          </a>
          <a href="#how" className="text-sm text-mist transition hover:text-paper">
            How it works
          </a>
          <a href="#pricing" className="text-sm text-mist transition hover:text-paper">
            Pricing
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm font-medium text-mist transition hover:text-paper"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="rounded-full bg-paper px-4 py-2 text-sm font-semibold text-ink transition hover:bg-signal"
          >
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
}
