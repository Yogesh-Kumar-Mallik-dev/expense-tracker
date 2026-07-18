"use client";

import { useMemo } from "react";
import {
  ApplicationSessionController,
  OfflineExpenseClient,
  RestAuthenticationTransport,
  RestExpenseClient,
  type ExpenseApplication,
} from "@expense-tracker/client-core";
import { ExpenseApp } from "@expense-tracker/ui-web";
import { WebOfflineRuntime } from "../src/bootstrap/offline";

const DEVICE_KEY = "expense-tracker.web-device-id";

function createWebApplication(): ExpenseApplication {
  const references: {
    remote?: RestExpenseClient;
    session?: ApplicationSessionController;
  } = {};
  const runtime = new WebOfflineRuntime(() => {
    if (!references.session) throw new Error("Session is not initialized");
    return references.session;
  });
  const session = new ApplicationSessionController({
    transport: new RestAuthenticationTransport("/backend", "bff", async () =>
      localStorage.getItem(DEVICE_KEY),
    ),
    localDatabase: runtime,
    sync: runtime,
    registerDevice: async () => {
      if (localStorage.getItem(DEVICE_KEY)) return;
      if (!references.remote) return;
      const device = await references.remote.registerDevice(
        navigator.platform || "Web browser",
        "WEB",
      );
      localStorage.setItem(DEVICE_KEY, device.data.id);
    },
  });
  references.session = session;
  const remote = new RestExpenseClient("/backend", session);
  references.remote = remote;
  runtime.setRemote(remote);
  const data = new OfflineExpenseClient(
    () => runtime.services(),
    () => {
      const state = session.state();
      if (state.status !== "authenticated")
        throw new Error("No authenticated user");
      return state.session.user.id;
    },
    remote,
    {
      upload: async (transactionId, file) => {
        const attachmentId = await runtime
          .attachments()
          .enqueue(transactionId, file);
        const state = session.state();
        return {
          data: {
            id: attachmentId,
            userId:
              state.status === "authenticated" ? state.session.user.id : "",
            transactionId,
            fileName: file.name,
            storageKey: `pending:${attachmentId}`,
            mimeType: file.type || "application/octet-stream",
            sizeBytes: file.size,
            createdAt: new Date().toISOString(),
            deletedAt: null,
          },
        };
      },
    },
  );
  return { session, data, sync: runtime, localDatabase: runtime };
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
      {...(process.env.NEXT_PUBLIC_TELEMETRY_URL
        ? { telemetryEndpoint: process.env.NEXT_PUBLIC_TELEMETRY_URL }
        : {})}
    />
  );
}
