"use client";

import { useState } from "react";
import { Check, Bell } from "lucide-react";
import { useSettings } from "@/lib/SettingsContext";
import Toggle from "./Toggle";

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

export default function PreferencesTab() {
  const { settings, updateSettings } = useSettings();
  const [notifPermissionDenied, setNotifPermissionDenied] = useState(false);
  const selectedFontClass =
    FONT_OPTIONS.find((f) => f.value === settings.chatFont)?.className || "font-body";

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
        {/* This only affects text inside the chat itself (message bubbles),
            not the rest of the app's UI — so the difference doesn't show up
            elsewhere on this settings page. This preview line makes the
            change visible immediately, in the same font your chat messages
            will actually use. */}
        <p
          className={`mt-3 rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm text-paper ${
            selectedFontClass
          }`}
        >
          The quick brown fox jumps over the lazy dog — this is how your chat messages will look.
        </p>
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