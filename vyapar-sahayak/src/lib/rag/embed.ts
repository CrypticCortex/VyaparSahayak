// src/lib/rag/embed.ts
// Vector embedding via Amazon Titan Text Embeddings v2

import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";

const EMBED_MODEL = "amazon.titan-embed-text-v2:0";

const isDemoMode = process.env.CHAT_USE_BEDROCK !== "true";

// Reuse the same client config as bedrock.ts
const clientConfig: ConstructorParameters<typeof BedrockRuntimeClient>[0] = {
  region: process.env.BEDROCK_REGION || process.env.AWS_REGION || "us-east-1",
};

if (process.env.BEDROCK_ACCESS_KEY_ID && process.env.BEDROCK_SECRET_ACCESS_KEY) {
  clientConfig.credentials = {
    accessKeyId: process.env.BEDROCK_ACCESS_KEY_ID,
    secretAccessKey: process.env.BEDROCK_SECRET_ACCESS_KEY,
  };
}

const client = new BedrockRuntimeClient(clientConfig);


// Simple string hash for deterministic mock vectors
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + ch;
    hash = hash & hash; // Convert to 32-bit int
  }
  return Math.abs(hash);
}


// Generate a deterministic 1024-dim mock vector from text hash
function mockEmbedding(text: string): number[] {
  const seed = hashCode(text);
  const vec: number[] = [];
  for (let i = 0; i < 1024; i++) {
    // Seeded pseudo-random using simple linear congruential generator
    const x = Math.sin(seed * (i + 1) * 0.001) * 10000;
    vec.push(x - Math.floor(x));
  }
  // Normalize to unit vector
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
  return vec.map((v) => v / norm);
}


export async function embedText(text: string): Promise<number[]> {
  if (isDemoMode) {
    return mockEmbedding(text);
  }

  const body = JSON.stringify({
    inputText: text,
    dimensions: 1024,
    normalize: true,
  });

  const response = await client.send(
    new InvokeModelCommand({
      modelId: EMBED_MODEL,
      body,
      contentType: "application/json",
      accept: "application/json",
    })
  );

  const decoded = JSON.parse(new TextDecoder().decode(response.body));
  return decoded.embedding as number[];
}


export async function embedTexts(texts: string[]): Promise<number[][]> {
  // Process in batches of 5 concurrent requests
  const results: number[][] = new Array(texts.length);
  const batchSize = 5;

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const embeddings = await Promise.all(batch.map((t) => embedText(t)));
    for (let j = 0; j < embeddings.length; j++) {
      results[i + j] = embeddings[j];
    }
  }

  return results;
}
