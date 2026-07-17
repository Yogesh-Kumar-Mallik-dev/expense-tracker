import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/backend/:path*",
        destination: "http://localhost:3001/:path*",
      },
    ];
  },
  transpilePackages: [
    "@expense-tracker/db-offline",
    "@expense-tracker/logger",
    "@expense-tracker/services",
    "@expense-tracker/ui-web",
  ],
};

export default nextConfig;
