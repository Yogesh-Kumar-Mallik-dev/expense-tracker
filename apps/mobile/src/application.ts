import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import {
  ApplicationSessionController,
  OfflineExpenseClient,
  RestAuthenticationTransport,
  RestExpenseClient,
  type ExpenseApplication,
  type SessionCredentialStore,
} from "@expense-tracker/client-core";
import { MobileOfflineRuntime } from "./offline";

const REFRESH_KEY = "expense-tracker.refresh-token";
const DEVICE_KEY = "expense-tracker.device-id";

class MobileCredentialStore implements SessionCredentialStore {
  read() {
    return SecureStore.getItemAsync(REFRESH_KEY);
  }
  write(value: string) {
    return SecureStore.setItemAsync(REFRESH_KEY, value, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  }
  clear() {
    return SecureStore.deleteItemAsync(REFRESH_KEY);
  }
}

export function createMobileApplication(): ExpenseApplication {
  const apiUrl =
    process.env.EXPO_PUBLIC_API_URL ??
    (Platform.OS === "android"
      ? "http://10.0.2.2:3001"
      : "http://localhost:3001");
  const references: {
    session?: ApplicationSessionController;
    remote?: RestExpenseClient;
  } = {};
  const runtime = new MobileOfflineRuntime(() => {
    if (!references.session) throw new Error("Session is not initialized");
    return references.session;
  }, apiUrl);
  const authentication = new RestAuthenticationTransport(
    apiUrl,
    "direct",
    () => SecureStore.getItemAsync(DEVICE_KEY),
    () => {
      const state = references.session?.state();
      return state?.status === "authenticated" ? state.session.user : null;
    },
  );
  const session = new ApplicationSessionController({
    transport: authentication,
    credentials: new MobileCredentialStore(),
    localDatabase: runtime,
    sync: runtime,
    registerDevice: async () => {
      if (await SecureStore.getItemAsync(DEVICE_KEY)) return;
      const result = await references.remote?.registerDevice(
        `${Platform.OS} mobile`,
        Platform.OS === "ios" ? "IOS" : "ANDROID",
      );
      if (result)
        await SecureStore.setItemAsync(DEVICE_KEY, result.data.id, {
          keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        });
    },
  });
  references.session = session;
  const remote = new RestExpenseClient(apiUrl, session);
  references.remote = remote;
  const data = new OfflineExpenseClient(
    () => runtime.services(),
    () => {
      const state = session.state();
      if (state.status !== "authenticated")
        throw new Error("No authenticated user");
      return state.session.user.id;
    },
    remote,
  );
  return {
    session,
    data,
    sync: runtime,
    localDatabase: runtime,
  };
}
