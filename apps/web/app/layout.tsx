import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@expense-tracker/ui-web/styles.css";

export const metadata: Metadata = {
  title: "Expense Tracker",
  description: "Offline-first personal finance across every device.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
