"use client";

import React from "react";
import { useMemo, useState } from "react";
import { createClientLogger } from "@expense-tracker/logger/browser";
import { ExpenseApi, type Session } from "./api";
import { AppShell } from "./shell";
import { LoginScreen } from "./screens/login-screen";

export function ExpenseApp({
  apiBaseUrl = "http://localhost:3001",
  platform = "web",
  initialAuthMode = "login",
}: {
  apiBaseUrl?: string;
  platform?: "web" | "desktop";
  initialAuthMode?: "login" | "signup";
}) {
  const [session, setSession] = useState<Session | null>(null);
  const observability = useMemo(
    () =>
      createClientLogger({
        service: `expense-tracker-${platform}`,
        environment: "client",
        runtime: platform === "desktop" ? "desktop" : "browser",
        level: "INFO",
      }),
    [platform],
  );
  const api = useMemo(
    () => new ExpenseApi(apiBaseUrl, () => session?.tokens.accessToken ?? null),
    [apiBaseUrl, session],
  );

  if (!session)
    return (
      <LoginScreen
        api={api}
        initialMode={initialAuthMode}
        onLogin={(nextSession) => {
          observability.logger.success({
            operation: "authentication",
            message: "Authenticated session established",
            fields: { platform },
          });
          setSession(nextSession);
        }}
      />
    );

  const logout = async () => {
    try {
      await api.logout(session.tokens.refreshToken);
    } finally {
      observability.logger.info({
        operation: "authentication",
        message: "Local authenticated session cleared",
      });
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
      diagnostics={observability.diagnostics}
    />
  );
}
