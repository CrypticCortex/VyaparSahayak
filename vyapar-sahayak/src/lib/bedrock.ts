// src/lib/bedrock.ts

import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";

const client = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || "us-east-1",
});

const isDemoMode = !process.env.AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID === "your-key";

// Text generation via Bedrock (supports Claude and Nova models)
export async function generateText(prompt: string): Promise<string> {
  if (isDemoMode) {
    return generateMockText(prompt);
  }

  const modelId = process.env.BEDROCK_TEXT_MODEL || "amazon.nova-lite-v1:0";
  const isClaude = modelId.startsWith("anthropic.");

  const body = isClaude
    ? JSON.stringify({
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 2048,
        messages: [{ role: "user", content: prompt }],
      })
    : JSON.stringify({
        inferenceConfig: { maxTokens: 4096 },
        messages: [{ role: "user", content: [{ text: prompt }] }],
      });

  const response = await client.send(
    new InvokeModelCommand({
      modelId,
      body,
      contentType: "application/json",
      accept: "application/json",
    })
  );

  const decoded = JSON.parse(new TextDecoder().decode(response.body));

  if (isClaude) {
    return decoded.content[0].text;
  }
  return decoded.output.message.content[0].text;
}

function generateMockText(prompt: string): string {
  if (prompt.includes("WhatsApp")) {
    return `வணக்கம்! 🙏

Kalyan Traders - Tirunelveli சிறப்பு offer!

🔥 *Special Clearance Sale* 🔥
Limited stock மட்டுமே!

✅ MRP-ல 20% OFF
✅ Fresh stock guarantee
✅ Delivery available

Stock குறைவாக உள்ளது, உடனே order போடுங்க!

📞 Call/WhatsApp: +91 98765 43210
Kalyan Traders, Tirunelveli

#ClearanceSale #KalyanTraders #திருநெல்வேலி

Order now: /order/vyp_demo123abc`;
  }
  if (prompt.includes("headline") || prompt.includes("poster text")) {
    return JSON.stringify({ headline: "சிறப்பு விற்பனை!", subline: "குறைந்த விலையில் தரமான பொருட்கள்", offerText: "20% OFF" });
  }
  if (prompt.includes("recommendation")) {
    return JSON.stringify({
      type: "reallocate",
      headline: "Move stock to high-demand zone",
      detailedRationale: "This product has zero velocity in the current zone but shows active demand in nearby zones. Reallocating before expiry maximizes recovery.",
      estimatedRecovery: 5000,
      steps: ["Identify receiving zone retailers", "Arrange transport within 48 hours", "Confirm receipt and update inventory"],
      risks: ["Transport cost may reduce margins by 5-8%"],
      timeframe: "3-5 days"
    });
  }
  // Handle LLM enrichment prompt (batch of alerts)
  if (prompt.includes("ALERT") && prompt.includes("dead stock")) {
    const idMatches = [...prompt.matchAll(/ALERT \d+ \(id: ([^)]+)\)/g)];
    const results = idMatches.map((m) => ({
      id: m[1],
      problem: `This product has been sitting idle with zero sales velocity, tying up working capital that could be deployed on fast-moving items. The longer it stays, the closer it gets to expiry -- at which point the entire stock value becomes a write-off.`,
      solution: `Run a 15-20% discount flash sale targeting retailers in zones with active demand for this category. Bundle with a fast-moving SKU to increase uptake. Aim to clear at least 60% of stock within 2 weeks.`,
      rationale: `Velocity ratio analysis shows sales have dropped significantly compared to the 90-day average. Zone-level demand data indicates nearby territories still move this category. A targeted discount recovers more value than waiting for expiry.`,
      urgency: "Act within 1 week",
      recoverySteps: [
        "Identify 10-15 retailers in high-demand zones who stock this category",
        "Create WhatsApp broadcast with discount offer and minimum order quantity",
        "Bundle with a top-selling SKU at a combo price to drive adoption",
        "Track sell-through daily and adjust discount if clearance is too slow"
      ],
    }));
    return JSON.stringify(results);
  }
  return "AI recommendation generated in demo mode.";
}

