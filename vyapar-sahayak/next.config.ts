import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Embed at build time via the env config (Amplify exposes them during build).
  env: {
    BEDROCK_REGION: process.env.BEDROCK_REGION || "us-east-1",
    BEDROCK_TEXT_MODEL: process.env.BEDROCK_TEXT_MODEL || "amazon.nova-lite-v1:0",
    CHAT_USE_BEDROCK: process.env.CHAT_USE_BEDROCK || "true",
  },
  // When EC2_REDIRECT_URL is set (injected by launch-ec2.sh into Amplify env vars),
  // redirect ALL Amplify traffic to the EC2 instance. This keeps the submitted
  // Amplify URL working while serving everything from EC2 (no 29s timeout).
  async redirects() {
    const ec2Url = process.env.EC2_REDIRECT_URL || "";
    if (!ec2Url) return [];
    return [
      {
        source: "/:path*",
        destination: `${ec2Url}/:path*`,
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
