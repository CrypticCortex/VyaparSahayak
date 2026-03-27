// src/lib/rag/retrieve.ts
// Similarity search against pgvector using raw SQL

import { prisma } from "@/lib/db";
import { embedText } from "./embed";

export interface RetrievalResult {
  id: string;
  sourceType: string;
  sourceId: string;
  content: string;
  similarity: number;
  metadata: Record<string, unknown> | null;
}


export async function retrieve(
  query: string,
  options?: {
    sourceType?: string;
    topK?: number;
    minSimilarity?: number;
  }
): Promise<RetrievalResult[]> {
  const topK = Math.min(options?.topK ?? 5, 50);
  const minSim = Math.max(0, Math.min(options?.minSimilarity ?? 0.3, 1));

  // 1. Embed the query text
  const queryVector = await embedText(query);
  const vectorStr = `[${queryVector.join(",")}]`;

  // 2. Build and execute the vector similarity query
  // Cosine similarity = 1 - cosine distance (<=>)
  let rows: Array<{
    id: string;
    sourceType: string;
    sourceId: string;
    content: string;
    similarity: number;
    metadata: Record<string, unknown> | null;
  }>;

  if (options?.sourceType) {
    rows = await prisma.$queryRawUnsafe(
      `SELECT id, "sourceType", "sourceId", content, metadata,
              1 - (vector <=> $1::vector) as similarity
       FROM "Embedding"
       WHERE "sourceType" = $2
       ORDER BY vector <=> $1::vector
       LIMIT $3`,
      vectorStr,
      options.sourceType,
      topK
    );
  } else {
    rows = await prisma.$queryRawUnsafe(
      `SELECT id, "sourceType", "sourceId", content, metadata,
              1 - (vector <=> $1::vector) as similarity
       FROM "Embedding"
       ORDER BY vector <=> $1::vector
       LIMIT $2`,
      vectorStr,
      topK
    );
  }

  // 3. Filter by minimum similarity threshold
  return rows
    .filter((r) => r.similarity >= minSim)
    .map((r) => ({
      id: r.id,
      sourceType: r.sourceType,
      sourceId: r.sourceId,
      content: r.content,
      similarity: r.similarity,
      metadata: r.metadata as Record<string, unknown> | null,
    }));
}
