import "./global.css";
import { StarterApp } from "@expense-tracker/ui-native";
import { createMobileApplication } from "./src/application";

const application = createMobileApplication();

export default function App() {
  return <StarterApp application={application} />;
}
