import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export const revalidate = 0;

export default async function ResetPage() {
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

  revalidatePath("/demo", "layout");
  redirect("/demo");
}
