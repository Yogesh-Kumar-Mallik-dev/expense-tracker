import { ExpenseApp } from "@expense-tracker/ui-web";
import { useMemo } from "react";
import { createDesktopApplication } from "./application";

export function App() {
  const application = useMemo(createDesktopApplication, []);
  return (
    <ExpenseApp
      application={application}
      platform="desktop"
    />
  );
}
