// Vyapar Sahayak WhatsApp Service
// Separate Express server running Baileys for real WhatsApp message delivery

import express from "express";
import routes from "./routes.js";
import { initConnection } from "./connection.js";

const PORT = process.env.PORT || 8001;
const app = express();

// CORS for local Next.js dev server
app.use((_req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "http://localhost:3000");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-api-key");
  if (_req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  next();
});

// JSON body parser with 50MB limit for base64 images
app.use(express.json({ limit: "50mb" }));

// API key auth for all routes except /status and /qr (local management)
app.use((req, res, next) => {
  if (req.path === "/status" || req.path === "/qr") {
    return next();
  }
  const apiKey = req.headers["x-api-key"];
  if (!apiKey || apiKey !== process.env.WA_API_SECRET) {
    return res.status(401).json({ error: "Unauthorized - missing or invalid x-api-key" });
  }
  next();
});

// Mount routes at root
app.use("/", routes);

// Start server and initialize Baileys connection
app.listen(PORT, () => {
  console.log(`[WA Service] Running on http://localhost:${PORT}`);
  console.log(`[WA Service] Endpoints:`);
  console.log(`  GET  /status        -- connection status`);
  console.log(`  GET  /qr            -- QR code image for auth`);
  console.log(`  POST /send          -- send text message`);
  console.log(`  POST /send-image    -- send image + caption`);
  console.log(`  POST /send-campaign -- batch send to multiple JIDs`);
});

// Init Baileys connection (async, runs in background)
initConnection().catch((err) => {
  console.error("[WA Service] Failed to initialize connection:", err);
});
