import { ExpenseApp } from "@expense-tracker/ui-web";

export function App() {
  return (
    <ExpenseApp
      apiBaseUrl={import.meta.env.VITE_API_URL ?? "http://localhost:3001"}
      platform="desktop"
    />
  );
}
