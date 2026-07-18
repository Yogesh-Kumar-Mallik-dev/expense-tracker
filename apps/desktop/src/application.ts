import { invoke } from "@tauri-apps/api/core";
import {
  ApplicationSessionController,
  DeferredLocalDatabaseLifecycle,
  DisconnectedSyncController,
  RestAuthenticationTransport,
  RestExpenseClient,
  type ExpenseApplication,
  type SessionCredentialStore,
} from "@expense-tracker/client-core";

const DEVICE_KEY = "expense-tracker.desktop-device-id";

class DesktopCredentialStore implements SessionCredentialStore {
  read() {
    return invoke<string | null>("read_refresh_credential");
  }
  write(refreshToken: string) {
    return invoke<void>("write_refresh_credential", { value: refreshToken });
  }
  clear() {
    return invoke<void>("clear_refresh_credential");
  }
}

export function createDesktopApplication(): ExpenseApplication {
  const database = new DeferredLocalDatabaseLifecycle();
  const sync = new DisconnectedSyncController();
  const references: {
    data?: RestExpenseClient;
    session?: ApplicationSessionController;
  } = {};
  const authentication = new RestAuthenticationTransport(
    import.meta.env.VITE_API_URL ?? "http://localhost:3001",
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
    localDatabase: database,
    sync,
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
  const data = new RestExpenseClient(
    import.meta.env.VITE_API_URL ?? "http://localhost:3001",
    session,
  );
  references.data = data;
  return { session, data, sync, localDatabase: database };
}
