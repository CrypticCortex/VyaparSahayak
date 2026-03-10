import { prisma } from "@/lib/db";
import { unstable_cache } from "next/cache";

export const revalidate = 0;

// Wrap even writes in unstable_cache -- Amplify SSR only works with this wrapper
const doWrite = unstable_cache(
  async () => {
    const existing = await prisma.distributor.findFirst();
    if (existing) {
      return { action: "exists", id: existing.id, name: existing.name };
    }

    const dist = await prisma.distributor.create({
      data: {
        name: "Test Distributor",
        ownerName: "Test",
        city: "Test",
        state: "TN",
        gstin: "33TEST000000Z",
        monthlyTurnover: 100000,
        deadStockThreshold: 60,
      },
    });
    return { action: "created", id: dist.id, name: dist.name };
  },
  [`dbwrite-${Date.now()}`],
  { revalidate: 0 }
);

export default async function DbWritePage() {
  const result = await doWrite();
  return (
    <div>
      DB Write ({result.action}): {result.id} - {result.name}
    </div>
  );
}
