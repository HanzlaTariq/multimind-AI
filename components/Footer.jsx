import Link from "next/link";
import { ArrowRight, Sparkles, Zap } from "lucide-react";

const LINKS = [
  { href: "#models", label: "Models" },
  { href: "#how", label: "Workflow" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];

const PROVIDERS = ["ChatGPT", "Claude", "Gemini", "Groq", "DeepSeek", "More soon"];

export default function Footer() {
  return (
    <footer className="border-t border-line/60 bg-surface/30">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-8">
        <div className="grid gap-8 rounded-2xl border border-line bg-surface p-5 sm:p-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <Link href="/" className="inline-flex items-center gap-3">
              <span className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-signal/20 bg-signal/10">
                <Sparkles className="h-4 w-4 text-signal" />
                <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-groq ring-2 ring-surface" />
              </span>
              <span>
                <span className="block font-display text-lg font-semibold leading-none text-paper">
                  MultiMind
                </span>
                <span className="mt-1 block font-mono text-[10px] uppercase tracking-widest text-mist">
                  All-in-one AI workspace
                </span>
              </span>
            </Link>

            <p className="mt-4 max-w-md text-sm leading-relaxed text-mist">
              Ask once and route work across leading AI models, including ChatGPT, Claude, Gemini, Groq, DeepSeek, and future providers.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              {PROVIDERS.map((provider) => (
                <span
                  key={provider}
                  className="rounded-full border border-line bg-ink/40 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-mist"
                >
                  {provider}
                </span>
              ))}
            </div>
          </div>

          <div className="flex flex-col justify-between gap-6">
            <div className="grid grid-cols-2 gap-2">
              {LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="rounded-lg border border-line bg-ink/30 px-3 py-2 text-sm text-mist transition hover:border-mist hover:text-paper"
                >
                  {link.label}
                </a>
              ))}
            </div>

            <div className="rounded-2xl border border-signal/20 bg-signal/5 p-4">
              <p className="flex items-center gap-2 text-sm font-medium text-paper">
                <Zap className="h-4 w-4 text-signal" />
                Build your AI stack from one place.
              </p>
              <Link
                href="/signup"
                className="mt-3 inline-flex items-center gap-2 rounded-full bg-signal px-4 py-2 text-xs font-semibold text-ink transition hover:brightness-110"
              >
                Start free
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col justify-between gap-3 border-t border-line pt-5 text-xs text-mist sm:flex-row sm:items-center">
          <p>© {new Date().getFullYear()} MultiMind. Built for comparing and routing AI answers.</p>
          <p className="font-mono text-[10px] uppercase tracking-widest text-mist/70">
            Independent product. Provider names belong to their owners.
          </p>
        </div>
      </div>
    </footer>
  );
}
