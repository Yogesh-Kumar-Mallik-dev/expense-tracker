import React from "react";
import { useState, type FormEvent } from "react";
import { Alert, AlertDescription } from "#components/ui/alert";
import { Button } from "#components/ui/button";
import { Input } from "#components/ui/input";
import { Label } from "#components/ui/label";
import {
  Frame,
  FrameDescription,
  FrameHeader,
  FramePanel,
  FrameTitle,
} from "#components/reui/frame";
import {
  ApiError,
  type Session,
  type SessionController,
} from "@expense-tracker/client-core";

export function LoginScreen({
  session,
  onLogin,
  initialMode = "login",
}: {
  session: SessionController;
  onLogin: (session: Session) => void;
  initialMode?: "login" | "signup";
}) {
  const [mode, setMode] = useState<"login" | "signup">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (pending) return;
    if (mode === "signup" && password.length < 12) {
      setError("Use at least 12 characters for your password.");
      return;
    }
    if (mode === "signup" && password !== passwordConfirmation) {
      setError("Passwords do not match.");
      return;
    }
    if (mode === "signup" && !/^[A-Za-z]{3}$/.test(currency)) {
      setError("Currency must be a three-letter code such as INR or USD.");
      return;
    }
    setPending(true);
    setError("");
    try {
      const response =
        mode === "login"
          ? await session.login(email, password)
          : await session.register({
              email,
              password,
              name: name.trim() || null,
              currency: currency.toUpperCase(),
            });
      onLogin(response);
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : mode === "login"
            ? "Sign in failed. Try again."
            : "Account creation failed. Try again.",
      );
    } finally {
      setPending(false);
    }
  };

  return (
    <main className="auth-layout">
      <section className="auth-context" aria-labelledby="auth-product-name">
        <p className="eyebrow">Expense Tracker</p>
        <h1 id="auth-product-name">Your accounts and transactions</h1>
        <p>
          {mode === "login"
            ? "Sign in to record transactions, review accounts, and manage budgets."
            : "Create an account to start recording transactions and budgets."}
        </p>
      </section>
      <Frame className="auth-frame" spacing="sm">
        <FramePanel>
          <FrameHeader>
            <FrameTitle>
              {mode === "login" ? "Sign in" : "Create account"}
            </FrameTitle>
            <FrameDescription>
              {mode === "login"
                ? "Use your existing account credentials."
                : "Your default currency is used when creating financial records."}
            </FrameDescription>
          </FrameHeader>
          <form className="form-stack" onSubmit={submit} aria-busy={pending}>
            {mode === "signup" ? (
              <div className="field">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  maxLength={120}
                />
                <small>Optional</small>
              </div>
            ) : null}
            <div className="field">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            <div className="field">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={mode === "signup" ? 12 : 1}
                required
                aria-describedby={
                  mode === "signup" ? "password-description" : undefined
                }
              />
              {mode === "signup" ? (
                <small id="password-description">
                  At least 12 characters.
                </small>
              ) : null}
            </div>
            {mode === "signup" ? (
              <>
                <div className="field">
                  <Label htmlFor="password-confirmation">
                    Confirm password
                  </Label>
                  <Input
                    id="password-confirmation"
                    type="password"
                    autoComplete="new-password"
                    value={passwordConfirmation}
                    onChange={(event) =>
                      setPasswordConfirmation(event.target.value)
                    }
                    required
                  />
                </div>
                <div className="field">
                  <Label htmlFor="currency">Default currency</Label>
                  <Input
                    id="currency"
                    type="text"
                    inputMode="text"
                    autoCapitalize="characters"
                    autoComplete="off"
                    value={currency}
                    onChange={(event) => setCurrency(event.target.value)}
                    minLength={3}
                    maxLength={3}
                    pattern="[A-Za-z]{3}"
                    required
                    aria-describedby="currency-description"
                  />
                  <small id="currency-description">
                    Three-letter ISO code, for example INR, USD, or EUR.
                  </small>
                </div>
              </>
            ) : null}
            {error ? (
              <Alert variant="destructive" role="alert">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
            <Button type="submit" disabled={pending}>
              {pending
                ? mode === "login"
                  ? "Signing in…"
                  : "Creating account…"
                : mode === "login"
                  ? "Sign in"
                  : "Create account"}
            </Button>
            <p className="auth-switch">
              {mode === "login"
                ? "Need an account?"
                : "Already have an account?"}{" "}
              <Button
                type="button"
                variant="link"
                disabled={pending}
                onClick={() => {
                  setMode(mode === "login" ? "signup" : "login");
                  setError("");
                  setPassword("");
                  setPasswordConfirmation("");
                }}
              >
                {mode === "login" ? "Create one" : "Sign in"}
              </Button>
            </p>
          </form>
        </FramePanel>
      </Frame>
    </main>
  );
}
