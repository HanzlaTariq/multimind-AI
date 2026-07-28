"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, Plus, Trash2, Save, Tag } from "lucide-react";

const emptyDraft = {
  key: "",
  label: "",
  monthlyCredits: 1000,
  priceUSD: 0,
  pricePKR: 0,
  priceINR: 0,
  discountPercent: 0,
  badge: "",
  active: true,
};

function money(n) {
  return (Number(n) || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function PlanRow({ plan, onSave, onDelete }) {
  const [form, setForm] = useState({
    label: plan.label,
    monthlyCredits: plan.monthlyCredits,
    priceUSD: plan.priceUSD,
    pricePKR: plan.pricePKR,
    priceINR: plan.priceINR,
    discountPercent: plan.discountPercent || 0,
    badge: plan.badge || "",
    active: plan.active,
  });
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const set = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
    setDirty(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      await onSave(plan._id, form);
      setDirty(false);
    } finally {
      setSaving(false);
    }
  };

  const discounted = (price) =>
    form.discountPercent ? Math.round(price * (1 - form.discountPercent / 100) * 100) / 100 : price;

  return (
    <div className="rounded-2xl border border-line bg-surface p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-signal/10 px-2 py-0.5 font-mono text-xs text-signal">
            {plan.key}
          </span>
          {plan.isCore && (
            <span className="rounded-md bg-surface2 px-2 py-0.5 text-[11px] text-mist">
              built-in
            </span>
          )}
          <label className="ml-2 flex items-center gap-1.5 text-xs text-mist">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => set("active", e.target.checked)}
            />
            Active
          </label>
        </div>
        <div className="flex items-center gap-2">
          {dirty && (
            <button
              onClick={save}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-lg bg-signal px-3 py-1.5 text-xs font-medium text-ink hover:opacity-90 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Save
            </button>
          )}
          {!plan.isCore && (
            <button
              onClick={() => onDelete(plan._id)}
              className="flex items-center gap-1.5 rounded-lg border border-red-500/30 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <div className="lg:col-span-2">
          <label className="mb-1 block text-[11px] text-mist">Label</label>
          <input
            className="w-full rounded-lg border border-line bg-surface2 px-2.5 py-1.5 text-sm text-paper"
            value={form.label}
            onChange={(e) => set("label", e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] text-mist">Monthly credits</label>
          <input
            type="number"
            min="0"
            className="w-full rounded-lg border border-line bg-surface2 px-2.5 py-1.5 text-sm text-paper"
            value={form.monthlyCredits}
            onChange={(e) => set("monthlyCredits", Number(e.target.value))}
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] text-mist">Price USD</label>
          <input
            type="number"
            min="0"
            step="0.01"
            className="w-full rounded-lg border border-line bg-surface2 px-2.5 py-1.5 text-sm text-paper"
            value={form.priceUSD}
            onChange={(e) => set("priceUSD", Number(e.target.value))}
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] text-mist">Price PKR</label>
          <input
            type="number"
            min="0"
            className="w-full rounded-lg border border-line bg-surface2 px-2.5 py-1.5 text-sm text-paper"
            value={form.pricePKR}
            onChange={(e) => set("pricePKR", Number(e.target.value))}
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] text-mist">Price INR</label>
          <input
            type="number"
            min="0"
            className="w-full rounded-lg border border-line bg-surface2 px-2.5 py-1.5 text-sm text-paper"
            value={form.priceINR}
            onChange={(e) => set("priceINR", Number(e.target.value))}
          />
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <div>
          <label className="mb-1 flex items-center gap-1 text-[11px] text-mist">
            <Tag className="h-3 w-3" /> Discount %
          </label>
          <input
            type="number"
            min="0"
            max="100"
            className="w-full rounded-lg border border-line bg-surface2 px-2.5 py-1.5 text-sm text-paper"
            value={form.discountPercent}
            onChange={(e) => set("discountPercent", Number(e.target.value))}
          />
        </div>
        <div className="lg:col-span-2">
          <label className="mb-1 block text-[11px] text-mist">Badge (optional)</label>
          <input
            placeholder="e.g. Limited time"
            className="w-full rounded-lg border border-line bg-surface2 px-2.5 py-1.5 text-sm text-paper"
            value={form.badge}
            onChange={(e) => set("badge", e.target.value)}
          />
        </div>
        <div className="flex items-end lg:col-span-3">
          {form.discountPercent > 0 ? (
            <p className="text-xs text-mist">
              Users pay{" "}
              <span className="font-medium text-signal">
                ${money(discounted(form.priceUSD))} / Rs.{money(discounted(form.pricePKR))} / ₹
                {money(discounted(form.priceINR))}
              </span>{" "}
              <span className="line-through opacity-60">${money(form.priceUSD)}</span> ({form.discountPercent}% off)
            </p>
          ) : (
            <p className="text-xs text-mist">No discount applied</p>
          )}
        </div>
      </div>
    </div>
  );
}

