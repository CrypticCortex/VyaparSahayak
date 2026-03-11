export const runtime = "nodejs";
export const maxDuration = 120;

// src/app/api/recommend/[id]/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateText, generateImage, generateImageGemini } from "@/lib/bedrock";
import { invalidateAfterRecommend } from "@/lib/cache";
import { generateOrderToken } from "@/lib/order-token";

// Language config -- will be user-selectable later
const LANG = {
  code: "ta",
  name: "Tamil",
  whatsappStyle: "Write the message in Tamil (தமிழ்) script. Use casual spoken Tamil, not formal literary Tamil. Mix in common English words retailers use (like 'stock', 'offer', 'MRP', 'order'). The tone should feel like a friendly distributor texting his retailer on WhatsApp.",
  posterStyle: "Include Tamil text elements. South Indian retail market aesthetic. Tamil Nadu festive colors.",
  negativePrompt: "blurry, low quality, distorted text, watermark, dark background, cluttered, realistic photograph, human faces, small text, complex layouts",
};

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms)
    ),
  ]);
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Fetch alert, product, distributor in parallel
    const alert = await prisma.deadStockAlert.findUnique({ where: { id } });
    if (!alert) {
      return NextResponse.json({ error: "Alert not found" }, { status: 404 });
    }

    const mlRec = JSON.parse(alert.recommendationJson || "{}");

    const [product, distributor] = await Promise.all([
      prisma.product.findUnique({ where: { id: alert.productId } }),
      prisma.distributor.findFirst(),
    ]);
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const discountPct = mlRec.discountPct || 20;

    // Build all prompts upfront
    const recPrompt = `You are an AI assistant for Indian FMCG distributors in Tamil Nadu. Given this dead stock situation, provide a detailed recommendation in JSON format.

Dead stock details:
- Product: ${product.name} (${product.brand})
- Risk level: ${alert.riskLevel}
- Dead stock score: ${alert.score}
- Days since last sale: ${alert.daysSinceLastSale}
- Weeks of stock cover: ${alert.weeksOfCover.toFixed(1)}
- Days to expiry: ${alert.daysToExpiry}
- Stock value: Rs.${Math.round(alert.stockValue).toLocaleString("en-IN")}
- Zone: ${alert.zoneCode}
- ML recommendation: ${mlRec.type} - ${mlRec.rationale}

Respond with ONLY valid JSON:
{
  "type": "${mlRec.type}",
  "headline": "short action headline",
  "detailedRationale": "2-3 sentences explaining why this action",
  "estimatedRecovery": ${mlRec.estimatedRecovery},
  "steps": ["step 1", "step 2", "step 3"],
  "risks": ["risk 1"],
  "timeframe": "X days"
}`;

    const whatsappPrompt = `Generate a WhatsApp promotional message for FMCG retailers in Tirunelveli, Tamil Nadu.

${LANG.whatsappStyle}

Product: ${product.name} (${product.brand})
Category: ${product.category}
MRP: Rs.${product.mrp}
Offer: ${discountPct}% OFF
Campaign type: ${mlRec.type}
Distributor: ${distributor?.name || "Kalyan Traders"}, Tirunelveli

Requirements:
- Start with a greeting in Tamil
- Mention the product name and discount clearly
- Create urgency (limited stock / expiry approaching)
- End with "Order now" call-to-action in Tamil
- Include distributor name and a phone number placeholder
- Add 2-3 relevant hashtags mixing Tamil and English
- Keep under 150 words
- Use WhatsApp-friendly formatting (line breaks, emojis sparingly)

Write ONLY the WhatsApp message, nothing else.`;

    const headlinePrompt = `Write poster text for an FMCG clearance sale targeting Tamil Nadu retailers.

Product: ${product.name} (${product.brand})
Discount: ${discountPct}% OFF
Language: Tamil (தமிழ்)

Write the headline and subline in Tamil script. The offer text can be in English (e.g., "20% OFF").

Respond with ONLY JSON:
{"headline": "Tamil headline here", "subline": "Tamil subline with product name", "offerText": "${discountPct}% OFF"}`;

    const imagePrompt = `Vibrant South Indian FMCG clearance sale poster, flat graphic design. Saffron orange and indigo blue with white accents. Clean layout for WhatsApp sharing. Stylized colorful ${product.category.toLowerCase()} products on kirana shop shelf. Big discount badge in yellow circle. Green call-to-action banner. ${LANG.posterStyle} Simple composition, max 3 elements, no clutter.`;

    const geminiPrompt = `Professional Indian FMCG kirana store clearance sale promotional poster. Vibrant saffron orange and deep blue color scheme. A well-organized kirana shop shelf displaying colorful packaged ${product.category.toLowerCase()} products. A large bold circular badge showing ${discountPct}% OFF in bright yellow. Clean modern flat design layout optimized for WhatsApp sharing. Green call-to-action banner at the bottom. Festive South Indian retail aesthetic with kolam border decorations. Simple composition, bright and inviting, no human faces.`;

    // Run ALL 5 AI calls in parallel -- text is fast (~5s), images are slower (~15s)
    // Image calls get a 22s timeout to stay within CloudFront's 29s limit
    const [recResult, whatsappResult, headlineResult, awsResult, geminiResult] =
      await Promise.allSettled([
        generateText(recPrompt),
        generateText(whatsappPrompt),
        generateText(headlinePrompt),
        withTimeout(generateImage(imagePrompt, LANG.negativePrompt), 22000),
        withTimeout(generateImageGemini(geminiPrompt), 22000),
      ]);

    // Parse text results
    let aiRec;
    if (recResult.status === "fulfilled") {
      try {
        aiRec = JSON.parse(recResult.value);
      } catch {
        aiRec = { ...mlRec, aiResponse: recResult.value };
      }
    } else {
      console.error("Rec text generation failed:", recResult.reason);
      aiRec = { ...mlRec };
    }

    const whatsappMessage =
      whatsappResult.status === "fulfilled"
        ? whatsappResult.value
        : `${product.name} ${discountPct}% OFF - Limited stock!`;

    let posterText;
    if (headlineResult.status === "fulfilled") {
      try {
        posterText = JSON.parse(headlineResult.value);
      } catch {
        posterText = { headline: "சிறப்பு விற்பனை!", subline: product.name, offerText: `${discountPct}% OFF` };
      }
    } else {
      posterText = { headline: "சிறப்பு விற்பனை!", subline: product.name, offerText: `${discountPct}% OFF` };
    }

    // Parse image results
    let posterUrl = "";
    if (awsResult.status === "fulfilled") {
      const buf = awsResult.value;
      const mime = buf.toString("utf8", 0, 4) === "<svg" ? "image/svg+xml" : "image/png";
      posterUrl = `data:${mime};base64,${buf.toString("base64")}`;
    } else {
      console.error("AWS image generation failed:", awsResult.reason);
    }

    let posterUrlAlt = "";
    if (geminiResult.status === "fulfilled") {
      posterUrlAlt = `data:image/png;base64,${geminiResult.value.toString("base64")}`;
    } else {
      console.error("Gemini image generation failed:", geminiResult.reason);
    }

    // Write to DB
    const [rec] = await Promise.all([
      prisma.recommendation.create({
        data: {
          alertId: id,
          type: aiRec.type || mlRec.type || "discount",
          targetZone: mlRec.targetZone || null,
          bundleWith: mlRec.bundleWithName || null,
          discountPct: mlRec.discountPct || null,
          estimatedRecovery: mlRec.estimatedRecovery || alert.stockValue * 0.65,
          rationale: JSON.stringify(aiRec),
          status: "approved",
        },
      }),
      prisma.deadStockAlert.update({
        where: { id },
        data: { status: "approved" },
      }),
    ]);

    const orderToken = generateOrderToken();
    const baseAppUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const orderUrl = `${baseAppUrl}/order/${orderToken}`;
    const whatsappMessageWithLink = `${whatsappMessage}\n\nOrder now: ${orderUrl}`;

    const campaign = await prisma.campaign.create({
      data: {
        recommendationId: rec.id,
        distributorId: distributor?.id || "",
        productName: product.name,
        posterUrl: posterUrl || posterUrlAlt || null,
        posterUrlAlt: (posterUrl && posterUrlAlt) ? posterUrlAlt : null,
        posterPrompt: imagePrompt,
        whatsappMessage: whatsappMessageWithLink,
        offerHeadline: posterText.headline,
        offerDetails: JSON.stringify(posterText),
        orderLink: orderToken,
        status: "draft",
      },
    });

    invalidateAfterRecommend(campaign.id);

    return NextResponse.json({
      success: true,
      recommendation: rec,
      campaignId: campaign.id,
      ai: aiRec,
      language: LANG.code,
    });
  } catch (error) {
    console.error("Recommend error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
