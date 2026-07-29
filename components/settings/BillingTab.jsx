"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check, Loader2, Zap, Smartphone, CreditCard, Receipt, ExternalLink } from "lucide-react";
import { useSettings } from "@/lib/SettingsContext";

// Generic feature bullets shown under each plan card. The numbers/labels
// come from the live plan data (credits, discount, badge) — only these
// short descriptive lines are fixed copy.
function featuresFor(tier) {
  if (tier.key === "free") {
    return ["A small monthly allowance to try things out", "Smart model routing"];
  }
  const lines = [`${tier.monthlyCredits.toLocaleString()} credits/month`, "Smart model routing"];
  if (tier.key === "pro") lines.push("Priority routing", "Unlimited history", "PDF export");
  else if (tier.key === "business") lines.push("Highest priority", "Everything in Pro");
  else lines.push("Full conversation history");
  return lines;
}

const REGIONS = [
  { id: "international", label: "International", icon: CreditCard, note: "Card payment via Stripe" },
  { id: "pakistan", label: "Pakistan", icon: Smartphone, note: "JazzCash" },
  { id: "india", label: "India", icon: Smartphone, note: "Razorpay (UPI/cards)" },
];

function loadRazorpayScript() {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve();
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = resolve;
    script.onerror = () => reject(new Error("Couldn't load Razorpay checkout"));
    document.body.appendChild(script);
  });
}

