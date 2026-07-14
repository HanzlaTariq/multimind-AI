"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

const DEFAULT_SETTINGS = {
  name: "",
  preferredName: "",
  role: "",
  customInstructions: "",
  chatFont: "sans",
  reduceMotion: false,
  notifyOnComplete: false,
  plan: "free",
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

  const updateSettings = useCallback(async (patch) => {
    setSettings((prev) => ({ ...prev, ...patch })); // optimistic
    try {
      const res = await fetch("/api/user/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (res.ok && data.user) {
        setSettings((prev) => ({ ...prev, ...data.user }));
        return { ok: true };
      }
      return { ok: false, error: data.error };
    } catch (e) {
      return { ok: false, error: "Network error" };
    }
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, loading, refresh, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}