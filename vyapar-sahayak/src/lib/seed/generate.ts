// src/lib/seed/generate.ts

import seedrandom from "seedrandom";
import { addDays, subDays, format, getMonth, differenceInDays } from "date-fns";
import { PRODUCTS, RETAILER_NAMES, ZONES, type ProductDef } from "./data";
import { getSeasonalMultiplier, RAMADAN_BOOST_ZONES, RAMADAN_CATEGORIES, RAMADAN_MULTIPLIER } from "./seasonal";

const RNG_SEED = "kalyan-traders-2026";

interface GeneratedSale {
  date: string;
  retailerIdx: number;
  zoneCode: string;
  productSku: string;
  quantity: number;
  unitPrice: number;
}

interface GeneratedInventory {
  productSku: string;
  zoneCode: string;
  currentStock: number;
  batchNo: string;
  manufacturingDate: string;
  expiryDate: string;
  lastMovementDate: string;
}

const RAMADAN_START = new Date("2026-02-18");
const RAMADAN_END = new Date("2026-03-19");

function isRamadan(date: Date): boolean {
  return date >= RAMADAN_START && date <= RAMADAN_END;
}

// Velocity modifier per problem type over time
function getVelocityModifier(product: ProductDef, dayOffset: number, totalDays: number): number {
  switch (product.problemType) {
    case "dead_stock":
      // Sells normally for first 30 days, then drops to near zero
      if (dayOffset > 30) return Math.max(0.02, 1 - (dayOffset - 30) / 20);
      return 1;

    case "slow_moving":
      // Gradual decline over the 90 days -- loses ~60% velocity by end
      return Math.max(0.4, 1 - (dayOffset / totalDays) * 0.6);

    case "excess":
      // Normal velocity -- the problem is too much stock, not low sales
      return 1;

    case "near_expiry":
      // Normal velocity -- the problem is the batch is about to expire
      return 1;

    case "high_demand":
      // Accelerating demand -- 30% increase over the period
      return 1 + (dayOffset / totalDays) * 0.3;

    case "healthy":
    default:
      return 1;
  }
}

export function generateSalesHistory(
  startDate: Date,
  endDate: Date
): GeneratedSale[] {
  const rng = seedrandom(RNG_SEED);
  const sales: GeneratedSale[] = [];
  const totalDays = differenceInDays(endDate, startDate);

  for (let dayOffset = 0; dayOffset < totalDays; dayOffset++) {
    const date = addDays(startDate, dayOffset);
    const dateStr = format(date, "yyyy-MM-dd");
    const month = getMonth(date) + 1;
    const dayOfWeek = date.getDay();

    if (dayOfWeek === 0) continue;

    for (const product of PRODUCTS) {
      for (const zone of ZONES) {
        const seasonal = getSeasonalMultiplier(product.category, month);
        let dailyBase = product.avgWeeklySales / 6;

        dailyBase *= seasonal;

        if (
          isRamadan(date) &&
          RAMADAN_BOOST_ZONES.includes(zone.code) &&
          RAMADAN_CATEGORIES.includes(product.category)
        ) {
          dailyBase *= RAMADAN_MULTIPLIER;
        }

        // Scale by zone size (relative to largest zone)
        const zoneFactor = zone.retailerCount / 8;
        dailyBase *= zoneFactor;

        // Apply problem-type velocity modifier
        dailyBase *= getVelocityModifier(product, dayOffset, totalDays);

        const noise = 0.8 + rng() * 0.4;
        const quantity = Math.max(0, Math.round(dailyBase * noise));

        if (quantity <= 0) continue;

        const zoneRetailers = RETAILER_NAMES[zone.code] || [];
        if (zoneRetailers.length === 0) continue;
        const retailerIdx = Math.floor(rng() * zoneRetailers.length);

        sales.push({
          date: dateStr,
          retailerIdx,
          zoneCode: zone.code,
          productSku: product.sku,
          quantity,
          unitPrice: product.sellingPrice,
        });
      }
    }
  }

  return sales;
}

