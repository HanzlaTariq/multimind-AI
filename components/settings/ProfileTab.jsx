"use client";

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { useSettings } from "@/lib/SettingsContext";

const ROLE_OPTIONS = ["Software engineer", "Student", "Designer", "Marketer", "Founder", "Other"];

export default function ProfileTab() {
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