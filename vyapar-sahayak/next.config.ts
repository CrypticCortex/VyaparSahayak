import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@libsql/client", "@prisma/adapter-libsql"],
  // Amplify Compute Lambda doesn't receive user-configured env vars at runtime.
  // Embed them at build time via the env config (Amplify exposes them during build).
  env: {
    DATABASE_URL: process.env.DATABASE_URL || "libsql://vyapar-sahayak-crypticcortex.aws-ap-south-1.turso.io",
    TURSO_AUTH_TOKEN: process.env.TURSO_AUTH_TOKEN || "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NzI5MDMyNDEsImlkIjoiMDE5Y2M5NDQtN2YwMS03MGQzLTkxODItMDQ1ZmI0YTNkYzQ0IiwicmlkIjoiYjRiYTA3NDMtZjQ2OC00ZWVkLWE4MWEtZTY2NTA5MjFlMzMyIn0.smYoygH8Bd44zxguTE7T9uwGlzc3pWU2YTEEofg_JIlOycXeTzC9wt-5ETxQzbWfvJyvCN2lZqZHaF-3yNQGDQ",
    BEDROCK_REGION: process.env.BEDROCK_REGION || "us-east-1",
    BEDROCK_TEXT_MODEL: process.env.BEDROCK_TEXT_MODEL || "amazon.nova-lite-v1:0",
    CHAT_USE_BEDROCK: process.env.CHAT_USE_BEDROCK || "true",
    BEDROCK_ACCESS_KEY_ID: process.env.BEDROCK_ACCESS_KEY_ID || "",
    BEDROCK_SECRET_ACCESS_KEY: process.env.BEDROCK_SECRET_ACCESS_KEY || "",
    GOOGLE_CLOUD_API_KEY: process.env.GOOGLE_CLOUD_API_KEY || "",
  },
};

export default nextConfig;
