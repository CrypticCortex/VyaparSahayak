import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const alert = await prisma.deadStockAlert.findUnique({ where: { id } });

  if (!alert) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [product, zones, existingRec] = await Promise.all([
    prisma.product.findUnique({ where: { id: alert.productId }, select: { name: true } }),
    prisma.zone.findMany({ where: { distributorId: alert.distributorId }, select: { name: true, code: true } }),
    prisma.recommendation.findFirst({
      where: { alertId: id },
      include: { campaign: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return NextResponse.json({ alert, product, zones, existingRec });
}
