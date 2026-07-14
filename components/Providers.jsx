"use client";

import { SessionProvider } from "next-auth/react";
import { SettingsProvider } from "@/lib/SettingsContext";

export default function Providers({ children, session }) {
  return (
    <SessionProvider session={session}>
      <SettingsProvider>{children}</SettingsProvider>
    </SessionProvider>
  );
}