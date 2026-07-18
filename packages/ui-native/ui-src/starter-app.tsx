import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Button,
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import type {
  AuthState,
  ExpenseApplication,
  Transaction,
} from "@expense-tracker/client-core";
import { NativeScreen } from "./native-screen";

export function StarterApp({
  application,
}: {
  application: ExpenseApplication;
}) {
  const [auth, setAuth] = useState<AuthState>(application.session.state());
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  useEffect(() => {
    const unsubscribe = application.session.subscribe(setAuth);
    void application.session.restore();
    return unsubscribe;
  }, [application]);
  useEffect(() => {
    if (auth.status !== "authenticated") return;
    void application.data
      .transactions({ page: 1, pageSize: 50 })
      .then((result) => setTransactions(result.data))
      .catch((error) =>
        setMessage(
          error instanceof Error ? error.message : "Transactions unavailable.",
        ),
      );
  }, [application, auth]);
  return (
    <NativeScreen>
      <StatusBar style="light" />
      {auth.status === "restoring" ? (
        <ActivityIndicator
          accessibilityLabel="Restoring session"
          className="mt-16"
        />
      ) : auth.status === "anonymous" ? (
        <View className="flex-1 justify-center gap-4 px-6">
          <Text
            accessibilityRole="header"
            className="text-3xl font-bold text-white"
          >
            {mode === "login" ? "Sign in" : "Create account"}
          </Text>
          <Text className="text-sage">
            Your refresh credential is stored in the device keychain.
          </Text>
          {mode === "signup" ? (
            <TextInput
              accessibilityLabel="Name"
              autoComplete="name"
              value={name}
              onChangeText={setName}
              placeholder="Name (optional)"
              className="min-h-12 rounded-lg bg-white px-4 text-ink"
            />
          ) : null}
          <TextInput
            accessibilityLabel="Email"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            className="min-h-12 rounded-lg bg-white px-4 text-ink"
          />
          <TextInput
            accessibilityLabel="Password"
            autoComplete="current-password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            className="min-h-12 rounded-lg bg-white px-4 text-ink"
          />
          {mode === "signup" ? (
            <>
              <TextInput
                accessibilityLabel="Confirm password"
                autoComplete="new-password"
                secureTextEntry
                value={passwordConfirmation}
                onChangeText={setPasswordConfirmation}
                className="min-h-12 rounded-lg bg-white px-4 text-ink"
              />
              <TextInput
                accessibilityLabel="Default currency"
                autoCapitalize="characters"
                maxLength={3}
                value={currency}
                onChangeText={setCurrency}
                className="min-h-12 rounded-lg bg-white px-4 text-ink"
              />
            </>
          ) : null}
          <Button
            title={
              pending
                ? mode === "login"
                  ? "Signing in…"
                  : "Creating account…"
                : mode === "login"
                  ? "Sign in"
                  : "Create account"
            }
            disabled={
              pending ||
              !email ||
              !password ||
              (mode === "signup" &&
                (password.length < 12 ||
                  password !== passwordConfirmation ||
                  !/^[A-Za-z]{3}$/.test(currency)))
            }
            onPress={() => {
              setPending(true);
              setMessage("");
              const request =
                mode === "login"
                  ? application.session.login(email, password)
                  : application.session.register({
                      email,
                      password,
                      name: name.trim() || null,
                      currency: currency.toUpperCase(),
                    });
              void request
                .catch((error) =>
                  setMessage(
                    error instanceof Error
                      ? error.message
                      : mode === "login"
                        ? "Sign in failed."
                        : "Account creation failed.",
                  ),
                )
                .finally(() => setPending(false));
            }}
          />
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setMessage("");
              setMode((current) => (current === "login" ? "signup" : "login"));
            }}
            className="min-h-11 items-center justify-center"
          >
            <Text className="font-semibold text-mint">
              {mode === "login"
                ? "Create an account"
                : "Use an existing account"}
            </Text>
          </Pressable>
          {message ? (
            <Text accessibilityRole="alert" className="text-red-300">
              {message}
            </Text>
          ) : null}
        </View>
      ) : (
        <View className="flex-1 px-4 pt-4">
          <View className="mb-4 flex-row items-center justify-between">
            <View>
              <Text className="text-sm text-sage">Transaction register</Text>
              <Text
                accessibilityRole="header"
                className="text-2xl font-bold text-white"
              >
                Transactions
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => void application.session.logout()}
              className="min-h-11 justify-center px-3"
            >
              <Text className="font-semibold text-mint">Sign out</Text>
            </Pressable>
          </View>
          <FlatList
            data={transactions}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={
              <Text className="py-8 text-center text-sage">
                No transactions have been recorded.
              </Text>
            }
            renderItem={({ item }) => (
              <View className="border-b border-slate-700 py-4">
                <View className="flex-row justify-between gap-4">
                  <View className="flex-1">
                    <Text className="font-semibold text-white">
                      {item.description ?? "No description"}
                    </Text>
                    <Text className="text-sm text-sage">
                      {item.occurredAt.slice(0, 10)} ·{" "}
                      {item.type.toLocaleLowerCase()}
                    </Text>
                  </View>
                  <Text className="font-mono text-white">
                    {item.currency} {item.amount}
                  </Text>
                </View>
              </View>
            )}
          />
          {message ? (
            <Text accessibilityRole="alert" className="pb-4 text-red-300">
              {message}
            </Text>
          ) : null}
        </View>
      )}
    </NativeScreen>
  );
}
