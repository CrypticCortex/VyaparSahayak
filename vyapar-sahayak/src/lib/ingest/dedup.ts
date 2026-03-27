import { prisma } from "@/lib/db";
import type { DuplicateMatch } from "./types";

// Levenshtein distance between two strings
export function levenshtein(a: string, b: string): number {
  const la = a.length;
  const lb = b.length;

  if (la === 0) return lb;
  if (lb === 0) return la;

  // Use two-row optimization instead of full matrix
  let prev = new Array<number>(lb + 1);
  let curr = new Array<number>(lb + 1);

  for (let j = 0; j <= lb; j++) prev[j] = j;

  for (let i = 1; i <= la; i++) {
    curr[0] = i;
    for (let j = 1; j <= lb; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        curr[j - 1] + 1,       // insertion
        prev[j] + 1,           // deletion
        prev[j - 1] + cost,    // substitution
      );
    }
    [prev, curr] = [curr, prev];
  }

  return prev[lb];
}


// Similarity score 0-1 (1 = identical)
export function similarity(a: string, b: string): number {
  const na = normalize(a);
  const nb = normalize(b);

  if (na === nb) return 1;
  if (na.length === 0 || nb.length === 0) return 0;

  const dist = levenshtein(na, nb);
  const maxLen = Math.max(na.length, nb.length);
  return 1 - dist / maxLen;
}


// Normalize string for comparison
// Lowercase, remove special chars, collapse whitespace
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}


// Find duplicates in DB for incoming product names.
// The entityType param determines which DB table to check against.
// For products, it queries the Product table; for retailers, the Retailer table.
// Can also accept a pre-fetched array of existing products for direct use.
export async function findDuplicates(
  incomingNames: string[],
  entityTypeOrProducts: string | { id: string; name: string; brand: string }[],
): Promise<DuplicateMatch[]> {
  const THRESHOLD = 0.85;

  // Resolve existing records
  let existingProducts: { id: string; name: string; brand: string }[];

  if (Array.isArray(entityTypeOrProducts)) {
    existingProducts = entityTypeOrProducts;
  } else {
    // Fetch from DB based on entity type
    const entityType = entityTypeOrProducts;
    if (entityType === "products" || entityType === "product" || entityType === "mixed") {
      const products = await prisma.product.findMany({
        select: { id: true, name: true, brand: true },
      });
      existingProducts = products;
    } else if (entityType === "retailers" || entityType === "retailer") {
      const retailers = await prisma.retailer.findMany({
        select: { id: true, name: true },
      });
      existingProducts = retailers.map((r) => ({ id: r.id, name: r.name, brand: "" }));
    } else {
      // No dedup for inventory/sales entity types
      return [];
    }
  }

  if (existingProducts.length === 0) return [];

  const matches: DuplicateMatch[] = [];

  for (const incoming of incomingNames) {
    const normalizedIncoming = normalize(incoming);
    if (!normalizedIncoming) continue;

    let bestMatch: DuplicateMatch | null = null;

    for (const existing of existingProducts) {
      // Compare product name alone
      const nameSim = similarity(incoming, existing.name);

      // Also try name + brand combo for better matching
      const combinedExisting = normalize(`${existing.name} ${existing.brand}`);
      const combinedSim = similarity(normalizedIncoming, combinedExisting);

      const score = Math.max(nameSim, combinedSim);

      if (score >= THRESHOLD && (!bestMatch || score > bestMatch.similarity)) {
        bestMatch = {
          incomingName: incoming,
          existingName: existing.name,
          existingId: existing.id,
          similarity: Math.round(score * 100) / 100,
          suggestedAction: score >= 0.95 ? "merge" : "create_new",
        };
      }
    }

    if (bestMatch) {
      matches.push(bestMatch);
    }
  }

  return matches;
}
