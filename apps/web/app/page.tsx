import { ExpenseApp } from "@expense-tracker/ui-web";

export default function Home() {
  return <ExpenseApp apiBaseUrl="/backend" platform="web" />;
}
