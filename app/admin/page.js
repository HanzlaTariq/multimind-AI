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
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";

// Fixed categorical palette for the plan donut — deliberately not tied to
// the site's theme CSS vars, since a chart legend needs distinguishable
// hues regardless of which of the 4 site themes is active.
const PLAN_COLORS = {
  free: "#8B93A3",
  basic: "#38BDF8",
  pro: "#4DE0C0",
  business: "#F59E0B",
};
const RANGE_OPTIONS = [7, 30, 90];

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

function GrowthChart({ title, data, color }) {
  const gradientId = `fill-${title.replace(/\s+/g, "-")}`;
  return (
    <div className="rounded-2xl border border-line bg-surface p-5">
      <h2 className="mb-4 font-display text-sm font-semibold text-paper">{title}</h2>
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.35} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--color-line))" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={(d) => d.slice(5)}
              tick={{ fill: "rgb(var(--color-mist))", fontSize: 11 }}
              axisLine={{ stroke: "rgb(var(--color-line))" }}
              tickLine={false}
              minTickGap={24}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fill: "rgb(var(--color-mist))", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={28}
            />
            <Tooltip
              contentStyle={{
                background: "rgb(var(--color-surface2))",
                border: "1px solid rgb(var(--color-line))",
                borderRadius: 8,
                fontSize: 12,
              }}
              labelStyle={{ color: "rgb(var(--color-mist))" }}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke={color}
              strokeWidth={2}
              fill={`url(#${gradientId})`}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default function AdminOverviewPage() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");
  const [range, setRange] = useState(30);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin/stats?range=${range}`)
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
  }, [range]);

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

  const planData = Object.entries(stats.users.byPlan)
    .filter(([, count]) => count > 0)
    .map(([plan, count]) => ({ name: plan, value: count }));

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-semibold text-paper sm:text-2xl">Overview</h1>
          <p className="mt-1 text-sm text-mist">Snapshot of MultiMind's users and usage.</p>
        </div>
        <div className="flex gap-1 rounded-lg border border-line bg-surface p-1">
          {RANGE_OPTIONS.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                range === r ? "bg-signal/10 text-signal" : "text-mist hover:text-paper"
              }`}
            >
              {r}D
            </button>
          ))}
        </div>
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
        <GrowthChart
          title="New users"
          data={stats.growth.users}
          color="rgb(var(--color-signal))"
        />
        <GrowthChart
          title="New conversations"
          data={stats.growth.conversations}
          color="rgb(var(--color-paper))"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-line bg-surface p-5">
          <h2 className="mb-4 font-display text-sm font-semibold text-paper">Plan breakdown</h2>
          <div className="flex items-center gap-6">
            <div className="h-40 w-40 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={planData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={2}
                  >
                    {planData.map((entry) => (
                      <Cell key={entry.name} fill={PLAN_COLORS[entry.name]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "rgb(var(--color-surface2))",
                      border: "1px solid rgb(var(--color-line))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="flex-1 space-y-2">
              {Object.entries(stats.users.byPlan).map(([plan, count]) => (
                <li key={plan} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 capitalize text-mist">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: PLAN_COLORS[plan] }}
                    />
                    {plan}
                  </span>
                  <span className="font-mono text-paper">{count}</span>
                </li>
              ))}
            </ul>
          </div>
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