function NewPlanForm({ onCreate }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (field, value) => setDraft((d) => ({ ...d, [field]: value }));

  const submit = async () => {
    setError("");
    if (!draft.key.trim() || !draft.label.trim()) {
      setError("Key and label are required");
      return;
    }
    setSaving(true);
    try {
      await onCreate(draft);
      setDraft(emptyDraft);
      setOpen(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-line py-4 text-sm text-mist hover:border-signal/40 hover:text-signal"
      >
        <Plus className="h-4 w-4" />
        Add a new plan or deal (e.g. "60% off Pro" for a limited time)
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-signal/30 bg-surface p-5">
      <h3 className="mb-3 font-display text-sm font-semibold text-paper">New plan / deal</h3>
      {error && <p className="mb-2 text-xs text-red-400">{error}</p>}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="mb-1 block text-[11px] text-mist">Key (slug, no spaces)</label>
          <input
            placeholder="e.g. summer60"
            className="w-full rounded-lg border border-line bg-surface2 px-2.5 py-1.5 text-sm text-paper"
            value={draft.key}
            onChange={(e) => set("key", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] text-mist">Label shown to users</label>
          <input
            placeholder="e.g. Summer Sale — Pro"
            className="w-full rounded-lg border border-line bg-surface2 px-2.5 py-1.5 text-sm text-paper"
            value={draft.label}
            onChange={(e) => set("label", e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] text-mist">Monthly credits</label>
          <input
            type="number"
            min="0"
            className="w-full rounded-lg border border-line bg-surface2 px-2.5 py-1.5 text-sm text-paper"
            value={draft.monthlyCredits}
            onChange={(e) => set("monthlyCredits", Number(e.target.value))}
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] text-mist">Discount %</label>
          <input
            type="number"
            min="0"
            max="100"
            className="w-full rounded-lg border border-line bg-surface2 px-2.5 py-1.5 text-sm text-paper"
            value={draft.discountPercent}
            onChange={(e) => set("discountPercent", Number(e.target.value))}
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] text-mist">List price USD</label>
          <input
            type="number"
            min="0"
            step="0.01"
            className="w-full rounded-lg border border-line bg-surface2 px-2.5 py-1.5 text-sm text-paper"
            value={draft.priceUSD}
            onChange={(e) => set("priceUSD", Number(e.target.value))}
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] text-mist">List price PKR</label>
          <input
            type="number"
            min="0"
            className="w-full rounded-lg border border-line bg-surface2 px-2.5 py-1.5 text-sm text-paper"
            value={draft.pricePKR}
            onChange={(e) => set("pricePKR", Number(e.target.value))}
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] text-mist">List price INR</label>
          <input
            type="number"
            min="0"
            className="w-full rounded-lg border border-line bg-surface2 px-2.5 py-1.5 text-sm text-paper"
            value={draft.priceINR}
            onChange={(e) => set("priceINR", Number(e.target.value))}
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] text-mist">Badge (optional)</label>
          <input
            placeholder="e.g. Limited time"
            className="w-full rounded-lg border border-line bg-surface2 px-2.5 py-1.5 text-sm text-paper"
            value={draft.badge}
            onChange={(e) => set("badge", e.target.value)}
          />
        </div>
      </div>
      <p className="mt-2 text-[11px] text-mist">
        This deal buys through JazzCash/Razorpay right away. To also sell it via Stripe, add a
        Stripe recurring price and set its env var name after creating the plan.
      </p>
      <div className="mt-4 flex gap-2">
        <button
          onClick={submit}
          disabled={saving}
          className="flex items-center gap-1.5 rounded-lg bg-signal px-3 py-1.5 text-xs font-medium text-ink hover:opacity-90 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          Create plan
        </button>
        <button
          onClick={() => {
            setOpen(false);
            setError("");
          }}
          className="rounded-lg border border-line px-3 py-1.5 text-xs text-mist hover:bg-surface2"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function AdminPlansPage() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/plans");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load plans");
      setPlans(data.plans);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const savePlan = async (id, form) => {
    const res = await fetch(`/api/admin/plans/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Save failed");
    setPlans((prev) => prev.map((p) => (p._id === id ? data.plan : p)));
  };

  const createPlan = async (draft) => {
    const res = await fetch("/api/admin/plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Create failed");
    setPlans((prev) => [...prev, data.plan]);
  };

  const deletePlan = async (id) => {
    if (!confirm("Delete this plan? Users currently on it will keep their credits until their next reset.")) return;
    const res = await fetch(`/api/admin/plans/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "Delete failed");
      return;
    }
    setPlans((prev) => prev.filter((p) => p._id !== id));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-semibold text-paper sm:text-2xl">
          Plans &amp; Pricing
        </h1>
        <p className="mt-1 text-sm text-mist">
          Edit credits and pricing on any plan, or add a new limited-time deal (e.g. 60% off).
          Changes apply everywhere within about 30 seconds.
        </p>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {loading ? (
        <div className="flex items-center gap-2 text-mist">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading…
        </div>
      ) : (
        <div className="space-y-4">
          {plans.map((plan) => (
            <PlanRow key={plan._id} plan={plan} onSave={savePlan} onDelete={deletePlan} />
          ))}
        </div>
      )}

      <NewPlanForm onCreate={createPlan} />
    </div>
  );
}