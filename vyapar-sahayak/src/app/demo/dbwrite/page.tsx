import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function DbWritePage() {
  // Test if Prisma WRITES work on Amplify SSR
  const existing = await prisma.distributor.findFirst();
  if (existing) {
    return <div>Already exists: {existing.name}</div>;
  }

  const dist = await prisma.distributor.create({
    data: {
      name: "Test Distributor",
      companyName: "Test Co",
      ownerName: "Test",
      city: "Test",
      state: "TN",
      gstin: "33TEST000000Z",
    },
  });

  return <div>Created distributor: {dist.id} - {dist.name}</div>;
}
