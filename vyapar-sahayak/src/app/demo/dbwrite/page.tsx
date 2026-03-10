import { prisma } from "@/lib/db";

export const revalidate = 0;

export default async function DbWritePage() {
  const existing = await prisma.distributor.findFirst();
  if (existing) {
    return <div>Already exists: {existing.name}</div>;
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

  return <div>Created: {dist.id} - {dist.name}</div>;
}
