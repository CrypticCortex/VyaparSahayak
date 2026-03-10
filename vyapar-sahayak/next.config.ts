import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@libsql/client", "@prisma/adapter-libsql"],
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
