import Link from "next/link";
import {
  ArrowRight,
  Bot,
  Brain,
  Check,
  Gauge,
  Layers,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import LiveDemo from "@/components/LiveDemo";

const MODELS = [
  {
    name: "ChatGPT",
    icon: Bot,
    color: "text-signal",
    border: "border-signal/30",
    tagline: "Creative + capable",
    desc: "Great for writing, coding help, planning, and practical problem solving.",
  },
  {
    name: "Claude",
    icon: Sparkles,
    color: "text-paper",
    border: "border-paper/20",
    tagline: "Careful analysis",
    desc: "Strong for long-form thinking, summaries, and nuanced explanations.",
  },
  {
    name: "Groq",
    icon: Zap,
    color: "text-groq",
    border: "border-groq/30",
    tagline: "Fast answers",
    desc: "Llama 3.3 70B on Groq hardware for low-latency first drafts.",
  },
  {
    name: "Gemini",
    icon: Layers,
    color: "text-gemini",
    border: "border-gemini/30",
    tagline: "Balanced reasoning",
    desc: "A strong generalist for everyday questions, planning, and writing.",
  },
  {
    name: "DeepSeek",
    icon: Brain,
    color: "text-deepseek",
    border: "border-deepseek/30",
    tagline: "Deeper analysis",
    desc: "Useful when the task needs careful reasoning and a more thorough pass.",
  },
];

const MODEL_CLOUD = [
  "ChatGPT",
  "Claude",
  "Gemini",
  "Groq",
  "DeepSeek",
  "Llama",
  "Mistral",
  "Perplexity",
  "More soon",
];

const FEATURES = [
  {
    icon: MessageSquareText,
    title: "Ask once",
    desc: "Send one prompt and let MultiMind route it to the best available AI models at the same time.",
  },
  {
    icon: Gauge,
    title: "Compare quietly",
    desc: "The app watches speed, completeness, and quality so you do not have to juggle tabs.",
  },
  {
    icon: ShieldCheck,
    title: "Keep context",
    desc: "Your conversations stay tied to your account, with history available when you need it.",
  },
];

const PLAN_TIERS = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    features: ["60 starter credits", "Smart model routing", "Conversation history"],
    cta: "Start free",
    highlighted: false,
  },
  {
    name: "Basic",
    price: "$9.99",
    period: "/ month",
    features: ["1,500 credits/month", "All core tools", "Full conversation history"],
    cta: "Upgrade to Basic",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$24.99",
    period: "/ month",
    features: ["8,000 credits/month", "Priority routing", "PDF export"],
    cta: "Upgrade to Pro",
    highlighted: true,
  },
  {
    name: "Business",
    price: "$59.99",
    period: "/ month",
    features: ["30,000 credits/month", "Highest priority", "Everything in Pro"],
    cta: "Upgrade to Business",
    highlighted: false,
  },
];

