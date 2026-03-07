// src/lib/ml/features.ts

import { prisma } from "@/lib/db";
import { differenceInDays } from "date-fns";
import { getSeasonalMultiplier } from "@/lib/seed/seasonal";

// Local types matching the Prisma query shape (avoids cascading type errors
// when generated Prisma client path alias is not resolved by tsc)
interface SalesLineItemWithTx {
  quantity: number;
  transaction: {
    date: Date;
    retailerId: string;
    retailer: { zoneId: string };
  };
}

interface ProductWithLineItems {
  id: string;
  name: string;
  brand: string;
  category: string;
  sku: string;
  costPrice: number;
  shelfLifeDays: number;
  lineItems: SalesLineItemWithTx[];
}

interface InventoryWithProduct {
  id: string;
  productId: string;
  zoneCode: string;
  currentStock: number;
  expiryDate: Date;
  product: ProductWithLineItems;
}

export interface SKUFeatures {
  inventoryId: string;
  productId: string;
  productName: string;
  brand: string;
  category: string;
  sku: string;
  zoneCode: string;

  daysSinceLastSale: number;
  avgDailySalesLast30d: number;
  avgDailySalesLast90d: number;
  velocityRatio: number;
  velocityTrend: number;

  currentStock: number;
  currentStockValue: number;
  weeksOfCover: number;

  daysToExpiry: number;
  hasExpiry: boolean;
  expiryUrgency: number;

  seasonalIndex: number;
  nextMonthSeasonalIndex: number;

  activeRetailerCount: number;
  totalRetailerCount: number;
  retailerPenetration: number;

  returnRate: number;
}

export async function extractFeatures(distributorId: string): Promise<SKUFeatures[]> {
  const today = new Date();
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);
  const currentMonth = today.getMonth() + 1;
  const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;

  const inventoryItems = await prisma.inventory.findMany({
    where: { distributorId },
    include: {
      product: {
        include: {
          lineItems: {
            include: {
              transaction: {
                include: { retailer: true },
              },
            },
          },
        },
      },
    },
  }) as unknown as InventoryWithProduct[];

  const zones = await prisma.zone.findMany({ where: { distributorId } }) as unknown as Array<{ code: string; retailerCount: number }>;
  const zoneRetailerCounts: Record<string, number> = {};
  for (const z of zones) {
    zoneRetailerCounts[z.code] = z.retailerCount;
  }

  const features: SKUFeatures[] = [];

  for (const inv of inventoryItems) {
    const product = inv.product;
    const allSales = product.lineItems.filter(
      (li) => li.transaction.retailer.zoneId !== undefined
    );

    const sales30d = allSales.filter(
      (li) => li.transaction.date >= thirtyDaysAgo
    );
    const totalQty30d = sales30d.reduce((s, li) => s + li.quantity, 0);
    const avgDaily30d = totalQty30d / 30;

    const sales90d = allSales.filter(
      (li) => li.transaction.date >= ninetyDaysAgo
    );
    const totalQty90d = sales90d.reduce((s, li) => s + li.quantity, 0);
    const avgDaily90d = totalQty90d / 90;

    const velocityRatio = avgDaily90d > 0 ? avgDaily30d / avgDaily90d : 0;

    const twoWeeksAgo = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000);
    const salesLastWeek = allSales.filter(
      (li) => li.transaction.date >= twoWeeksAgo && li.transaction.date < new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    );
    const salesThisWeek = allSales.filter(
      (li) => li.transaction.date >= new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    );
    const qtyLastWeek = salesLastWeek.reduce((s, li) => s + li.quantity, 0);
    const qtyThisWeek = salesThisWeek.reduce((s, li) => s + li.quantity, 0);
    const velocityTrend = qtyLastWeek > 0 ? (qtyThisWeek - qtyLastWeek) / qtyLastWeek : 0;

    const sortedSales = allSales
      .map((li) => li.transaction.date)
      .sort((a, b) => b.getTime() - a.getTime());
    const lastSaleDate = sortedSales[0] || ninetyDaysAgo;
    const daysSinceLastSale = differenceInDays(today, lastSaleDate);

    const avgWeeklySales = avgDaily30d * 7;
    const weeksOfCover = avgWeeklySales > 0 ? inv.currentStock / avgWeeklySales : 99;

    const daysToExpiry = differenceInDays(inv.expiryDate, today);
    const expiryUrgency = daysToExpiry < 60 ? Math.max(0, 1 - daysToExpiry / 60) : 0;

    const seasonalIndex = getSeasonalMultiplier(product.category, currentMonth);
    const nextMonthSeasonalIndex = getSeasonalMultiplier(product.category, nextMonth);

    const sixtyDaysAgo = new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000);
    const activeRetailers = new Set(
      allSales
        .filter((li) => li.transaction.date >= sixtyDaysAgo)
        .map((li) => li.transaction.retailerId)
    );
    const totalRetailerCount = zoneRetailerCounts[inv.zoneCode] || 1;

    features.push({
      inventoryId: inv.id,
      productId: product.id,
      productName: product.name,
      brand: product.brand,
      category: product.category,
      sku: product.sku,
      zoneCode: inv.zoneCode,

      daysSinceLastSale,
      avgDailySalesLast30d: avgDaily30d,
      avgDailySalesLast90d: avgDaily90d,
      velocityRatio,
      velocityTrend,

      currentStock: inv.currentStock,
      currentStockValue: inv.currentStock * product.costPrice,
      weeksOfCover,

      daysToExpiry,
      hasExpiry: product.shelfLifeDays < 1000,
      expiryUrgency,

      seasonalIndex,
      nextMonthSeasonalIndex,

      activeRetailerCount: activeRetailers.size,
      totalRetailerCount,
      retailerPenetration: activeRetailers.size / totalRetailerCount,

      returnRate: 0,
    });
  }

  return features;
}
