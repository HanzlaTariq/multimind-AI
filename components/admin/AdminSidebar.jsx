"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  MessagesSquare,
  ArrowLeft,
  ShieldCheck,
  CreditCard,
  Clock,
  History,
  Tag,
} from "lucide-react";
import { useSettings } from "@/lib/SettingsContext";

const NAV = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/conversations", label: "Conversations", icon: MessagesSquare },
  { href: "/admin/plans", label: "Plans & Pricing", icon: Tag },
  { href: "/admin/billing", label: "Billing", icon: CreditCard },
  { href: "/admin/pending-signups", label: "Pending signups", icon: Clock },
  { href: "/admin/activity", label: "Activity log", icon: History },
];

const THEMES = [
  { value: "midnight", label: "Midnight", swatch: "#0B0E14" },
  { value: "light", label: "Light", swatch: "#F8FAFC" },
  { value: "nord", label: "Nord", swatch: "#0B1220" },
  { value: "sepia", label: "Sepia", swatch: "#F5EDE0" },
];

function ThemeSwitcher() {
  const { settings, updateSettings } = useSettings();
  return (
    <div className="flex items-center gap-1.5">
      {THEMES.map((t) => (
        <button
          key={t.value}
          onClick={() => updateSettings({ theme: t.value })}
          title={t.label}
          className={`h-5 w-5 rounded-full border-2 transition ${
            settings.theme === t.value ? "border-signal" : "border-line/60 hover:border-mist"
          }`}
          style={{ backgroundColor: t.swatch }}
        />
      ))}
    </div>
  );
}

export default function AdminSidebar({ user }) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile top bar */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-ink/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-signal" />
          <span className="font-display text-sm font-semibold">Admin</span>
        </div>
        <div className="flex items-center gap-3">
          <ThemeSwitcher />
          <Link
            href="/dashboard"
            className="flex items-center gap-1 text-xs text-mist transition hover:text-paper"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Dashboard
          </Link>
        </div>
      </div>

      {/* Mobile nav row */}
      <nav className="flex gap-1 overflow-x-auto border-b border-line bg-ink px-2 py-2 lg:hidden">
        {NAV.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                active
                  ? "bg-signal/10 text-signal"
                  : "text-mist hover:bg-surface hover:text-paper"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-line bg-surface/40 lg:flex">
        <div className="flex items-center gap-2.5 border-b border-line px-6 py-5">
          <span className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-signal/20 bg-signal/10">
            <ShieldCheck className="h-4 w-4 text-signal" />
          </span>
          <div>
            <p className="font-display text-sm font-semibold leading-none text-paper">
              Admin panel
            </p>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-mist">
              MultiMind
            </p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV.map((item) => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  active
                    ? "border border-signal/20 bg-signal/10 text-signal"
                    : "text-mist hover:bg-surface hover:text-paper"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-line px-4 py-4">
          <div className="mb-3 flex items-center justify-between rounded-lg bg-surface px-3 py-2">
            <span className="text-xs text-mist">Theme</span>
            <ThemeSwitcher />
          </div>
          <div className="mb-3 flex items-center gap-2.5 rounded-lg bg-surface px-3 py-2">
            {user?.image ? (
              <img src={user.image} alt="" className="h-7 w-7 rounded-full object-cover" />
            ) : (
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-signal/20 text-xs font-semibold text-signal">
                {user?.name?.[0]?.toUpperCase() || "A"}
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-paper">{user?.name}</p>
              <p className="truncate text-[11px] text-mist">{user?.email}</p>
            </div>
          </div>
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs text-mist transition hover:bg-surface hover:text-paper"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to dashboard
          </Link>
        </div>
      </aside>
    </>
  );
}