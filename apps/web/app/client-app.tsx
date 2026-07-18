"use client";

import { useMemo } from "react";
import {
  ApplicationSessionController,
  DeferredLocalDatabaseLifecycle,
  DisconnectedSyncController,
  RestAuthenticationTransport,
  RestExpenseClient,
  type ExpenseApplication,
} from "@expense-tracker/client-core";
import { ExpenseApp } from "@expense-tracker/ui-web";

const DEVICE_KEY = "expense-tracker.web-device-id";

function createWebApplication(): ExpenseApplication {
  const database = new DeferredLocalDatabaseLifecycle();
  const sync = new DisconnectedSyncController();
  const references: { data?: RestExpenseClient } = {};
  const session = new ApplicationSessionController({
    transport: new RestAuthenticationTransport(
      "/backend",
      "bff",
      async () => localStorage.getItem(DEVICE_KEY),
    ),
    localDatabase: database,
    sync,
    registerDevice: async () => {
      if (localStorage.getItem(DEVICE_KEY)) return;
      if (!references.data) return;
      const device = await references.data.registerDevice(
        navigator.platform || "Web browser",
        "WEB",
      );
      localStorage.setItem(DEVICE_KEY, device.data.id);
    },
  });
  const data = new RestExpenseClient("/backend", session);
  references.data = data;
  return { session, data, sync, localDatabase: database };
}

export function ClientApp({
  initialAuthMode = "login",
}: {
  initialAuthMode?: "login" | "signup";
}) {
  const application = useMemo(createWebApplication, []);
  return (
    <ExpenseApp
      application={application}
      platform="web"
      initialAuthMode={initialAuthMode}
    />
  );
}
