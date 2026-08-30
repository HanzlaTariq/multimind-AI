"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

const DEFAULT_SETTINGS = {
  name: "",
  preferredName: "",
  role: "",
  customInstructions: "",
  chatFont: "sans",
  theme: "midnight",
  reduceMotion: false,
  notifyOnComplete: false,
  plan: "free",
  credits: 60,
  creditsResetAt: null,
  image: "",
};

const SettingsContext = createContext({
  settings: DEFAULT_SETTINGS,
  loading: true,
  refresh: async () => {},
  updateSettings: async () => {},
});

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/user/settings");
      const data = await res.json();
      if (res.ok && data.user) {
        setSettings((prev) => ({ ...prev, ...data.user }));
      }
    } catch (e) {
      // Not signed in yet, or a transient error — keep defaults quietly
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Keep the <html data-theme="..."> attribute and localStorage (used by the
  // no-flash blocking script in layout.js) in sync with the saved theme.
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.setAttribute("data-theme", settings.theme);
    try {
      localStorage.setItem("mm-theme", settings.theme);
    } catch (e) {
      // localStorage may be unavailable (private browsing, etc) — safe to ignore
    }
  }, [settings.theme]);

  // Rapid-fire updates (e.g. tapping through theme/font options quickly) used
  // to fire one PATCH per click. Those requests can resolve out of order, so
  // an older response could land after a newer one and snap the UI back to a
  // stale value — the "poora portal flick karta hai" flicker. To fix that we
  // (a) coalesce every change made within a short window into a single
  // request instead of one-per-click, and (b) never have more than one
  // request in flight at a time, so responses can never arrive out of order.
  const pendingPatchRef = useRef({});
  const resolversRef = useRef([]);
  const inFlightRef = useRef(false);
  const debounceTimerRef = useRef(null);

  const flushPendingSettings = useCallback(async () => {
    if (inFlightRef.current) return; // already sending — will re-flush when it finishes
    if (Object.keys(pendingPatchRef.current).length === 0) return;

    const patch = pendingPatchRef.current;
    const resolvers = resolversRef.current;
    pendingPatchRef.current = {};
    resolversRef.current = [];
    inFlightRef.current = true;

    try {
      const res = await fetch("/api/user/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (res.ok && data.user) {
        setSettings((prev) => ({ ...prev, ...data.user }));
        resolvers.forEach((r) => r.resolve({ ok: true }));
      } else {
        resolvers.forEach((r) => r.resolve({ ok: false, error: data.error }));
      }
    } catch (e) {
      resolvers.forEach((r) => r.resolve({ ok: false, error: "Network error" }));
    } finally {
      inFlightRef.current = false;
      // More changes came in while this request was in flight — send those now.
      if (Object.keys(pendingPatchRef.current).length > 0) {
        flushPendingSettings();
      }
    }
  }, []);

  const updateSettings = useCallback(
    (patch) => {
      setSettings((prev) => ({ ...prev, ...patch })); // optimistic — instant, no network wait
      pendingPatchRef.current = { ...pendingPatchRef.current, ...patch };

      return new Promise((resolve) => {
        resolversRef.current.push({ resolve });
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = setTimeout(() => {
          debounceTimerRef.current = null;
          flushPendingSettings();
        }, 250);
      });
    },
    [flushPendingSettings],
  );

  return (
    <SettingsContext.Provider value={{ settings, loading, refresh, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}