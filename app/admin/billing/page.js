"use client";

import { useEffect, useState } from "react";
import { Loader2, TrendingUp, Users, Hourglass } from "lucide-react";

function StatCard({ icon: Icon, label, value, hint }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-5">
      <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-signal/10 text-signal">
        <Icon className="h-4.5 w-4.5" />
      </span>
      <p className="font-display text-2xl font-semibold text-paper">{value}</p>
      <p className="mt-1 text-xs text-mist">{label}</p>
      {hint && <p className="mt-2 text-[11px] text-mist/70">{hint}</p>}
    </div>
  );
}

export default function AdminBillingPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/billing")
      .then((res) => res.json())
      .then((d) => {
        if (cancelled) return;
        if (d.error) setError(d.error);
        setData(d);
      })
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-xl font-semibold text-paper sm:text-2xl">Billing</h1>
        <p className="mt-1 text-sm text-mist">Live revenue data pulled from Stripe.</p>
      </div>

      {!data && !error && (
        <div className="flex items-center gap-2 text-mist">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading…
        </div>
      )}

      {data && !data.configured && (
        <p className="rounded-xl border border-line bg-surface px-4 py-3 text-sm text-mist">
          Stripe isn't configured on this server yet — add{" "}
          <code className="rounded bg-surface2 px-1 py-0.5 text-xs">STRIPE_SECRET_KEY</code> to
          your environment to see live billing data here.
        </p>
      )}

      {error && data?.configured === true && (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </p>
      )}

      {data?.configured && !data.error && (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              icon={TrendingUp}
              label="Monthly recurring revenue"
              value={`$${data.mrr.toLocaleString()}`}
            />
            <StatCard icon={Users} label="Active subscriptions" value={data.activeCount} />
            <StatCard icon={Hourglass} label="In trial" value={data.trialingCount} />
          </div>

          <div className="rounded-2xl border border-line bg-surface p-5">
            <h2 className="mb-4 font-display text-sm font-semibold text-paper">
              Active subscriptions by plan
            </h2>
            <ul className="space-y-2">
              {Object.entries(data.byPlan)
                .filter(([, count]) => count > 0)
                .map(([plan, count]) => (
                  <li key={plan} className="flex items-center justify-between text-sm">
                    <span className="capitalize text-mist">{plan}</span>
                    <span className="font-mono text-paper">{count}</span>
                  </li>
                ))}
            </ul>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs uppercase tracking-wide text-mist">
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Plan</th>
                  <th className="px-4 py-3 font-medium">Monthly</th>
                  <th className="px-4 py-3 font-medium">Renews</th>
                </tr>
              </thead>
              <tbody>
                {data.subscriptions.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-mist">
                      No active subscriptions.
                    </td>
                  </tr>
                ) : (
                  data.subscriptions.map((s) => (
                    <tr key={s.id} className="border-b border-line/60 last:border-0">
                      <td className="px-4 py-3">
                        <p className="font-medium text-paper">{s.customerName || "—"}</p>
                        <p className="text-xs text-mist">{s.customerEmail}</p>
                      </td>
                      <td className="px-4 py-3 capitalize text-mist">{s.plan}</td>
                      <td className="px-4 py-3 font-mono text-xs text-paper">
                        ${s.monthlyAmount}
                      </td>
                      <td className="px-4 py-3 text-xs text-mist">
                        {s.currentPeriodEnd
                          ? new Date(s.currentPeriodEnd).toLocaleDateString()
                          : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}