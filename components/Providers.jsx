"use client";

import { SessionProvider } from "next-auth/react";
import { SettingsProvider } from "@/lib/SettingsContext";
import NotificationBell from "@/components/NotificationBell";

export default function Providers({ children, session }) {
  return (
    <SessionProvider session={session}>
      <SettingsProvider>
        <NotificationBell />
        {children}
      </SettingsProvider>
    </SessionProvider>
  );
}