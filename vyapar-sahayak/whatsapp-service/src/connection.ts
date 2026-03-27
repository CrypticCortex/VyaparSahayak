// Baileys WhatsApp connection manager
// Handles QR auth, session persistence, and auto-reconnect

import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  WASocket,
  ConnectionState,
} from "baileys";
import { Boom } from "@hapi/boom";
import pino from "pino";

const logger = pino({ level: "warn" });

let socket: WASocket | null = null;
let qrCode: string | null = null;
let connected = false;
let phoneNumber: string | null = null;


export function getSocket(): WASocket | null {
  return socket;
}


export function getQR(): string | null {
  return qrCode;
}


export function isConnected(): boolean {
  return connected;
}


export function getPhoneNumber(): string | null {
  return phoneNumber;
}


export async function initConnection(): Promise<void> {
  const { state, saveCreds } = await useMultiFileAuthState("./auth_state");

  socket = makeWASocket({
    auth: state,
    logger: logger as any,
    printQRInTerminal: true,
  });

  socket.ev.on("creds.update", saveCreds);

  socket.ev.on("connection.update", (update: Partial<ConnectionState>) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      qrCode = qr;
      console.log("[WA] QR code received -- scan with WhatsApp to authenticate");
    }

    if (connection === "close") {
      connected = false;
      qrCode = null;
      phoneNumber = null;

      const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      console.log(
        `[WA] Connection closed. Status: ${statusCode}. Reconnect: ${shouldReconnect}`
      );

      if (shouldReconnect) {
        // Reconnect after a short delay
        setTimeout(() => {
          console.log("[WA] Reconnecting...");
          initConnection();
        }, 3000);
      } else {
        console.log("[WA] Logged out. Delete ./auth_state and restart to re-authenticate.");
      }
    }

    if (connection === "open") {
      connected = true;
      qrCode = null; // QR no longer needed
      phoneNumber = socket?.user?.id?.split(":")[0] || null;
      console.log(`[WA] Connected as ${phoneNumber}`);
    }
  });
}