// Image generation via Nova Canvas
export async function generateImage(
  prompt: string,
  negativePrompt?: string
): Promise<Buffer> {
  if (isDemoMode) {
    return generateMockPoster(prompt);
  }

  const body = JSON.stringify({
    taskType: "TEXT_IMAGE",
    textToImageParams: {
      text: prompt,
      negativeText: negativePrompt || "blurry, low quality, distorted text, watermark, dark background, cluttered",
    },
    imageGenerationConfig: {
      seed: Math.floor(Math.random() * 858993459),
      quality: "standard",
      width: 1024,
      height: 1024,
      numberOfImages: 1,
      cfgScale: 8.0,
    },
  });

  const response = await client.send(
    new InvokeModelCommand({
      modelId: "amazon.nova-canvas-v1:0",
      body,
      contentType: "application/json",
      accept: "application/json",
    })
  );

  const decoded = JSON.parse(new TextDecoder().decode(response.body));
  if (decoded.error) throw new Error(`Nova Canvas error: ${decoded.error}`);
  return Buffer.from(decoded.images[0], "base64");
}

// Image generation via Gemini (Nano Banana Pro)
export async function generateImageGemini(prompt: string): Promise<Buffer> {
  const apiKey = process.env.GOOGLE_CLOUD_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_CLOUD_API_KEY not set");
  }

  const { GoogleGenAI } = await import("@google/genai");
  const ai = new GoogleGenAI({ apiKey });
  const model = "gemini-3-pro-image-preview";

  const chat = ai.chats.create({
    model,
    config: {
      maxOutputTokens: 32768,
      temperature: 1,
      topP: 0.95,
      responseModalities: ["TEXT", "IMAGE"],
      imageConfig: { aspectRatio: "1:1", imageSize: "1K" },
    },
  });

  const response = await chat.sendMessageStream({
    message: [{ text: prompt }],
  });

  for await (const chunk of response) {
    if (!chunk.candidates) continue;
    for (const candidate of chunk.candidates) {
      if (!candidate.content?.parts) continue;
      for (const part of candidate.content.parts) {
        if (part.inlineData) {
          return Buffer.from(part.inlineData.data as string, "base64");
        }
      }
    }
  }

  throw new Error("Gemini returned no image");
}

function generateMockPoster(_prompt: string): Buffer {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#FF6B00"/>
        <stop offset="50%" style="stop-color:#E65100"/>
        <stop offset="100%" style="stop-color:#BF360C"/>
      </linearGradient>
      <linearGradient id="banner" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" style="stop-color:#1A237E"/>
        <stop offset="100%" style="stop-color:#283593"/>
      </linearGradient>
    </defs>
    <rect width="1024" height="1024" fill="url(#bg)" rx="24"/>
    <rect x="0" y="0" width="1024" height="120" fill="url(#banner)"/>
    <text x="512" y="80" text-anchor="middle" font-family="sans-serif" font-size="48" fill="white" font-weight="700">Kalyan Traders - Tirunelveli</text>
    <rect x="40" y="140" width="944" height="844" fill="none" stroke="white" stroke-width="3" stroke-dasharray="15,8" rx="16" opacity="0.25"/>
    <text x="512" y="250" text-anchor="middle" font-family="sans-serif" font-size="72" fill="white" font-weight="900">சிறப்பு விற்பனை!</text>
    <text x="512" y="330" text-anchor="middle" font-family="sans-serif" font-size="36" fill="#FFE082" opacity="0.95">Special Clearance Sale</text>
    <circle cx="512" cy="530" r="150" fill="white" opacity="0.15"/>
    <circle cx="512" cy="530" r="120" fill="white" opacity="0.1"/>
    <text x="512" y="510" text-anchor="middle" font-family="sans-serif" font-size="110" fill="white" font-weight="900">20%</text>
    <text x="512" y="590" text-anchor="middle" font-family="sans-serif" font-size="56" fill="#FFE082" font-weight="900">OFF</text>
    <rect x="160" y="720" width="704" height="80" fill="white" rx="40" opacity="0.95"/>
    <text x="512" y="773" text-anchor="middle" font-family="sans-serif" font-size="34" fill="#E65100" font-weight="700">உடனே ஆர்டர் செய்யுங்கள்!</text>
    <text x="512" y="870" text-anchor="middle" font-family="sans-serif" font-size="28" fill="white" opacity="0.85">Stock குறைவு - Limited Period Only</text>
    <text x="512" y="920" text-anchor="middle" font-family="sans-serif" font-size="26" fill="white" opacity="0.7">WhatsApp: +91 98765 43210</text>
    <text x="512" y="970" text-anchor="middle" font-family="sans-serif" font-size="18" fill="white" opacity="0.4">Demo Poster - AI Generated in Production</text>
  </svg>`;
  return Buffer.from(svg);
}
