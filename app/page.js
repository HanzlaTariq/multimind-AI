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

const STATS = [
  { value: "3", label: "AI models compared every time" },
  { value: "<1s", label: "Fastest model typically responds" },
  { value: "100%", label: "Transparent — see who answered" },
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
    title: "Get the best one",
    desc: "MultiMind picks the strongest answer automatically, so you don't have to compare manually.",
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

const FAQS = [
  {
    q: "How does MultiMind pick the best answer?",
    a: "Every prompt is sent to Gemini, Groq, and DeepSeek at the same time. A lightweight judging step then compares whichever answers came back successfully and picks the strongest one — you just see the winner, not three separate replies to sort through yourself.",
  },
  {
    q: "What happens if one of the models is down?",
    a: "MultiMind quietly falls back to whichever models responded successfully. You won't see error messages from individual providers — only a clean answer, or a short note if all three happen to be unavailable at once.",
  },
  {
    q: "Does MultiMind remember earlier messages in a conversation?",
    a: "Yes. Each conversation keeps its history, and that context is passed to all three models on every new message, so follow-up questions work the way you'd expect.",
  },
  {
    q: "Is my data private?",
    a: "Your conversations are tied to your account and stored securely. We don't sell your data or use it to train models beyond what each underlying provider's API terms specify.",
  },
  {
    q: "Can I cancel Pro anytime?",
    a: "Yes, there's no lock-in — you can cancel from your account settings at any time and you'll keep Pro access until the end of your current billing period.",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-ink pt-20 md:pt-0">
      <Navbar />

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pb-10 pt-16 sm:pt-24">
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
              DeepSeek at the same time, then hands you back the single best answer.
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

      {/* Stats bar */}
      <section className="border-y border-line/60 bg-surface/30">
        <div className="mx-auto grid max-w-6xl grid-cols-1 divide-y divide-line/60 sm:grid-cols-3 sm:divide-x sm:divide-y-0 px-6">
          {STATS.map((s) => (
            <div key={s.label} className="flex flex-col items-center gap-1 py-8 text-center sm:px-6">
              <span className="font-display text-3xl font-semibold text-signal">{s.value}</span>
              <span className="text-sm text-mist">{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Models */}
      <section id="models" className="py-20">
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
      <section id="how" className="border-t border-line/60 bg-surface/30 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <p className="font-mono text-xs uppercase tracking-widest text-mist">Process</p>
          <h2 className="mt-2 font-display text-3xl font-semibold text-paper">
            From question to answer in three steps.
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
      <section id="pricing" className="py-20">
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

      {/* FAQ */}
      <section id="faq" className="border-t border-line/60 bg-surface/30 py-20">
        <div className="mx-auto max-w-3xl px-6">
          <p className="font-mono text-xs uppercase tracking-widest text-mist">FAQ</p>
          <h2 className="mt-2 font-display text-3xl font-semibold text-paper">
            Questions, answered.
          </h2>

          <div className="mt-8 divide-y divide-line">
            {FAQS.map((f) => (
              <details key={f.q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium text-paper">
                  {f.q}
                  <span className="shrink-0 text-mist transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-mist">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="py-20">
        <div className="mx-auto max-w-4xl rounded-3xl border border-line bg-surface px-8 py-14 text-center sm:px-14">
          <h2 className="font-display text-3xl font-semibold text-paper sm:text-4xl">
            Stop guessing which AI to ask.
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-mist">
            Let three models compete on every question, and get the best answer without lifting a finger.
          </p>
          <Link
            href="/signup"
            className="mt-7 inline-flex items-center gap-2 rounded-full bg-signal px-7 py-3 text-sm font-semibold text-ink transition hover:brightness-110"
          >
            Try MultiMind free
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}