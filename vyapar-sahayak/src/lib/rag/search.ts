// src/lib/rag/search.ts
// Thin wrapper around retrieve.ts for the knowledge base tool

import { retrieve, type RetrievalResult } from "./retrieve";

export async function searchKnowledgeBase(
  query: string,
  topK: number = 5
): Promise<Array<{ content: string; sourceType: string; similarity: number }>> {
  const results: RetrievalResult[] = await retrieve(query, { topK, minSimilarity: 0.3 });
  return results.map((r) => ({
    content: r.content,
    sourceType: r.sourceType,
    similarity: Math.round(r.similarity * 100) / 100,
  }));
}
