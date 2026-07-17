import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@expense-tracker/db-offline",
    "@expense-tracker/logger",
    "@expense-tracker/services",
    "@expense-tracker/ui-web",
  ],
};

export default nextConfig;
