// src/lib/rag/ingest.ts
// Bulk embed products, knowledge, and campaign results into pgvector

import { prisma } from "@/lib/db";
import { embedTexts } from "./embed";
import { FMCG_KNOWLEDGE } from "./knowledge";


// Helper: delete existing rows by sourceType+sourceId, then insert with vector
async function upsertEmbeddings(
  items: Array<{
    sourceType: string;
    sourceId: string;
    content: string;
    metadata?: Record<string, unknown>;
  }>,
  vectors: number[][]
): Promise<number> {
  let count = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const vectorStr = `[${vectors[i].join(",")}]`;
    const metadataJson = item.metadata ? JSON.stringify(item.metadata) : null;

    // Delete existing entry if any (index on sourceType+sourceId makes this fast)
    await prisma.$executeRawUnsafe(
      `DELETE FROM "Embedding" WHERE "sourceType" = $1 AND "sourceId" = $2`,
      item.sourceType,
      item.sourceId
    );

    // Insert new embedding
    await prisma.$executeRawUnsafe(
      `INSERT INTO "Embedding" (id, "sourceType", "sourceId", content, vector, metadata, "createdAt")
       VALUES (gen_random_uuid()::text, $1, $2, $3, $4::vector, $5::jsonb, NOW())`,
      item.sourceType,
      item.sourceId,
      item.content,
      vectorStr,
      metadataJson
    );

    count++;
  }

  return count;
}


export async function ingestProducts(): Promise<number> {
  const products = await prisma.product.findMany();
  if (products.length === 0) return 0;

  const items = products.map((p) => ({
    sourceType: "product",
    sourceId: p.id,
    content: `${p.name} by ${p.brand} (${p.company}). Category: ${p.category}/${p.subCategory}. MRP: Rs.${p.mrp}. Shelf life: ${p.shelfLifeDays} days.`,
    metadata: {
      sku: p.sku,
      brand: p.brand,
      category: p.category,
      mrp: p.mrp,
    },
  }));

  const texts = items.map((i) => i.content);
  const vectors = await embedTexts(texts);

  return upsertEmbeddings(items, vectors);
}


export async function ingestKnowledge(): Promise<number> {
  if (FMCG_KNOWLEDGE.length === 0) return 0;

  const items = FMCG_KNOWLEDGE.map((k) => ({
    sourceType: k.sourceType,
    sourceId: k.sourceId,
    content: k.content,
    metadata: k.metadata,
  }));

  const texts = items.map((i) => i.content);
  const vectors = await embedTexts(texts);

  return upsertEmbeddings(items, vectors);
}


export async function ingestCampaignResults(): Promise<number> {
  const campaigns = await prisma.campaign.findMany({
    where: { status: "sent" },
  });

  if (campaigns.length === 0) return 0;

  const items: Array<{
    sourceType: string;
    sourceId: string;
    content: string;
    metadata?: Record<string, unknown>;
  }> = [];

  for (const c of campaigns) {
    // Count orders for this campaign
    const orderCount = await prisma.order.count({
      where: { campaignId: c.id },
    });

    // Parse target groups for reach estimate
    let groupCount = 0;
    try {
      const groups = JSON.parse(c.targetGroups || "[]");
      groupCount = Array.isArray(groups) ? groups.length : String(c.targetGroups).split(",").length;
    } catch {
      groupCount = c.targetGroups ? c.targetGroups.split(",").length : 0;
    }

    const conversionRate = groupCount > 0
      ? ((orderCount / (groupCount * 25)) * 100).toFixed(1)
      : "0";

    const content = `Campaign for ${c.productName}: ${c.offerHeadline || "promotional offer"}. Sent to ${groupCount} groups. ${orderCount} orders received. Conversion: ${conversionRate}%.`;

    items.push({
      sourceType: "campaign_result",
      sourceId: c.id,
      content,
      metadata: {
        productName: c.productName,
        orderCount,
        groupCount,
        conversionRate: parseFloat(conversionRate),
        sentAt: c.sentAt?.toISOString() || null,
      },
    });
  }

  const texts = items.map((i) => i.content);
  const vectors = await embedTexts(texts);

  return upsertEmbeddings(items, vectors);
}
