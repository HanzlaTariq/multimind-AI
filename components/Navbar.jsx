"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

const LINKS = [
  { href: "#models", label: "Models" },
  { href: "#how", label: "How it works" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

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
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="text-sm text-mist transition hover:text-paper">
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link href="/login" className="text-sm font-medium text-mist transition hover:text-paper">
            Log in
          </Link>
          <Link
            href="/signup"
            className="rounded-full bg-paper px-4 py-2 text-sm font-semibold text-ink transition hover:bg-signal"
          >
            Get started
          </Link>
        </div>

        <button
          onClick={() => setOpen(true)}
          className="text-paper md:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-6 w-6" />
        </button>
      </div>

      {/* Mobile menu overlay */}
      {open && (
        <div className="fixed inset-0 z-[60] bg-ink md:hidden">
          <div className="flex items-center justify-between px-6 py-4">
            <span className="font-display text-lg font-semibold text-paper">MultiMind</span>
            <button onClick={() => setOpen(false)} className="text-paper" aria-label="Close menu">
              <X className="h-6 w-6" />
            </button>
          </div>
          <nav className="flex flex-col gap-1 px-6 py-4">
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-3 text-base text-paper transition hover:bg-surface"
              >
                {l.label}
              </a>
            ))}
          </nav>
          <div className="mt-4 flex flex-col gap-3 px-6">
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="rounded-full border border-line px-4 py-3 text-center text-sm font-medium text-paper"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              onClick={() => setOpen(false)}
              className="rounded-full bg-signal px-4 py-3 text-center text-sm font-semibold text-ink"
            >
              Get started
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}