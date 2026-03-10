import { redirect } from "next/navigation";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/db";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

async function doReset() {
  await prisma.dispatchBatchOrder.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.dispatchBatch.deleteMany();
  await prisma.agentSuggestion.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.recommendation.deleteMany();
  await prisma.deadStockAlert.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.salesLineItem.deleteMany();
  await prisma.salesTransaction.deleteMany();
  await prisma.whatsAppGroup.deleteMany();
  await prisma.retailer.deleteMany();
  await prisma.zone.deleteMany();
  await prisma.product.deleteMany();
  await prisma.distributor.deleteMany();
  revalidateTag("dashboard", "max");
  revalidateTag("alerts", "max");
  revalidateTag("network", "max");
  revalidateTag("campaigns", "max");

  return { done: true };
}

export default async function ResetPage() {
  await doReset();
  redirect("/demo");
}
