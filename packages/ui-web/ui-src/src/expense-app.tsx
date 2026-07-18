"use client";

import React from "react";
import { useEffect, useMemo, useState } from "react";
import { createClientLogger } from "@expense-tracker/logger/browser";
import type {
  AuthState,
  ExpenseApplication,
} from "@expense-tracker/client-core";
import { AppShell } from "./shell";
import { LoginScreen } from "./screens/login-screen";

export function ExpenseApp({
  application,
  platform = "web",
  initialAuthMode = "login",
}: {
  application: ExpenseApplication;
  platform?: "web" | "desktop";
  initialAuthMode?: "login" | "signup";
}) {
  const [auth, setAuth] = useState<AuthState>(() =>
    application.session.state(),
  );
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
  useEffect(() => {
    const unsubscribe = application.session.subscribe(setAuth);
    void application.session.restore();
    return unsubscribe;
  }, [application]);

  if (auth.status === "restoring")
    return <main className="auth-layout">Restoring your session…</main>;

  if (auth.status === "anonymous")
    return (
      <LoginScreen
        session={application.session}
        initialMode={initialAuthMode}
        onLogin={() => {
          observability.logger.success({
            operation: "authentication",
            message: "Authenticated session established",
            fields: { platform },
          });
        }}
      />
    );

  const logout = async () => {
    try {
      await application.session.logout();
    } finally {
      observability.logger.info({
        operation: "authentication",
        message: "Local authenticated session cleared",
      });
    }
  };

  return (
    <AppShell
      api={application.data}
      session={auth.session}
      platform={platform}
      onUnauthorized={() => void application.session.refresh().catch(() => {})}
      onLogout={logout}
      diagnostics={observability.diagnostics}
    />
  );
}
