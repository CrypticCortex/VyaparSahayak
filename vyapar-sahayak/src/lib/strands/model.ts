// Strands Agent model configuration

import { BedrockModel } from "@strands-agents/sdk";

export const bedrockModel = new BedrockModel({
  modelId: process.env.BEDROCK_TEXT_MODEL || "us.anthropic.claude-sonnet-4-20250514-v1:0",
  region: process.env.AWS_REGION || "us-east-1",
});
