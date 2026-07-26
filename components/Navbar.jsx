"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { ArrowRight, Menu, Sparkles, X, Zap } from "lucide-react";

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
        className="absolute inset-y-0 left-0 flex w-[88vw] max-w-[22rem] flex-col border-r border-line bg-ink shadow-2xl shadow-black/50"
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-4">
          <Link href="/" onClick={onClose} className="flex items-center gap-3">
            <span className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-signal/20 bg-signal/10">
              <Sparkles className="h-4 w-4 text-signal" />
              <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-groq" />
            </span>
            <span>
              <span className="block font-display text-lg font-semibold leading-none text-paper">
                MultiMind
              </span>
              <span className="mt-1 block font-mono text-[10px] uppercase tracking-widest text-mist">
                Model router
              </span>
            </span>
          </Link>
          <button
            onClick={onClose}
            className="rounded-lg border border-line bg-surface p-2 text-paper transition hover:border-mist"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="border-b border-line px-4 py-4">
          <div className="rounded-2xl border border-line bg-surface p-4">
            <p className="flex items-center gap-2 text-sm font-medium text-paper">
              <Zap className="h-4 w-4 text-signal" />
              One prompt, many models
            </p>
            <p className="mt-2 text-xs leading-relaxed text-mist">
              ChatGPT, Claude, Gemini, Groq, DeepSeek and future providers in one workspace.
            </p>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-2 px-4 py-5">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={onClose}
              className="rounded-xl border border-line bg-surface px-4 py-3 text-sm font-medium text-paper transition hover:border-mist hover:bg-surface2"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="border-t border-line p-4">
          <Link
            href="/login"
            onClick={onClose}
            className="block rounded-full border border-line bg-surface px-4 py-3 text-center text-sm font-medium text-paper transition hover:border-mist hover:bg-surface2"
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
    <header className="fixed inset-x-0 top-0 z-50 border-b border-line/60 bg-ink/85 backdrop-blur-xl md:sticky md:top-0">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-8">
        <Link href="/" className="group flex items-center gap-3">
          <span className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-signal/20 bg-signal/10 shadow-lg shadow-signal/10 transition group-hover:border-signal/40">
            <Sparkles className="h-4 w-4 text-signal" />
            <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-groq ring-2 ring-ink" />
          </span>
          <span>
            <span className="block font-display text-lg font-semibold leading-none tracking-tight text-paper">
              MultiMind
            </span>
            <span className="mt-1 hidden font-mono text-[10px] uppercase tracking-widest text-mist sm:block">
              All-in-one AI workspace
            </span>
          </span>
        </Link>

        <nav className="hidden items-center rounded-full border border-line bg-surface/70 p-1 md:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-full px-4 py-2 text-sm text-mist transition hover:bg-surface2 hover:text-paper"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <div className="hidden items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-2 lg:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-signal" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-mist">
              ChatGPT + Claude + more
            </span>
          </div>
          <Link href="/login" className="text-sm font-medium text-mist transition hover:text-paper">
            Log in
          </Link>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 rounded-full bg-signal px-4 py-2 text-sm font-semibold text-ink transition hover:brightness-110"
          >
            Get started
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <button
          onClick={() => setOpen(true)}
          className="rounded-lg border border-line bg-surface p-2 text-paper transition hover:border-mist md:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {open &&
        mounted &&
        createPortal(<MobileMenu onClose={() => setOpen(false)} />, document.body)}
    </header>
  );
}
