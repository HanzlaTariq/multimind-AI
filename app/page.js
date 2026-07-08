import Link from "next/link";
import { Zap, Brain, Layers, ArrowRight, Check } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import LiveDemo from "@/components/LiveDemo";

const MODELS = [
  {
    name: "Groq",
    icon: Zap,
    color: "text-groq",
    border: "border-groq/30",
    glow: "hover:shadow-groq/10",
    tagline: "The sprinter",
    desc: "Llama 3.3 70B running on Groq's LPU hardware. First to respond, every time — usually under half a second.",
  },
  {
    name: "Gemini",
    icon: Layers,
    color: "text-gemini",
    border: "border-gemini/30",
    glow: "hover:shadow-gemini/10",
    tagline: "The generalist",
    desc: "Google's 2.0 Flash model. Balanced, well-rounded answers with strong general knowledge and reasoning.",
  },
  {
    name: "DeepSeek",
    icon: Brain,
    color: "text-deepseek",
    border: "border-deepseek/30",
    glow: "hover:shadow-deepseek/10",
    tagline: "The thinker",
    desc: "Takes its time to reason through harder problems, and it shows — the most thorough of the three.",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Ask once",
    desc: "Type your question into a single box, same as any chat app you already know.",
  },
  {
    n: "02",
    title: "Three models answer in parallel",
    desc: "Gemini, Groq, and DeepSeek all receive your prompt at the same instant, no queueing.",
  },
  {
    n: "03",
    title: "Compare and decide",
    desc: "See every answer side by side with real latency numbers, and keep the one that actually helps.",
  },
];

const PLANS = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    features: ["20 parallel queries / day", "All 3 models", "7-day conversation history"],
    cta: "Start free",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$12",
    period: "/ month",
    features: [
      "Unlimited parallel queries",
      "All 3 models, priority routing",
      "Unlimited conversation history",
      "Export conversations",
    ],
    cta: "Go Pro",
    highlighted: true,
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-ink">
      <Navbar />

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pb-16 pt-16 sm:pt-24">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-signal" />
              <span className="font-mono text-xs text-mist">3 models · 1 prompt · 0 guesswork</span>
            </div>
            <h1 className="font-display text-4xl font-semibold leading-[1.1] tracking-tight text-paper sm:text-5xl">
              One prompt.
              <br />
              Three minds.
              <br />
              <span className="text-signal">No blind trust.</span>
            </h1>
            <p className="mt-6 max-w-md text-base leading-relaxed text-mist">
              Every AI has blind spots. MultiMind sends your question to Gemini, Groq, and
              DeepSeek at the same time, so you see where they agree — and catch it when
              they don&apos;t.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/signup"
                className="group inline-flex items-center gap-2 rounded-full bg-signal px-6 py-3 text-sm font-semibold text-ink transition hover:brightness-110"
              >
                Try it free
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-full border border-line px-6 py-3 text-sm font-medium text-paper transition hover:border-mist"
              >
                Log in
              </Link>
            </div>
          </div>

          <LiveDemo />
        </div>
      </section>

      {/* Models */}
      <section id="models" className="border-t border-line/60 bg-surface/30 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <p className="font-mono text-xs uppercase tracking-widest text-mist">The lineup</p>
          <h2 className="mt-2 font-display text-3xl font-semibold text-paper">
            Three different personalities, one console.
          </h2>

          <div className="mt-10 grid gap-5 sm:grid-cols-3">
            {MODELS.map((m) => (
              <div
                key={m.name}
                className={`rounded-2xl border ${m.border} bg-surface p-6 shadow-lg shadow-black/20 transition ${m.glow}`}
              >
                <m.icon className={`h-6 w-6 ${m.color}`} />
                <h3 className="mt-4 font-display text-xl font-semibold text-paper">{m.name}</h3>
                <p className={`mt-1 font-mono text-xs ${m.color}`}>{m.tagline}</p>
                <p className="mt-3 text-sm leading-relaxed text-mist">{m.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="py-20">
        <div className="mx-auto max-w-6xl px-6">
          <p className="font-mono text-xs uppercase tracking-widest text-mist">Process</p>
          <h2 className="mt-2 font-display text-3xl font-semibold text-paper">
            From question to consensus in three steps.
          </h2>

          <div className="mt-10 grid gap-8 sm:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="border-t border-line pt-5">
                <span className="font-mono text-sm text-mist/60">{s.n}</span>
                <h3 className="mt-2 font-display text-lg font-semibold text-paper">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-mist">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-t border-line/60 bg-surface/30 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <p className="font-mono text-xs uppercase tracking-widest text-mist">Pricing</p>
          <h2 className="mt-2 font-display text-3xl font-semibold text-paper">
            Start free. Upgrade when you outgrow it.
          </h2>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 sm:max-w-2xl">
            {PLANS.map((p) => (
              <div
                key={p.name}
                className={`rounded-2xl border p-7 ${
                  p.highlighted
                    ? "border-signal bg-surface shadow-xl shadow-signal/10"
                    : "border-line bg-surface"
                }`}
              >
                <h3 className="font-display text-lg font-semibold text-paper">{p.name}</h3>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="font-display text-3xl font-semibold text-paper">{p.price}</span>
                  <span className="text-sm text-mist">{p.period}</span>
                </div>
                <ul className="mt-5 space-y-2.5">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-mist">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-signal" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/signup"
                  className={`mt-7 block rounded-full px-5 py-2.5 text-center text-sm font-semibold transition ${
                    p.highlighted
                      ? "bg-signal text-ink hover:brightness-110"
                      : "border border-line text-paper hover:border-mist"
                  }`}
                >
                  {p.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
