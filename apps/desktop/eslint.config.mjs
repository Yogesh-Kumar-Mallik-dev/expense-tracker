import { config } from "@repo/eslint-config/react-internal";

export default [
  ...config,
  {
    ignores: ["src-tauri/target/**", "src-tauri/gen/**"],
  },
];
