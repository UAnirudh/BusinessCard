import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@electric-sql/pglite", "pg"],
  allowedDevOrigins: ["pv-f9d08c8b0cfb-72442d03-53cd-4ac0-8c70-a0f260e5f115.style.dev"],
  experimental: {
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;