const FAQS = [
  {
    q: "How does MultiMind choose an answer?",
    a: "Your prompt is sent to supported models in parallel. MultiMind then surfaces the strongest successful response.",
  },
  {
    q: "What happens if a model is unavailable?",
    a: "MultiMind falls back to the models that respond successfully and keeps the experience clean.",
  },
  {
    q: "Can I manage my plan later?",
    a: "Yes. Paid users can manage billing from the settings page at any time.",
  },
];
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "FAQPage",
      mainEntity: FAQS.map((faq) => ({
        "@type": "Question",
        name: faq.q,
        acceptedAnswer: { "@type": "Answer", text: faq.a },
      })),
    },
    {
      "@type": "SoftwareApplication",
      name: "MultiMind",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      description:
        "MultiMind brings ChatGPT, Claude, Gemini, Groq, DeepSeek, and future models into one focused workspace so you can ask once and get the strongest answer.",
      offers: PLAN_TIERS.map((plan) => ({
        "@type": "Offer",
        name: plan.name,
        price: plan.price.replace("$", ""),
        priceCurrency: "USD",
      })),
    },
  ],
};
export default function Home() {
  return (
    <div className="min-h-screen bg-ink pt-16 sm:pt-20 md:pt-0">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 py-6 sm:py-10  sm:px-8">
        <section className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div className="max-w-xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-xs text-mist">
              <Sparkles className="h-3.5 w-3.5 text-signal" />
              <span className="font-mono">All major models. 1 prompt. Better answers.</span>
            </div>

            <h1 className="font-display text-4xl font-semibold leading-tight text-paper sm:text-5xl">
              One clean workspace for every leading AI.
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-mist sm:text-base">
              MultiMind brings ChatGPT, Claude, Gemini, Groq, DeepSeek, and future models into one focused interface so you can ask once and get the strongest answer.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 rounded-full bg-signal px-5 py-2.5 text-sm font-semibold text-ink transition hover:brightness-110"
              >
                Start free
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/login"
                className="rounded-full border border-line px-5 py-2.5 text-sm font-medium text-paper transition hover:border-mist"
              >
                Log in
              </Link>
            </div>
          </div>

          <LiveDemo />
        </section>

        <section id="models" className="mt-14 border-t border-line pt-10">
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-mist">Models</p>
              <h2 className="mt-2 font-display text-2xl font-semibold text-paper">
                Built for the whole model universe.
              </h2>
            </div>
            <p className="max-w-sm text-sm leading-relaxed text-mist">
              Start with today&apos;s supported providers and keep room for every model you add next.
            </p>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {MODELS.map((m) => (
              <div key={m.name} className={`rounded-2xl border ${m.border} bg-surface p-5`}>
                <m.icon className={`h-5 w-5 ${m.color}`} />
                <h3 className="mt-4 font-display text-lg font-semibold text-paper">{m.name}</h3>
                <p className={`mt-1 font-mono text-xs ${m.color}`}>{m.tagline}</p>
                <p className="mt-3 text-sm leading-relaxed text-mist">{m.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-2xl border border-line bg-surface p-5">
            <p className="text-sm font-medium text-paper">
              Designed to expand beyond the first providers.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {MODEL_CLOUD.map((model) => (
                <span
                  key={model}
                  className="rounded-full border border-line bg-ink/40 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-mist"
                >
                  {model}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section id="how" className="mt-14 border-t border-line pt-10">
          <p className="font-mono text-xs uppercase tracking-widest text-mist">Workflow</p>
          <h2 className="mt-2 font-display text-2xl font-semibold text-paper">
            Built like a focused tool, not a guessing game.
          </h2>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="rounded-2xl border border-line bg-surface p-5">
                <feature.icon className="h-5 w-5 text-signal" />
                <h3 className="mt-4 font-display text-base font-semibold text-paper">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-mist">{feature.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="pricing" className="mt-14 border-t border-line pt-10">
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-mist">Pricing</p>
              <h2 className="mt-2 font-display text-2xl font-semibold text-paper">
                Plans that match settings.
              </h2>
            </div>
            <Link
              href="/signup"
              className="inline-flex w-fit items-center gap-2 rounded-full border border-line px-4 py-2 text-xs font-medium text-paper transition hover:border-mist"
            >
              View account options
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PLAN_TIERS.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl border p-5 ${
                  plan.highlighted
                    ? "border-signal bg-surface shadow-lg shadow-signal/10"
                    : "border-line bg-surface"
                }`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-lg font-semibold text-paper">{plan.name}</h3>
                  {plan.highlighted && (
                    <span className="rounded-full bg-signal/15 px-2.5 py-0.5 text-[10px] font-medium text-signal">
                      Popular
                    </span>
                  )}
                </div>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="font-display text-2xl font-semibold text-paper">
                    {plan.price}
                  </span>
                  <span className="text-xs text-mist">{plan.period}</span>
                </div>
                <ul className="mt-4 space-y-1.5">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-xs text-mist">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-signal" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/signup"
                  className={`mt-5 block rounded-full px-4 py-2 text-center text-xs font-semibold transition ${
                    plan.highlighted
                      ? "bg-signal text-ink hover:brightness-110"
                      : "border border-line text-paper hover:border-mist"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </section>

        <section id="faq" className="mt-14 border-t border-line py-10">
          <p className="font-mono text-xs uppercase tracking-widest text-mist">FAQ</p>
          <h2 className="mt-2 font-display text-2xl font-semibold text-paper">
            Quick answers.
          </h2>

          <div className="mt-5 divide-y divide-line rounded-2xl border border-line bg-surface px-5">
            {FAQS.map((faq) => (
              <details key={faq.q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium text-paper">
                  {faq.q}
                  <span className="shrink-0 text-mist transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-mist">{faq.a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
