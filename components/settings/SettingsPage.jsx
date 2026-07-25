"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, User as UserIcon, SlidersHorizontal, CreditCard } from "lucide-react";
import ProfileTab from "./ProfileTab";
import PreferencesTab from "./PreferencesTab";
import BillingTab from "./BillingTab";

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