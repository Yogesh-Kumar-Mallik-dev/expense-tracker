"use client";

import React from "react";
import { useMemo, useState } from "react";
import { ExpenseApi, type Session } from "./api";
import { AppShell } from "./shell";
import { LoginScreen } from "./screens/login-screen";

export function ExpenseApp({
  apiBaseUrl = "http://localhost:3001",
  platform = "web",
}: {
  apiBaseUrl?: string;
  platform?: "web" | "desktop";
}) {
  const [session, setSession] = useState<Session | null>(null);
  const api = useMemo(
    () => new ExpenseApi(apiBaseUrl, () => session?.tokens.accessToken ?? null),
    [apiBaseUrl, session],
  );

  if (!session) return <LoginScreen api={api} onLogin={setSession} />;

  const logout = async () => {
    try {
      await api.logout(session.tokens.refreshToken);
    } finally {
      setSession(null);
    }
  };

  return (
    <AppShell
      api={api}
      session={session}
      platform={platform}
      onUnauthorized={() => setSession(null)}
      onLogout={logout}
    />
  );
}
