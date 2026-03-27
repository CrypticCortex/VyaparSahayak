// Express routes for the WhatsApp service API

import { Router, Request, Response } from "express";
import QRCode from "qrcode";
import { getSocket, getQR, isConnected, getPhoneNumber } from "./connection.js";

const router = Router();


// GET /status -- connection status
router.get("/status", (_req: Request, res: Response) => {
  res.json({
    connected: isConnected(),
    phoneNumber: getPhoneNumber(),
    hasQR: !!getQR(),
  });
});


// GET /qr -- QR code as PNG image for scanning
router.get("/qr", async (_req: Request, res: Response) => {
  const qr = getQR();

  if (!qr) {
    if (isConnected()) {
      res.status(200).json({ message: "Already connected, no QR needed." });
      return;
    }
    res.status(404).json({ error: "No QR code available. Service may still be initializing." });
    return;
  }

  try {
    const png = await QRCode.toBuffer(qr, { type: "png", width: 300 });
    res.setHeader("Content-Type", "image/png");
    res.send(png);
  } catch (err) {
    res.status(500).json({ error: "Failed to generate QR image" });
  }
});


// POST /send -- send a text message to a single JID
router.post("/send", async (req: Request, res: Response) => {
  const { jid, text } = req.body;

  if (!jid || !text) {
    res.status(400).json({ error: "Missing jid or text" });
    return;
  }

  const sock = getSocket();
  if (!sock || !isConnected()) {
    res.status(503).json({ error: "WhatsApp not connected" });
    return;
  }

  try {
    await sock.sendMessage(jid, { text });
    res.json({ success: true, jid });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to send message" });
  }
});


// POST /send-image -- send image + caption
router.post("/send-image", async (req: Request, res: Response) => {
  const { jid, image, caption } = req.body;

  if (!jid || !image) {
    res.status(400).json({ error: "Missing jid or image (base64)" });
    return;
  }

  const sock = getSocket();
  if (!sock || !isConnected()) {
    res.status(503).json({ error: "WhatsApp not connected" });
    return;
  }

  try {
    const imageBuffer = Buffer.from(image, "base64");
    await sock.sendMessage(jid, {
      image: imageBuffer,
      caption: caption || "",
    });
    res.json({ success: true, jid });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to send image" });
  }
});


// Helper: random delay between min and max ms
function randomDelay(minMs: number, maxMs: number): Promise<void> {
  const ms = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return new Promise((resolve) => setTimeout(resolve, ms));
}


// POST /send-campaign -- batch send to multiple JIDs with rate limiting
router.post("/send-campaign", async (req: Request, res: Response) => {
  const { campaignId, message, imageBase64, jids } = req.body;

  if (!campaignId || !jids || !Array.isArray(jids) || jids.length === 0) {
    res.status(400).json({ error: "Missing campaignId or jids array" });
    return;
  }

  if (jids.length > 50) {
    res.status(400).json({ error: "jids must be an array with max 50 entries" });
    return;
  }

  const sock = getSocket();
  if (!sock || !isConnected()) {
    res.status(503).json({ error: "WhatsApp not connected" });
    return;
  }

  const results: Array<{ jid: string; status: string; error?: string }> = [];
  const imageBuffer = imageBase64 ? Buffer.from(imageBase64, "base64") : null;

  for (let i = 0; i < jids.length; i++) {
    const jid = jids[i];
    try {
      if (imageBuffer) {
        await sock.sendMessage(jid, {
          image: imageBuffer,
          caption: message || "",
        });
      } else if (message) {
        await sock.sendMessage(jid, { text: message });
      }
      results.push({ jid, status: "delivered" });
    } catch (err: any) {
      results.push({ jid, status: "failed", error: err.message });
    }

    // Rate limit: 2-5 second delay between sends (skip after last)
    if (i < jids.length - 1) {
      await randomDelay(2000, 5000);
    }
  }

  const delivered = results.filter((r) => r.status === "delivered").length;
  const failed = results.filter((r) => r.status === "failed").length;

  res.json({
    campaignId,
    total: jids.length,
    delivered,
    failed,
    results,
  });
});


export default router;
