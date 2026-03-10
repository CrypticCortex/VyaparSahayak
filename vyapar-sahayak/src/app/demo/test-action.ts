"use server";

import { prisma } from "@/lib/db";

export async function testAction() {
  const count = await prisma.distributor.count();
  return { ok: true, count };
}
