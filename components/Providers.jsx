"use client";

import { SessionProvider } from "next-auth/react";
import { SettingsProvider } from "@/lib/SettingsContext";
import GlobalChatWidget from "@/components/GlobalChatWidget";

export default function Providers({ children, session }) {
  return (
    <SessionProvider session={session}>
      <SettingsProvider>
        {children}
        <GlobalChatWidget />
      </SettingsProvider>
    </SessionProvider>
  );
}