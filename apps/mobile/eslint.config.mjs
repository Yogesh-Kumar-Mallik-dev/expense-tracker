import { config } from "@repo/eslint-config/react-internal";

export default [
  ...config,
  {
    ignores: ["babel.config.js", "metro.config.js", "tailwind.config.js"],
  },
];
