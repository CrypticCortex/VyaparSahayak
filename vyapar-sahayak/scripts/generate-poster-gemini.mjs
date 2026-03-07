#!/usr/bin/env node
// Generate VyaparSahayak poster using Gemini 3 Pro Image (Nano Banana Pro)
// Usage: GOOGLE_CLOUD_API_KEY=xxx node scripts/generate-poster-gemini.mjs [output_filename]

import { GoogleGenAI } from "@google/genai";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, "..", "public", "posters");
const OUTPUT_FILE = process.argv[2] || "nano-banana-poster.png";

const API_KEY = process.env.GOOGLE_CLOUD_API_KEY;
if (!API_KEY) {
  console.log("[FAIL] Set GOOGLE_CLOUD_API_KEY env var. Get one free at https://aistudio.google.com/apikey");
  process.exit(1);
}

const PROMPT = `Professional Indian FMCG kirana store clearance sale promotional poster. Vibrant saffron orange and deep blue color scheme. A well-organized kirana shop shelf displaying colorful packaged grocery products like spices, oils, snacks, and beverages. A large bold circular badge showing 20% OFF in bright yellow. Clean modern flat design layout optimized for WhatsApp sharing. Green call-to-action banner at the bottom. Festive South Indian retail aesthetic with kolam border decorations. Simple composition, bright and inviting, no human faces.`;

const ai = new GoogleGenAI({ apiKey: API_KEY });
const model = "gemini-3-pro-image-preview";

const generationConfig = {
  maxOutputTokens: 32768,
  temperature: 1,
  topP: 0.95,
  responseModalities: ["TEXT", "IMAGE"],
  imageConfig: {
    aspectRatio: "1:1",
    imageSize: "1K",
  },
  safetySettings: [
    { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "OFF" },
    { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "OFF" },
    { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "OFF" },
    { category: "HARM_CATEGORY_HARASSMENT", threshold: "OFF" },
  ],
};

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true });

  console.log("[*] Generating poster with Nano Banana Pro (gemini-3-pro-image-preview)...");
  console.log("[*] Prompt:", PROMPT.slice(0, 80) + "...");

  const chat = ai.chats.create({ model, config: generationConfig });

  const response = await chat.sendMessageStream({
    message: [{ text: PROMPT }],
  });

  let saved = false;
  for await (const chunk of response) {
    if (chunk.candidates) {
      for (const candidate of chunk.candidates) {
        if (!candidate.content?.parts) continue;
        for (const part of candidate.content.parts) {
          if (part.inlineData) {
            const imageBuffer = Buffer.from(part.inlineData.data, "base64");
            const outputPath = path.join(OUTPUT_DIR, OUTPUT_FILE);
            await writeFile(outputPath, imageBuffer);
            console.log(`[OK] Saved to ${outputPath}`);
            console.log(`[OK] Size: ${(imageBuffer.length / 1024).toFixed(1)} KB`);
            saved = true;
          } else if (part.text) {
            console.log("[*] Model:", part.text.slice(0, 200));
          }
        }
      }
    }
  }

  if (!saved) {
    console.log("[FAIL] No image returned. The model may require billing for image output.");
  }
}

main().catch(err => {
  console.error("[FAIL]", err.message);
  process.exit(1);
});