export default function BillingTab() {
  const { settings } = useSettings();
  const searchParams = useSearchParams();
  const justUpgraded = searchParams.get("upgraded") === "1";
  const paymentIssue = searchParams.get("payment");
  const [loadingPlan, setLoadingPlan] = useState(null);
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [error, setError] = useState("");
  const [region, setRegion] = useState("international");
  const [history, setHistory] = useState(null);
  const [nextDueDate, setNextDueDate] = useState(null);
  const [nextDueSource, setNextDueSource] = useState(null);
  const [plans, setPlans] = useState([]);
  const [plansLoading, setPlansLoading] = useState(true);

  useEffect(() => {
    fetch("/api/billing/history")
      .then((res) => res.json())
      .then((data) => {
        setHistory(data.history || []);
        setNextDueDate(data.nextDueDate || null);
        setNextDueSource(data.nextDueSource || null);
      })
      .catch(() => setHistory([]));
  }, []);

  useEffect(() => {
    fetch("/api/plans", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => setPlans(Array.isArray(data.plans) ? data.plans : []))
      .catch(() => setPlans([]))
      .finally(() => setPlansLoading(false));
  }, []);

  const currentPlan = settings.plan || "free";
  const currentTierCredits = plans.find((p) => p.key === currentPlan)?.monthlyCredits || 60;
  const creditsUsedPercent = Math.min(
    100,
    Math.max(0, Math.round((1 - (settings.credits ?? 0) / currentTierCredits) * 100))
  );

  const lastReset = settings.creditsResetAt ? new Date(settings.creditsResetAt) : null;
  const nextResetDate = lastReset
    ? new Date(lastReset.getTime() + 30 * 24 * 60 * 60 * 1000)
    : null;
  const nextResetLabel = nextResetDate
    ? nextResetDate.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })
    : null;
  const nextResetTimeLabel = nextResetDate
    ? nextResetDate.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
    : null;

  async function handleStripeUpgrade(planId) {
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

  async function handleJazzCashUpgrade(planId) {
    setLoadingPlan(planId);
    setError("");
    try {
      const res = await fetch("/api/billing/jazzcash/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't start JazzCash checkout");

      // Auto-submit a real form so JazzCash gets a proper browser POST.
      const form = document.createElement("form");
      form.method = "POST";
      form.action = data.checkoutUrl;
      Object.entries(data.fields).forEach(([key, value]) => {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = key;
        input.value = value;
        form.appendChild(input);
      });
      document.body.appendChild(form);
      form.submit();
    } catch (err) {
      setError(err.message);
      setLoadingPlan(null);
    }
  }

  async function handleRazorpayUpgrade(planId) {
    setLoadingPlan(planId);
    setError("");
    try {
      await loadRazorpayScript();

      const res = await fetch("/api/billing/razorpay/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId }),
      });
      const order = await res.json();
      if (!res.ok) throw new Error(order.error || "Couldn't start Razorpay checkout");

      const rzp = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: "MultiMind",
        description: `${planId.charAt(0).toUpperCase()}${planId.slice(1)} plan — 1 month`,
        order_id: order.orderId,
        prefill: { name: order.name, email: order.email },
        theme: { color: "#3b82f6" },
        handler: async function (response) {
          try {
            const verifyRes = await fetch("/api/billing/razorpay/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(response),
            });
            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) throw new Error(verifyData.error || "Payment verification failed");
            window.location.href = "/dashboard/settings?upgraded=1";
          } catch (err) {
            setError(err.message);
            setLoadingPlan(null);
          }
        },
        modal: {
          ondismiss: function () {
            setLoadingPlan(null);
          },
        },
      });
      rzp.open();
    } catch (err) {
      setError(err.message);
      setLoadingPlan(null);
    }
  }

  function handleUpgrade(planId) {
    if (region === "pakistan") return handleJazzCashUpgrade(planId);
    if (region === "india") return handleRazorpayUpgrade(planId);
    return handleStripeUpgrade(planId);
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

  function priceLabel(tier) {
    const period = tier.key === "free" ? "forever" : "/ month";
    if (region === "pakistan") {
      return {
        amount: `Rs. ${tier.pricePKR.toLocaleString()}`,
        listAmount: tier.discountPercent ? `Rs. ${tier.listPricePKR.toLocaleString()}` : null,
        period,
      };
    }
    if (region === "india") {
      return {
        amount: `₹${tier.priceINR.toLocaleString()}`,
        listAmount: tier.discountPercent ? `₹${tier.listPriceINR.toLocaleString()}` : null,
        period,
      };
    }
    return {
      amount: `$${tier.priceUSD}`,
      listAmount: tier.discountPercent ? `$${tier.listPriceUSD}` : null,
      period,
    };
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
      {paymentIssue && paymentIssue !== "1" && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-400">
          Your payment didn't go through — no charge was made. Please try again.
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

        {settings.planExpiresAt && (
          <p className="mt-2 text-xs text-amber-400">
            This plan was paid via JazzCash/Razorpay and expires on{" "}
            <span className="font-medium">
              {new Date(settings.planExpiresAt).toLocaleDateString(undefined, {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </span>{" "}
            — pay again before then to keep it, or it drops back to Free automatically.
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

      {/* Region / payment method selector */}
      <div>
        <p className="mb-2 text-xs text-mist">Where are you paying from?</p>
        <div className="flex flex-wrap gap-2">
          {REGIONS.map((r) => {
            const Icon = r.icon;
            const active = region === r.id;
            return (
              <button
                key={r.id}
                onClick={() => setRegion(r.id)}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition ${
                  active
                    ? "border-signal bg-signal/10 text-signal"
                    : "border-line text-mist hover:border-mist hover:text-paper"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {r.label}
                <span className="text-mist/60">· {r.note}</span>
              </button>
            );
          })}
        </div>
      </div>

      {plansLoading ? (
        <div className="flex items-center gap-2 py-6 text-sm text-mist">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading plans…
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {plans.map((tier) => {
            const isCurrent = currentPlan === tier.key;
            const price = priceLabel(tier);
            return (
              <div
                key={tier.key}
                className={`relative rounded-2xl border p-5 ${
                  isCurrent ? "border-signal bg-surface shadow-lg shadow-signal/10" : "border-line bg-surface"
                }`}
              >
                {tier.badge && (
                  <span className="absolute -top-2.5 right-4 rounded-full bg-signal px-2 py-0.5 text-[10px] font-semibold text-ink">
                    {tier.badge}
                  </span>
                )}
                <div className="flex items-center justify-between">
                  <p className="font-display text-lg font-semibold text-paper">{tier.label}</p>
                  {isCurrent && (
                    <span className="rounded-full bg-signal/15 px-2.5 py-0.5 text-[10px] font-medium text-signal">
                      Current
                    </span>
                  )}
                </div>
                <div className="mt-1.5 flex items-baseline gap-1.5">
                  <span className="font-display text-2xl font-semibold text-paper">{price.amount}</span>
                  <span className="text-xs text-mist">{price.period}</span>
                  {price.listAmount && (
                    <span className="text-xs text-mist/60 line-through">{price.listAmount}</span>
                  )}
                </div>
                {tier.discountPercent > 0 && (
                  <p className="mt-0.5 text-[11px] font-medium text-signal">{tier.discountPercent}% off</p>
                )}

                <ul className="mt-4 space-y-1.5">
                  {featuresFor(tier).map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs text-mist">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-signal" />
                      {f}
                    </li>
                  ))}
                </ul>

                {tier.key !== "free" && !isCurrent && (
                  <button
                    onClick={() => handleUpgrade(tier.key)}
                    disabled={loadingPlan === tier.key}
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-signal px-4 py-2 text-xs font-semibold text-ink transition hover:brightness-110 disabled:opacity-60"
                  >
                    {loadingPlan === tier.key && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    {loadingPlan === tier.key ? "Redirecting…" : `Upgrade to ${tier.label}`}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {region !== "international" && (
        <p className="text-[11px] text-mist/60">
          {region === "pakistan" ? "JazzCash" : "Razorpay"} payments are one-time — they activate this plan
          for 30 days. You'll need to pay again to renew (auto-renewal isn't available for this payment method yet).
        </p>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}

      {/* Next payment due */}
      {nextDueDate && (
        <div className="rounded-2xl border border-line bg-surface p-5">
          <p className="flex items-center gap-1.5 text-sm text-paper">
            <Zap className="h-3.5 w-3.5 text-signal" />
            Next payment due
          </p>
          <p className="mt-1 font-display text-xl font-semibold text-paper">
            {new Date(nextDueDate).toLocaleDateString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>
          <p className="mt-1 text-xs text-mist">
            {nextDueSource === "stripe"
              ? "Charged automatically to your card on file — no action needed."
              : "This plan doesn't auto-renew — pay again before this date to keep it active."}
          </p>
        </div>
      )}

      {/* Payment history */}
      <div className="rounded-2xl border border-line bg-surface p-5">
        <p className="mb-3 flex items-center gap-1.5 text-sm text-paper">
          <Receipt className="h-3.5 w-3.5 text-signal" />
          Payment history
        </p>

        {history === null && (
          <div className="flex items-center gap-2 py-3 text-sm text-mist">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Loading…
          </div>
        )}

        {history?.length === 0 && (
          <p className="py-2 text-xs text-mist/60">No payments yet — your paid invoices will show up here.</p>
        )}

        {history?.length > 0 && (
          <div className="space-y-1.5">
            {history.map((h, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-3 rounded-lg border border-line/60 bg-surface2 px-3 py-2.5 text-xs"
              >
                <div className="min-w-0">
                  <p className="text-paper">
                    {new Date(h.date).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                    <span className="ml-1.5 text-mist/60">
                      · {h.plan?.charAt(0).toUpperCase() + h.plan?.slice(1)}
                    </span>
                  </p>
                  <p className="mt-0.5 truncate font-mono text-[10px] text-mist/50">
                    {h.gateway === "jazzcash" ? "JazzCash" : h.gateway === "razorpay" ? "Razorpay" : "Stripe"}
                    {" · "}
                    Ref: {h.reference}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="font-medium text-paper">
                    {h.currency === "PKR" ? "Rs. " : h.currency === "INR" ? "₹" : "$"}
                    {h.amount.toLocaleString()}
                  </span>
                  {h.receiptUrl && (
                    <a
                      href={h.receiptUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-mist transition hover:text-signal"
                      title="View receipt"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="mt-3 text-[10px] text-mist/50">
          For your security, we only keep a payment reference number here — never full card or bank
          account numbers. Stripe payments link to an official receipt.
        </p>
      </div>
    </div>
  );
}