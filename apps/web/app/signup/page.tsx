import { ExpenseApp } from "@expense-tracker/ui-web";

export default function Signup() {
  return (
    <ExpenseApp
      apiBaseUrl="/backend"
      platform="web"
      initialAuthMode="signup"
    />
  );
}
