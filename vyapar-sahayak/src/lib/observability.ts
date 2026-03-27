// src/lib/observability.ts
// Langfuse cloud observability -- all calls are no-ops when keys are not set.

import { Langfuse } from "langfuse";

const langfuse = process.env.LANGFUSE_PUBLIC_KEY
  ? new Langfuse({
      publicKey: process.env.LANGFUSE_PUBLIC_KEY,
      secretKey: process.env.LANGFUSE_SECRET_KEY!,
      baseUrl: process.env.LANGFUSE_HOST || "https://cloud.langfuse.com",
    })
  : null;

export function createTrace(name: string, metadata?: Record<string, unknown>) {
  if (!langfuse) return null;
  return langfuse.trace({ name, metadata });
}

export function createGeneration(
  trace: ReturnType<typeof createTrace>,
  options: {
    name: string;
    model: string;
    input: string;
    output?: string;
    startTime: Date;
    endTime?: Date;
    usage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number };
    metadata?: Record<string, unknown>;
  }
) {
  if (!trace) return null;
  return trace.generation({
    name: options.name,
    model: options.model,
    input: options.input,
    output: options.output,
    startTime: options.startTime,
    endTime: options.endTime || new Date(),
    usage: options.usage,
    metadata: options.metadata,
  });
}

export async function flushLangfuse() {
  if (langfuse) await langfuse.flushAsync();
}
