"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check, Loader2, Zap } from "lucide-react";
import { useSettings } from "@/lib/SettingsContext";

const PLAN_TIERS = [
  {
    id: "free",
    label: "Free",
    price: "$0",
    period: "forever",
    credits: 60,
    features: ["A small monthly allowance to try things out", "Smart model routing"],
  },
  {
    id: "basic",
    label: "Basic",
    price: "$9.99",
    period: "/ month",
    credits: 1500,
    features: ["1,500 credits/month", "Smart model routing", "Full conversation history"],
  },
  {
    id: "pro",
    label: "Pro",
    price: "$24.99",
    period: "/ month",
    credits: 8000,
    features: ["8,000 credits/month", "Priority routing", "Unlimited history", "PDF export"],
  },
  {
    id: "business",
    label: "Business",
    price: "$59.99",
    period: "/ month",
    credits: 30000,
    features: ["30,000 credits/month", "Highest priority", "Everything in Pro"],
  },
];

export default function BillingTab() {
  const { settings } = useSettings();
  const searchParams = useSearchParams();
  const justUpgraded = searchParams.get("upgraded") === "1";
  const [loadingPlan, setLoadingPlan] = useState(null);
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [error, setError] = useState("");

  const currentPlan = settings.plan || "free";
  const currentTierCredits = PLAN_TIERS.find((p) => p.id === currentPlan)?.credits || 60;
  const creditsUsedPercent = Math.min(
    100,
    Math.max(0, Math.round((1 - (settings.credits ?? 0) / currentTierCredits) * 100))
  );

  const lastReset = settings.creditsResetAt ? new Date(settings.creditsResetAt) : null;
  const nextResetDate = lastReset
    ? new Date(lastReset.getTime() + 30 * 24 * 60 * 60 * 1000)
    : null;
  const nextResetLabel = nextResetDate
    ? nextResetDate.toLocaleDateString(undefined, {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;
  const nextResetTimeLabel = nextResetDate
    ? nextResetDate.toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
      })
    : null;

  async function handleUpgrade(planId) {
    setLoadingPlan(planId);
    setError("");
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't start checkout");
      window.location.href = data.url;
    } catch (err) {
      setError(err.message);
      setLoadingPlan(null);
    }
  }

  async function handleManageBilling() {
    setLoadingPortal(true);
    setError("");
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't open billing portal");
      window.location.href = data.url;
    } catch (err) {
      setError(err.message);
      setLoadingPortal(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="font-display text-lg font-semibold text-paper">Plan &amp; Billing</h2>
        <p className="mt-1 text-sm text-mist">Manage your subscription and credits.</p>
      </div>

      {justUpgraded && (
        <div className="flex items-center gap-2 rounded-lg border border-signal/30 bg-signal/5 px-4 py-3 text-sm text-signal">
          <Check className="h-4 w-4" />
          Your plan is updated — thanks for upgrading!
        </div>
      )}

      <div className="rounded-2xl border border-line bg-surface p-5">
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-1.5 text-paper">
            <Zap className="h-3.5 w-3.5 text-signal" />
            Credits remaining
          </span>
          <span className="font-mono text-paper">
            {settings.credits ?? 0} / {currentTierCredits}
          </span>
        </div>
        <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-surface2">
          <div
            className="h-full rounded-full bg-signal transition-all"
            style={{ width: `${100 - creditsUsedPercent}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-mist">
          Credits refill automatically once a month. Each message uses credits based on which AI model answered it.
        </p>
        {nextResetLabel && (
          <p className="mt-2 text-xs text-mist">
            Next reset: <span className="text-paper">{nextResetLabel} at {nextResetTimeLabel}</span>
          </p>
        )}

        {currentPlan !== "free" && (
          <button
            onClick={handleManageBilling}
            disabled={loadingPortal}
            className="mt-4 flex items-center gap-2 rounded-full border border-line px-4 py-2 text-xs font-medium text-paper transition hover:border-mist disabled:opacity-60"
          >
            {loadingPortal && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {loadingPortal ? "Opening…" : "Manage billing"}
          </button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {PLAN_TIERS.map((tier) => {
          const isCurrent = currentPlan === tier.id;
          return (
            <div
              key={tier.id}
              className={`rounded-2xl border p-5 ${
                isCurrent
                  ? "border-signal bg-surface shadow-lg shadow-signal/10"
                  : "border-line bg-surface"
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="font-display text-lg font-semibold text-paper">{tier.label}</p>
                {isCurrent && (
                  <span className="rounded-full bg-signal/15 px-2.5 py-0.5 text-[10px] font-medium text-signal">
                    Current
                  </span>
                )}
              </div>
              <div className="mt-1.5 flex items-baseline gap-1">
                <span className="font-display text-2xl font-semibold text-paper">{tier.price}</span>
                <span className="text-xs text-mist">{tier.period}</span>
              </div>

              <ul className="mt-4 space-y-1.5">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-mist">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-signal" />
                    {f}
                  </li>
                ))}
              </ul>

              {tier.id !== "free" && !isCurrent && (
                <button
                  onClick={() => handleUpgrade(tier.id)}
                  disabled={loadingPlan === tier.id}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-signal px-4 py-2 text-xs font-semibold text-ink transition hover:brightness-110 disabled:opacity-60"
                >
                  {loadingPlan === tier.id && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {loadingPlan === tier.id ? "Redirecting…" : `Upgrade to ${tier.label}`}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}