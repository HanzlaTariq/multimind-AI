"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  User as UserIcon,
  SlidersHorizontal,
  CreditCard,
  Check,
  Loader2,
  Bell,
  Zap,
} from "lucide-react";
import { useSettings } from "@/lib/SettingsContext";

const ROLE_OPTIONS = ["Software engineer", "Student", "Designer", "Marketer", "Founder", "Other"];

const FONT_OPTIONS = [
  { value: "sans", label: "Default", className: "font-body" },
  { value: "serif", label: "Serif", className: "font-serif" },
  { value: "mono", label: "Mono", className: "font-mono" },
];

const THEME_OPTIONS = [
  { value: "midnight", label: "Midnight", bg: "#0B0E14", surface: "#171C26", accent: "#4DE0C0" },
  { value: "light", label: "Light", bg: "#F8FAFC", surface: "#FFFFFF", accent: "#0D9488" },
  { value: "nord", label: "Nord", bg: "#0B1220", surface: "#16233B", accent: "#38BDF8" },
  { value: "sepia", label: "Sepia", bg: "#F5EDE0", surface: "#EFE4D2", accent: "#B45309" },
];

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

function Toggle({ checked, onChange, label, description }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div>
        <p className="text-sm text-paper">{label}</p>
        {description && <p className="mt-0.5 text-xs text-mist">{description}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? "bg-signal" : "bg-surface2"
        }`}
        aria-pressed={checked}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-ink transition-transform ${
            checked ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}

function ProfileTab() {
  const { settings, updateSettings } = useSettings();
  const [name, setName] = useState(settings.name || "");
  const [preferredName, setPreferredName] = useState(settings.preferredName || "");
  const [role, setRole] = useState(settings.role || "");
  const [customInstructions, setCustomInstructions] = useState(settings.customInstructions || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    const res = await updateSettings({ name, preferredName, role, customInstructions });
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }

  const initials = (preferredName || name)?.[0]?.toUpperCase() || "U";

  return (
    <div className="max-w-xl space-y-8">
      <div>
        <h2 className="font-display text-lg font-semibold text-paper">Profile</h2>
        <p className="mt-1 text-sm text-mist">This helps MultiMind personalize its answers to you.</p>
      </div>

      <div className="flex items-center gap-4">
        {settings.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={settings.image} alt="" className="h-16 w-16 rounded-full object-cover" />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-gemini/60 via-groq/60 to-deepseek/60 font-display text-xl font-semibold text-paper">
            {initials}
          </div>
        )}
        <div>
          <p className="text-sm text-paper">{settings.name}</p>
          <p className="text-xs text-mist">{settings.email}</p>
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm text-mist">Full name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm text-paper outline-none focus:border-signal"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm text-mist">What should MultiMind call you?</label>
        <input
          value={preferredName}
          onChange={(e) => setPreferredName(e.target.value)}
          placeholder="e.g. Hanzla"
          className="w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm text-paper outline-none placeholder:text-mist/50 focus:border-signal"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm text-mist">What best describes your work?</label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm text-paper outline-none focus:border-signal"
        >
          <option value="">Select one</option>
          {ROLE_OPTIONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1.5 block text-sm text-mist">Instructions for MultiMind</label>
        <p className="mb-2 text-xs text-mist/70">
          MultiMind will keep these in mind across every conversation.
        </p>
        <textarea
          value={customInstructions}
          onChange={(e) => setCustomInstructions(e.target.value)}
          rows={4}
          maxLength={2000}
          placeholder="e.g. when learning new concepts, I find analogies particularly helpful. Ask clarifying questions before giving detailed answers."
          className="w-full resize-none rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm text-paper outline-none placeholder:text-mist/50 focus:border-signal"
        />
        <p className="mt-1 text-right text-xs text-mist/50">{customInstructions.length}/2000</p>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-2 rounded-full bg-signal px-5 py-2.5 text-sm font-semibold text-ink transition hover:brightness-110 disabled:opacity-60"
      >
        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
        {saved && <Check className="h-4 w-4" />}
        {saving ? "Saving…" : saved ? "Saved" : "Save changes"}
      </button>
    </div>
  );
}

function PreferencesTab() {
  const { settings, updateSettings } = useSettings();
  const [notifPermissionDenied, setNotifPermissionDenied] = useState(false);

  async function handleNotifyToggle(value) {
    if (value && typeof Notification !== "undefined") {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setNotifPermissionDenied(true);
        return;
      }
    }
    setNotifPermissionDenied(false);
    updateSettings({ notifyOnComplete: value });
  }

  return (
    <div className="max-w-xl space-y-8">
      <div>
        <h2 className="font-display text-lg font-semibold text-paper">Preferences</h2>
        <p className="mt-1 text-sm text-mist">Control how MultiMind looks and behaves for you.</p>
      </div>

      <div>
        <p className="mb-2 text-sm text-paper">Theme</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {THEME_OPTIONS.map((t) => (
            <button
              key={t.value}
              onClick={() => updateSettings({ theme: t.value })}
              className={`overflow-hidden rounded-xl border-2 transition ${
                settings.theme === t.value ? "border-signal" : "border-line hover:border-mist/40"
              }`}
            >
              <div className="flex h-14 items-end gap-1 p-2" style={{ backgroundColor: t.bg }}>
                <span className="h-6 w-6 rounded-md" style={{ backgroundColor: t.surface }} />
                <span className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: t.accent }} />
              </div>
              <div className="flex items-center justify-between border-t border-line bg-surface px-2.5 py-1.5">
                <span className="text-xs text-paper">{t.label}</span>
                {settings.theme === t.value && <Check className="h-3.5 w-3.5 text-signal" />}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm text-paper">Chat font</p>
        <div className="flex gap-2">
          {FONT_OPTIONS.map((f) => (
            <button
              key={f.value}
              onClick={() => updateSettings({ chatFont: f.value })}
              className={`rounded-full border px-4 py-2 text-sm transition ${f.className} ${
                settings.chatFont === f.value
                  ? "border-signal bg-signal/10 text-signal"
                  : "border-line text-mist hover:text-paper"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="divide-y divide-line">
        <Toggle
          checked={!!settings.reduceMotion}
          onChange={(v) => updateSettings({ reduceMotion: v })}
          label="Reduce motion"
          description="Turns off the typewriter effect and other interface animations."
        />
        <Toggle
          checked={!!settings.notifyOnComplete}
          onChange={handleNotifyToggle}
          label="Response completions"
          description="Get notified when MultiMind has finished a response — useful for longer tasks."
        />
      </div>

      {notifPermissionDenied && (
        <p className="flex items-center gap-1.5 text-xs text-red-400">
          <Bell className="h-3.5 w-3.5" />
          Notifications are blocked in your browser — enable them in your browser's site settings to
          use this.
        </p>
      )}
    </div>
  );
}

function BillingTab() {
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

const TABS = [
  { id: "profile", label: "Profile", icon: UserIcon },
  { id: "preferences", label: "Preferences", icon: SlidersHorizontal },
  { id: "billing", label: "Plan & Billing", icon: CreditCard },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("profile");

  return (
    <div className="min-h-screen bg-ink">
      <header className="flex items-center gap-3 border-b border-line px-4 py-4 sm:px-8">
        <Link href="/dashboard" className="text-mist transition hover:text-paper" aria-label="Back">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <span className="font-display text-sm font-semibold text-paper">Settings</span>
      </header>

      <div className="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-10 sm:flex-row sm:px-8">
        <nav className="flex shrink-0 gap-1 overflow-x-auto sm:w-48 sm:flex-col">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2.5 text-left text-sm transition ${
                activeTab === t.id
                  ? "bg-surface text-paper"
                  : "text-mist hover:bg-surface/60 hover:text-paper"
              }`}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
            </button>
          ))}
        </nav>

        <div className="flex-1">
          {activeTab === "profile" && <ProfileTab />}
          {activeTab === "preferences" && <PreferencesTab />}
          {activeTab === "billing" && <BillingTab />}
        </div>
      </div>
    </div>
  );
}