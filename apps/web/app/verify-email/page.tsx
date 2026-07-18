"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function VerifyEmailPage() {
  const [state, setState] = useState("Confirming your email…");
  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token");
    if (!token) return setState("The verification token is missing.");
    void fetch("/backend/api/auth/confirm-email", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (response) => {
        if (!response.ok) {
          const value = await response.json().catch(() => ({}));
          throw new Error(
            value?.error?.message ?? "Email verification failed.",
          );
        }
        setState("Email updated. Sign in again with your new address.");
      })
      .catch((caught) =>
        setState(
          caught instanceof Error
            ? caught.message
            : "Email verification failed.",
        ),
      );
  }, []);
  return (
    <main className="auth-layout">
      <section className="auth-context">
        <p className="eyebrow">Expense Tracker</p>
        <h1>Email verification</h1>
        <p role="status">{state}</p>
        <Link href="/">Return to sign in</Link>
      </section>
    </main>
  );
}
