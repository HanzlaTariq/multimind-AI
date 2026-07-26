"use client";

import { useEffect, useState } from "react";
import {
  Users,
  UserPlus,
  ShieldBan,
  ShieldCheck,
  MessagesSquare,
  Layers,
  Zap,
  Loader2,
} from "lucide-react";

const PLAN_COLORS = {
  free: "bg-mist",
  basic: "bg-gemini",
  pro: "bg-signal",
  business: "bg-deepseek",
};

function StatCard({ icon: Icon, label, value, hint }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-5">
      <div className="mb-3 flex items-center justify-between">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-signal/10 text-signal">
          <Icon className="h-4.5 w-4.5" />
        </span>
      </div>
      <p className="font-display text-2xl font-semibold text-paper">{value}</p>
      <p className="mt-1 text-xs text-mist">{label}</p>
      {hint && <p className="mt-2 text-[11px] text-mist/70">{hint}</p>}
    </div>
  );
}

export default function AdminOverviewPage() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/stats")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load stats");
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setStats(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return <p className="text-sm text-red-400">{error}</p>;
  }

  if (!stats) {
    return (
      <div className="flex items-center gap-2 text-mist">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading stats…
      </div>
    );
  }

  const planTotal = Object.values(stats.users.byPlan).reduce((a, b) => a + b, 0) || 1;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-xl font-semibold text-paper sm:text-2xl">Overview</h1>
        <p className="mt-1 text-sm text-mist">Snapshot of MultiMind's users and usage.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={Users} label="Total users" value={stats.users.total} />
        <StatCard
          icon={UserPlus}
          label="New this week"
          value={stats.users.newLast7Days}
          hint={`${stats.users.newLast30Days} in last 30 days`}
        />
        <StatCard icon={ShieldBan} label="Banned users" value={stats.users.banned} />
        <StatCard icon={ShieldCheck} label="Admins" value={stats.users.admins} />
        <StatCard icon={MessagesSquare} label="Conversations" value={stats.conversations.total} />
        <StatCard icon={Layers} label="Total turns" value={stats.conversations.totalTurns} />
        <StatCard
          icon={Zap}
          label="Credits used (est.)"
          value={stats.credits.consumedEstimate.toLocaleString()}
          hint={`of ${stats.credits.monthlyAllowanceTotal.toLocaleString()} allotted`}
        />
        <StatCard
          icon={Zap}
          label="Credits remaining"
          value={stats.credits.remainingTotal.toLocaleString()}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-line bg-surface p-5">
          <h2 className="mb-4 font-display text-sm font-semibold text-paper">Plan breakdown</h2>
          <div className="mb-3 flex h-2.5 w-full overflow-hidden rounded-full bg-surface2">
            {Object.entries(stats.users.byPlan).map(([plan, count]) =>
              count > 0 ? (
                <div
                  key={plan}
                  className={PLAN_COLORS[plan]}
                  style={{ width: `${(count / planTotal) * 100}%` }}
                />
              ) : null
            )}
          </div>
          <ul className="space-y-2">
            {Object.entries(stats.users.byPlan).map(([plan, count]) => (
              <li key={plan} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 capitalize text-mist">
                  <span className={`h-2 w-2 rounded-full ${PLAN_COLORS[plan]}`} />
                  {plan}
                </span>
                <span className="font-mono text-paper">{count}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-5">
          <h2 className="mb-4 font-display text-sm font-semibold text-paper">Most used tools</h2>
          {stats.topTools.length === 0 ? (
            <p className="text-sm text-mist">No tool usage recorded yet.</p>
          ) : (
            <ul className="space-y-2.5">
              {stats.topTools.map((tool) => (
                <li key={tool.toolId} className="flex items-center justify-between text-sm">
                  <span className="text-paper">{tool.label}</span>
                  <span className="font-mono text-xs text-mist">{tool.uses} uses</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}