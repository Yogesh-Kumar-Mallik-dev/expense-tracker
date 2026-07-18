import { invoke } from "@tauri-apps/api/core";
import {
  ApplicationSessionController,
  OfflineExpenseClient,
  RestAuthenticationTransport,
  RestExpenseClient,
  type ExpenseApplication,
  type SessionCredentialStore,
} from "@expense-tracker/client-core";
import { DesktopOfflineRuntime } from "./offline";

const DEVICE_KEY = "expense-tracker.desktop-device-id";
const DEVELOPMENT_REFRESH_KEY = "expense-tracker.desktop-refresh-token";

function runsInsideTauri() {
  return (
    typeof window !== "undefined" &&
    "__TAURI_INTERNALS__" in (window as unknown as Record<string, unknown>)
  );
}

class DesktopCredentialStore implements SessionCredentialStore {
  read() {
    return runsInsideTauri()
      ? invoke<string | null>("read_refresh_credential")
      : Promise.resolve(localStorage.getItem(DEVELOPMENT_REFRESH_KEY));
  }
  write(refreshToken: string) {
    if (runsInsideTauri())
      return invoke<void>("write_refresh_credential", { value: refreshToken });
    localStorage.setItem(DEVELOPMENT_REFRESH_KEY, refreshToken);
    return Promise.resolve();
  }
  clear() {
    if (runsInsideTauri()) return invoke<void>("clear_refresh_credential");
    localStorage.removeItem(DEVELOPMENT_REFRESH_KEY);
    return Promise.resolve();
  }
}

export function createDesktopApplication(): ExpenseApplication {
  const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3001";
  const references: {
    data?: RestExpenseClient;
    session?: ApplicationSessionController;
  } = {};
  const runtime = new DesktopOfflineRuntime(() => {
    if (!references.session) throw new Error("Session is not initialized");
    return references.session;
  }, apiUrl);
  const authentication = new RestAuthenticationTransport(
    apiUrl,
    "direct",
    async () => localStorage.getItem(DEVICE_KEY),
    () => {
      const state = references.session?.state();
      return state?.status === "authenticated" ? state.session.user : null;
    },
  );
  const session = new ApplicationSessionController({
    transport: authentication,
    credentials: new DesktopCredentialStore(),
    localDatabase: runtime,
    sync: runtime,
    registerDevice: async () => {
      if (localStorage.getItem(DEVICE_KEY)) return;
      if (!references.data) return;
      const device = await references.data.registerDevice(
        navigator.platform || "Desktop",
        "DESKTOP",
      );
      localStorage.setItem(DEVICE_KEY, device.data.id);
    },
  });
  references.session = session;
  const remote = new RestExpenseClient(apiUrl, session);
  references.data = remote;
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
