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
const DEVICE_USERS_KEY = "expense-tracker.web-device-users";

function deviceKey(userId: string) {
  return `${DEVICE_KEY}.${userId}`;
}

function deviceUsers(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(DEVICE_USERS_KEY) ?? "{}") as Record<
      string,
      string
    >;
  } catch {
    return {};
  }
}

function rememberDeviceUser(email: string, userId: string) {
  localStorage.setItem(
    DEVICE_USERS_KEY,
    JSON.stringify({ ...deviceUsers(), [email.toLowerCase()]: userId }),
  );
}

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
    transport: new RestAuthenticationTransport(
      "/backend",
      "bff",
      async (email) => {
        const userId = deviceUsers()[email];
        return userId ? localStorage.getItem(deviceKey(userId)) : null;
      },
    ),
    localDatabase: runtime,
    sync: runtime,
    registerDevice: async (session) => {
      rememberDeviceUser(session.user.email, session.user.id);
      if (!references.remote) return;
      const key = deviceKey(session.user.id);
      const existingId = localStorage.getItem(key);
      if (existingId) {
        const owned = await references.remote.devices();
        if (owned.data.some((device) => device.id === existingId)) return;
      }
      const device = await references.remote.registerDevice(
        navigator.platform || "Web browser",
        "WEB",
      );
      localStorage.setItem(key, device.data.id);
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
