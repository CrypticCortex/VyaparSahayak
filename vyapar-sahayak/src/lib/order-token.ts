// Order token generator for campaign order links

import { randomBytes } from "crypto";

export function generateOrderToken(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = randomBytes(12);
  let token = "vyp_";
  for (let i = 0; i < 12; i++) {
    token += chars[bytes[i] % chars.length];
  }
  return token;
}
