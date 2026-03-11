import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@libsql/client", "@prisma/adapter-libsql"],
  // Amplify Compute Lambda doesn't receive user-configured env vars at runtime.
  // Embed them at build time via the env config (Amplify exposes them during build).
  env: {
    DATABASE_URL: process.env.DATABASE_URL || "REDACTED_TURSO_URL",
    TURSO_AUTH_TOKEN: process.env.TURSO_AUTH_TOKEN || "REDACTED_TURSO_TOKEN",
    BEDROCK_REGION: process.env.BEDROCK_REGION || "us-east-1",
    BEDROCK_TEXT_MODEL: process.env.BEDROCK_TEXT_MODEL || "amazon.nova-lite-v1:0",
    CHAT_USE_BEDROCK: process.env.CHAT_USE_BEDROCK || "true",
  },
};

export default nextConfig;
