// Strands Agent model configuration

import { BedrockModel } from "@strands-agents/sdk";

export const bedrockModel = new BedrockModel({
  modelId: process.env.BEDROCK_TEXT_MODEL || "amazon.nova-lite-v1:0",
  region: process.env.BEDROCK_REGION || process.env.AWS_REGION || "us-east-1",
});
