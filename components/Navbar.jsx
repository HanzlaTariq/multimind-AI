"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Menu, X } from "lucide-react";

const LINKS = [
  { href: "#models", label: "Models" },
  { href: "#how", label: "How it works" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];

function MobileMenu({ onClose }) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[100] md:hidden">
      <button
        className="absolute inset-0 h-full w-full"
        style={{ backgroundColor: "rgba(0,0,0,0.75)" }}
        onClick={onClose}
        aria-label="Close menu overlay"
      />

      <aside
        className="absolute inset-y-0 left-0 flex w-[86vw] max-w-[20rem] flex-col border-r border-line shadow-2xl shadow-black/50"
        style={{ backgroundColor: "#0B0E14" }}
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-4">
          <span className="font-display text-lg font-semibold text-paper">MultiMind</span>
          <button
            onClick={onClose}
            className="rounded-full border border-line bg-surface p-2 text-paper"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-2 px-4 py-5">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={onClose}
              className="rounded-xl border border-line bg-surface px-4 py-3 text-base font-medium text-paper transition hover:border-mist hover:bg-surface2"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="border-t border-line p-4">
          <Link
            href="/login"
            onClick={onClose}
            className="block rounded-full border border-line bg-surface px-4 py-3 text-center text-sm font-medium text-paper transition hover:bg-surface2"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            onClick={onClose}
            className="mt-3 block rounded-full bg-signal px-4 py-3 text-center text-sm font-semibold text-ink"
          >
            Get started
          </Link>
        </div>
      </aside>
    </div>
  );
}

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-line/60 bg-ink/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
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
          className="shrink-0 text-paper md:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-6 w-6" />
        </button>
      </div>

      {open &&
        mounted &&
        createPortal(<MobileMenu onClose={() => setOpen(false)} />, document.body)}
    </header>
  );
}