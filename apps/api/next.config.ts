import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: [
    "@expense-tracker/db-main",
    "@expense-tracker/services",
  ],
};

export default nextConfig;