export function generateInventory(
  referenceDate: Date,
  salesHistory: GeneratedSale[]
): GeneratedInventory[] {
  const rng = seedrandom(RNG_SEED + "-inventory");
  const inventory: GeneratedInventory[] = [];

  for (const product of PRODUCTS) {
    for (const zone of ZONES) {
      const zoneSales = salesHistory.filter(
        (s) => s.productSku === product.sku && s.zoneCode === zone.code
      );
      const totalSold = zoneSales.reduce((sum, s) => sum + s.quantity, 0);
      const lastSaleDate = zoneSales.length > 0
        ? zoneSales[zoneSales.length - 1].date
        : format(subDays(referenceDate, 90), "yyyy-MM-dd");

      // Stock levels depend on problem type
      let weeksOfStock: number;
      switch (product.problemType) {
        case "dead_stock":
          weeksOfStock = 14 + rng() * 4; // 14-18 weeks -- massively over-stocked
          break;
        case "slow_moving":
          weeksOfStock = 10 + rng() * 4; // 10-14 weeks -- building up
          break;
        case "excess":
          weeksOfStock = 16 + rng() * 4; // 16-20 weeks -- over-ordered
          break;
        case "near_expiry":
          weeksOfStock = 6 + rng() * 2; // 6-8 weeks -- normal stock but batch is old
          break;
        case "high_demand":
          weeksOfStock = 1 + rng() * 1.5; // 1-2.5 weeks -- running low
          break;
        case "healthy":
        default:
          weeksOfStock = 5 + rng() * 2; // 5-7 weeks -- well managed
          break;
      }

      const zoneFactor = zone.retailerCount / 8;
      const startingStock = Math.round(product.avgWeeklySales * weeksOfStock * zoneFactor);
      let currentStock = Math.max(0, startingStock - totalSold);

      // Ensure problem types have meaningful remaining stock
      if (product.problemType === "dead_stock" || product.problemType === "excess") {
        const minStock = Math.round(startingStock * 0.25);
        currentStock = Math.max(currentStock, minStock);
      }

      // High demand: ensure stock is very low
      if (product.problemType === "high_demand") {
        currentStock = Math.min(currentStock, Math.round(product.avgWeeklySales * 0.5 * zoneFactor));
      }

      // Manufacturing and expiry dates
      const mfgDate = subDays(referenceDate, Math.round(product.shelfLifeDays * 0.6 + rng() * 30));
      const expDate = addDays(mfgDate, product.shelfLifeDays);

      let adjustedExpDate = expDate;

      // Near expiry: batch expires within 15-30 days
      if (product.problemType === "near_expiry") {
        adjustedExpDate = addDays(referenceDate, Math.round(10 + rng() * 20));
      }

      // Dead stock with some near-expiry risk too
      if (product.problemType === "dead_stock" && rng() > 0.4) {
        adjustedExpDate = addDays(referenceDate, Math.round(20 + rng() * 40));
      }

      // Adjust last movement date for dead stock
      let adjustedLastSaleDate = lastSaleDate;
      if (product.problemType === "dead_stock") {
        // Last sale was 60-90 days ago
        adjustedLastSaleDate = format(subDays(referenceDate, Math.round(60 + rng() * 30)), "yyyy-MM-dd");
      }

      inventory.push({
        productSku: product.sku,
        zoneCode: zone.code,
        currentStock,
        batchNo: `B${format(mfgDate, "yyMM")}${Math.round(rng() * 999).toString().padStart(3, "0")}`,
        manufacturingDate: format(mfgDate, "yyyy-MM-dd"),
        expiryDate: format(adjustedExpDate, "yyyy-MM-dd"),
        lastMovementDate: adjustedLastSaleDate,
      });
    }
  }

  return inventory;
}
