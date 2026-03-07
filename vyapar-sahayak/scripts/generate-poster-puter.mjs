#!/usr/bin/env node
// Generate VyaparSahayak poster using Nano Banana Pro via Puter.js (free, no API key)
// Uses Puppeteer to run puter.js in a headless browser

import puppeteer from "puppeteer";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, "..", "public", "posters");
const OUTPUT_FILE = process.argv[2] || "nano-banana-poster.png";

const PROMPT = `Professional Indian FMCG kirana store clearance sale promotional poster. Vibrant saffron orange and deep blue color scheme. A well-organized kirana shop shelf displaying colorful packaged grocery products like spices, oils, snacks, and beverages. A large bold circular badge showing 20% OFF in bright yellow. Clean modern flat design layout optimized for WhatsApp sharing. Green call-to-action banner at the bottom. Festive South Indian retail aesthetic with kolam border decorations. Simple composition, bright and inviting, no text, no human faces.`;

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true });

  console.log("[*] Launching headless browser...");
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  // Load a minimal page with puter.js
  await page.setContent(`
    <html>
    <body>
      <div id="status">loading</div>
      <div id="result"></div>
      <script src="https://js.puter.com/v2/"></script>
      <script>
        document.getElementById('status').textContent = 'generating';
        puter.ai.txt2img(
          ${JSON.stringify(PROMPT)},
          { model: "gemini-3-pro-image-preview" }
        )
        .then(imgEl => {
          // imgEl is an <img> element with src as data URL or blob
          document.getElementById('result').appendChild(imgEl);
          document.getElementById('status').textContent = 'done';
        })
        .catch(err => {
          document.getElementById('status').textContent = 'error:' + err.message;
        });
      </script>
    </body>
    </html>
  `);

  console.log("[*] Generating poster with Nano Banana Pro (gemini-3-pro-image-preview)...");
  console.log("[*] Prompt: " + PROMPT.slice(0, 80) + "...");
  console.log("[*] This may take 30-60 seconds...");

  // Wait for status to change from 'generating'
  const maxWait = 120000; // 2 minutes
  const pollInterval = 2000;
  let elapsed = 0;

  while (elapsed < maxWait) {
    await new Promise(r => setTimeout(r, pollInterval));
    elapsed += pollInterval;

    const status = await page.$eval("#status", el => el.textContent);

    if (status === "done") {
      console.log("[*] Image generated! Extracting...");

      // Get the image src (could be data URL or blob URL)
      const imgSrc = await page.$eval("#result img", el => el.src);

      let imageBuffer;
      if (imgSrc.startsWith("data:")) {
        // data:image/png;base64,...
        const base64 = imgSrc.split(",")[1];
        imageBuffer = Buffer.from(base64, "base64");
      } else {
        // Blob URL -- need to fetch it in browser context
        const base64 = await page.evaluate(async (src) => {
          const resp = await fetch(src);
          const blob = await resp.blob();
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result.split(",")[1]);
            reader.readAsDataURL(blob);
          });
        }, imgSrc);
        imageBuffer = Buffer.from(base64, "base64");
      }

      const outputPath = path.join(OUTPUT_DIR, OUTPUT_FILE);
      await writeFile(outputPath, imageBuffer);
      console.log(`[OK] Saved to ${outputPath}`);
      console.log(`[OK] Size: ${(imageBuffer.length / 1024).toFixed(1)} KB`);
      break;
    } else if (status.startsWith("error:")) {
      console.log(`[FAIL] ${status}`);
      break;
    } else {
      process.stdout.write(`\r[*] Waiting... ${elapsed / 1000}s`);
    }
  }

  if (elapsed >= maxWait) {
    console.log("\n[FAIL] Timed out after 2 minutes.");
  }

  await browser.close();
}

main().catch(err => {
  console.error("[FAIL]", err.message);
  process.exit(1);
});
