export const runtime = "nodejs";

// src/app/api/campaign/generate/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateText, generateImage } from "@/lib/bedrock";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(req: Request) {
  try {
    const { recommendationId } = await req.json();
    const rec = await prisma.recommendation.findUnique({
      where: { id: recommendationId },
    });
    if (!rec) {
      return NextResponse.json({ error: "Recommendation not found" }, { status: 404 });
    }

    const alert = await prisma.deadStockAlert.findUnique({
      where: { id: rec.alertId },
    });
    if (!alert) {
      return NextResponse.json({ error: "Alert not found" }, { status: 404 });
    }

    const product = await prisma.product.findUnique({
      where: { id: alert.productId },
    });
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const distributor = await prisma.distributor.findFirst();

    // Generate WhatsApp message via Bedrock
    const textPrompt = `Generate a WhatsApp promotional message for Indian FMCG retailers. Keep it casual, direct, deal-focused. Use Hinglish style.

Product: ${product.name} (${product.brand})
MRP: Rs.${product.mrp}
Offer: ${rec.discountPct || 15}% OFF
Type: ${rec.type} campaign
Distributor: ${distributor?.name || "Kalyan Traders"}

Write ONLY the WhatsApp message (150 words max). Include a hashtag at the end.`;

    const whatsappMessage = await generateText(textPrompt);

    // Generate poster headline
    const headlinePrompt = `Write a short, punchy headline for an Indian FMCG clearance sale poster.
Product: ${product.name}
Discount: ${rec.discountPct || 15}% OFF
Style: Bold, urgent, eye-catching

Respond with ONLY JSON: {"headline": "...", "subline": "...", "offerText": "..."}`;

    const headlineResponse = await generateText(headlinePrompt);
    let posterText;
    try {
      posterText = JSON.parse(headlineResponse);
    } catch {
      posterText = { headline: "MEGA SALE!", subline: product.name, offerText: `${rec.discountPct || 15}% OFF` };
    }

    // Generate poster image via Nova Canvas
    const imagePrompt = `Vibrant Indian FMCG clearance sale promotional poster. Bold red and saffron yellow color scheme. Eye-catching retail advertisement with clean white background. Professional product display for ${product.category} items. Modern flat design style with dynamic composition. High contrast, print-ready quality. Indian retail market style.`;

    let posterUrl = "";
    try {
      const imageBuffer = await generateImage(imagePrompt);
      const postersDir = path.join(process.cwd(), "public", "posters");
      await mkdir(postersDir, { recursive: true });
      const filename = `poster-${rec.id}.png`;
      await writeFile(path.join(postersDir, filename), imageBuffer);
      posterUrl = `/posters/${filename}`;
    } catch (imgError) {
      console.error("Image generation failed:", imgError);
      posterUrl = "";
    }

    // Save campaign
    const campaign = await prisma.campaign.create({
      data: {
        recommendationId: rec.id,
        distributorId: distributor?.id || "",
        productName: product.name,
        posterUrl,
        posterPrompt: imagePrompt,
        whatsappMessage,
        offerHeadline: posterText.headline,
        offerDetails: JSON.stringify(posterText),
        status: "draft",
      },
    });

    return NextResponse.json({
      success: true,
      campaign,
      posterText,
      whatsappMessage,
    });
  } catch (error) {
    console.error("Campaign generation error:", error);
    return NextResponse.json({ error: "Campaign generation failed" }, { status: 500 });
  }
}
