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
import { ApiError, type ExpenseApi, type Session } from "../api";

export function LoginScreen({
  api,
  onLogin,
}: {
  api: ExpenseApi;
  onLogin: (session: Session) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError("");
    try {
      onLogin((await api.login(email, password)).data);
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Sign in failed. Try again.",
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
          Sign in to record transactions, review accounts, and manage budgets.
        </p>
      </section>
      <Frame className="auth-frame" spacing="sm">
        <FramePanel>
          <FrameHeader>
            <FrameTitle>Sign in</FrameTitle>
            <FrameDescription>
              Use your existing account credentials.
            </FrameDescription>
          </FrameHeader>
          <form className="form-stack" onSubmit={submit} aria-busy={pending}>
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
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>
            {error ? (
              <Alert variant="destructive" role="alert">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
            <Button type="submit" disabled={pending}>
              {pending ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </FramePanel>
      </Frame>
    </main>
  );
}
