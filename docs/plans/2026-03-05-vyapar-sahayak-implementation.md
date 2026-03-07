# VyaparSahayak Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a full-loop AI-powered FMCG dead stock management prototype with landing page, ML pipeline, AWS Bedrock AI (text + image), and 4-screen mobile dashboard.

**Architecture:** Single Next.js 15 App Router monolith. SQLite via Prisma for data. ML pipeline in Node.js (simple-statistics, ml-kmeans, danfojs-node). AWS Bedrock for text recommendations (Claude/Nova) and image poster generation (Nova Canvas). Landing page with Aceternity UI + Framer Motion. Dashboard with shadcn/ui.

**Tech Stack:** Next.js 15, TypeScript, Prisma + SQLite, Tailwind CSS, shadcn/ui, Aceternity UI, Framer Motion, GSAP, Lenis, AWS Bedrock (@aws-sdk/client-bedrock-runtime), simple-statistics, ml-kmeans, danfojs-node, Sharp

**Design doc:** docs/plans/2026-03-05-vyapar-sahayak-prototype-design.md

---

## Phase 1: Project Foundation

### Task 1: Initialize Next.js Project

**Files:**
- Create: `vyapar-sahayak/` (new directory inside project root)

**Step 1: Scaffold Next.js app**

```bash
cd /Users/km/coding/aiforbharath
npx create-next-app@latest vyapar-sahayak --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```

Pick defaults: Yes to all.

**Step 2: Verify it runs**

```bash
cd vyapar-sahayak
npm run dev
```

Expected: App running at http://localhost:3000

**Step 3: Install core dependencies**

```bash
npm install prisma @prisma/client
npm install simple-statistics ml-kmeans danfojs-node
npm install @aws-sdk/client-bedrock-runtime
npm install sharp
npm install date-fns seedrandom
npm install -D @types/seedrandom
```

**Step 4: Install UI dependencies**

```bash
npx shadcn@latest init
```

Pick: New York style, Zinc base color, CSS variables yes.

```bash
npx shadcn@latest add button card badge separator tabs sheet dialog
npm install framer-motion
npm install @gsap/react gsap
npm install lenis
npm install recharts
```

**Step 5: Commit**

```bash
git add vyapar-sahayak/
git commit -m "feat: scaffold next.js project with all dependencies"
```

---

### Task 2: Set Up Prisma Schema

**Files:**
- Create: `vyapar-sahayak/prisma/schema.prisma`

**Step 1: Init Prisma**

```bash
cd /Users/km/coding/aiforbharath/vyapar-sahayak
npx prisma init --datasource-provider sqlite
```

**Step 2: Write the schema**

Replace `prisma/schema.prisma` with:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model Distributor {
  id                 String   @id @default(cuid())
  name               String
  ownerName          String
  partnerName        String?
  city               String
  state              String
  gstin              String
  monthlyTurnover    Float
  deadStockThreshold Int      @default(60)
  expiryHorizonDays  Int      @default(90)
  createdAt          DateTime @default(now())

  zones       Zone[]
  inventory   Inventory[]
  alerts      DeadStockAlert[]
  campaigns   Campaign[]
}

model Zone {
  id              String @id @default(cuid())
  name            String
  code            String
  distributorId   String
  retailerCount   Int
  avgOrderValue   Float
  orderFrequency  Float

  distributor Distributor @relation(fields: [distributorId], references: [id])
  retailers   Retailer[]
}

model Retailer {
  id                  String   @id @default(cuid())
  name                String
  ownerName           String
  zoneId              String
  type                String
  town                String
  whatsappNumber      String
  creditLimit         Float
  avgMonthlyPurchase  Float
  segment             String   @default("silver")
  createdAt           DateTime @default(now())

  zone         Zone              @relation(fields: [zoneId], references: [id])
  transactions SalesTransaction[]
}

model Product {
  id            String @id @default(cuid())
  sku           String @unique
  name          String
  brand         String
  company       String
  category      String
  subCategory   String
  mrp           Float
  costPrice     Float
  sellingPrice  Float
  unitSize      String
  unitsPerCase  Int
  shelfLifeDays Int

  inventory    Inventory[]
  lineItems    SalesLineItem[]
}

model Inventory {
  id              String   @id @default(cuid())
  productId       String
  distributorId   String
  zoneCode        String
  currentStock    Int
  batchNo         String
  manufacturingDate DateTime
  expiryDate      DateTime
  lastMovementDate DateTime
  deadStockScore  Float    @default(0)
  status          String   @default("active")

  product     Product     @relation(fields: [productId], references: [id])
  distributor Distributor @relation(fields: [distributorId], references: [id])
}

model SalesTransaction {
  id          String   @id @default(cuid())
  date        DateTime
  retailerId  String
  invoiceNo   String
  totalAmount Float
  paymentStatus String @default("paid")

  retailer  Retailer        @relation(fields: [retailerId], references: [id])
  lineItems SalesLineItem[]
}

model SalesLineItem {
  id            String @id @default(cuid())
  transactionId String
  productId     String
  quantity      Int
  unitPrice     Float
  discount      Float  @default(0)
  total         Float

  transaction SalesTransaction @relation(fields: [transactionId], references: [id])
  product     Product          @relation(fields: [productId], references: [id])
}

model DeadStockAlert {
  id                String   @id @default(cuid())
  distributorId     String
  productId         String
  zoneCode          String
  score             Float
  riskLevel         String
  daysSinceLastSale Int
  weeksOfCover      Float
  velocityRatio     Float
  daysToExpiry      Int
  stockValue        Float
  recommendationType String?
  recommendationJson String?
  status            String   @default("open")
  createdAt         DateTime @default(now())

  distributor Distributor @relation(fields: [distributorId], references: [id])
}

model Recommendation {
  id                String   @id @default(cuid())
  alertId           String
  type              String
  targetZone        String?
  bundleWith        String?
  discountPct       Float?
  estimatedRecovery Float
  rationale         String?
  status            String   @default("pending")
  createdAt         DateTime @default(now())

  campaign Campaign?
}

model Campaign {
  id               String   @id @default(cuid())
  recommendationId String   @unique
  distributorId    String
  productName      String
  posterUrl        String?
  posterPrompt     String?
  whatsappMessage  String?
  offerHeadline    String?
  offerDetails     String?
  targetGroups     String?
  status           String   @default("draft")
  sentAt           DateTime?
  createdAt        DateTime @default(now())

  recommendation Recommendation @relation(fields: [recommendationId], references: [id])
  distributor    Distributor    @relation(fields: [distributorId], references: [id])
}
```

**Step 3: Set DATABASE_URL**

Verify `.env` has:
```
DATABASE_URL="file:./dev.db"
```

**Step 4: Generate client and push schema**

```bash
npx prisma db push
npx prisma generate
```

Expected: SQLite DB created at `prisma/dev.db`, Prisma Client generated.

**Step 5: Create db helper**

Create `src/lib/db.ts`:

```typescript
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

**Step 6: Commit**

```bash
git add prisma/ src/lib/db.ts .env
git commit -m "feat: prisma schema with all FMCG data models"
```

---

## Phase 2: Seed Data (Tirunelveli FMCG)

### Task 3: Create FMCG Product Catalog

**Files:**
- Create: `vyapar-sahayak/src/lib/seed/data.ts`

**Step 1: Write the catalog**

```typescript
// src/lib/seed/data.ts

export const DISTRIBUTOR = {
  name: "Kalyan Traders",
  ownerName: "Kalyan",
  partnerName: "Sanjana",
  city: "Tirunelveli",
  state: "Tamil Nadu",
  gstin: "33AABCK1234F1Z5",
  monthlyTurnover: 20000000, // Rs.2 crore
  deadStockThreshold: 60,
  expiryHorizonDays: 90,
};

export const ZONES = [
  { name: "Urban Tirunelveli", code: "TN-URB", retailerCount: 65, avgOrderValue: 12000, orderFrequency: 3.5 },
  { name: "Tirunelveli Town", code: "TN-TWN", retailerCount: 55, avgOrderValue: 8500, orderFrequency: 3.0 },
  { name: "Nanguneri Rural", code: "TN-NAN", retailerCount: 40, avgOrderValue: 5500, orderFrequency: 2.0 },
  { name: "Ambasamudram", code: "TN-AMB", retailerCount: 35, avgOrderValue: 6000, orderFrequency: 2.5 },
  { name: "Cheranmahadevi", code: "TN-CHE", retailerCount: 30, avgOrderValue: 5000, orderFrequency: 2.0 },
  { name: "Sankarankovil", code: "TN-SAN", retailerCount: 25, avgOrderValue: 4500, orderFrequency: 1.5 },
];

export interface ProductDef {
  sku: string;
  name: string;
  brand: string;
  company: string;
  category: string;
  subCategory: string;
  mrp: number;
  costPrice: number;
  sellingPrice: number;
  unitSize: string;
  unitsPerCase: number;
  shelfLifeDays: number;
  avgWeeklySales: number;
  isDeadStockCandidate: boolean;
}

export const PRODUCTS: ProductDef[] = [
  // Beverages - HIGH VELOCITY
  { sku: "BEV-HOR-200", name: "Horlicks Junior 200g Refill", brand: "Horlicks", company: "HUL", category: "Health Drinks", subCategory: "Malt Based", mrp: 135, costPrice: 108, sellingPrice: 121, unitSize: "200g", unitsPerCase: 24, shelfLifeDays: 730, avgWeeklySales: 48, isDeadStockCandidate: false },
  { sku: "BEV-BST-200", name: "Boost 200g", brand: "Boost", company: "HUL", category: "Health Drinks", subCategory: "Malt Based", mrp: 115, costPrice: 92, sellingPrice: 103, unitSize: "200g", unitsPerCase: 24, shelfLifeDays: 730, avgWeeklySales: 42, isDeadStockCandidate: false },
  { sku: "BEV-COM-200", name: "Complan Chocolate 200g", brand: "Complan", company: "Zydus", category: "Health Drinks", subCategory: "Nutrition", mrp: 130, costPrice: 104, sellingPrice: 117, unitSize: "200g", unitsPerCase: 24, shelfLifeDays: 730, avgWeeklySales: 28, isDeadStockCandidate: false },
  { sku: "BEV-BRU-050", name: "Bru Instant Coffee 50g", brand: "Bru", company: "HUL", category: "Beverages", subCategory: "Coffee", mrp: 65, costPrice: 52, sellingPrice: 58, unitSize: "50g", unitsPerCase: 48, shelfLifeDays: 540, avgWeeklySales: 85, isDeadStockCandidate: false },
  { sku: "BEV-NES-050", name: "Nescafe Classic 50g", brand: "Nescafe", company: "Nestle", category: "Beverages", subCategory: "Coffee", mrp: 95, costPrice: 76, sellingPrice: 85, unitSize: "50g", unitsPerCase: 48, shelfLifeDays: 540, avgWeeklySales: 62, isDeadStockCandidate: false },
  { sku: "BEV-ARN-200", name: "Arun Badam Mix 200ml", brand: "Hatsun", company: "Hatsun Agro", category: "Beverages", subCategory: "Flavoured Milk", mrp: 45, costPrice: 36, sellingPrice: 40, unitSize: "200ml", unitsPerCase: 30, shelfLifeDays: 180, avgWeeklySales: 22, isDeadStockCandidate: false },

  // Biscuits - HIGH VELOCITY
  { sku: "BIS-MAR-250", name: "Britannia Marie Gold 250g", brand: "Britannia", company: "Britannia", category: "Biscuits", subCategory: "Marie", mrp: 30, costPrice: 24, sellingPrice: 27, unitSize: "250g", unitsPerCase: 48, shelfLifeDays: 180, avgWeeklySales: 120, isDeadStockCandidate: false },
  { sku: "BIS-PAR-200", name: "Parle-G 200g", brand: "Parle", company: "Parle", category: "Biscuits", subCategory: "Glucose", mrp: 15, costPrice: 12, sellingPrice: 13, unitSize: "200g", unitsPerCase: 96, shelfLifeDays: 180, avgWeeklySales: 200, isDeadStockCandidate: false },
  { sku: "BIS-SUN-CHO", name: "Sunfeast Dark Fantasy Chocofills", brand: "Sunfeast", company: "ITC", category: "Biscuits", subCategory: "Cream", mrp: 30, costPrice: 24, sellingPrice: 27, unitSize: "75g", unitsPerCase: 60, shelfLifeDays: 180, avgWeeklySales: 55, isDeadStockCandidate: false },
  { sku: "BIS-GDD-100", name: "Good Day Cashew 100g", brand: "Britannia", company: "Britannia", category: "Biscuits", subCategory: "Cookies", mrp: 25, costPrice: 20, sellingPrice: 22, unitSize: "100g", unitsPerCase: 72, shelfLifeDays: 180, avgWeeklySales: 78, isDeadStockCandidate: false },

  // Oils - MEDIUM VELOCITY, SEASONAL
  { sku: "OIL-IDH-1L", name: "Idhayam Sesame Oil 1L", brand: "Idhayam", company: "VVV & Sons", category: "Edible Oils", subCategory: "Sesame", mrp: 285, costPrice: 228, sellingPrice: 256, unitSize: "1L", unitsPerCase: 12, shelfLifeDays: 365, avgWeeklySales: 35, isDeadStockCandidate: false },
  { sku: "OIL-FOR-1L", name: "Fortune Sunflower Oil 1L", brand: "Fortune", company: "Adani Wilmar", category: "Edible Oils", subCategory: "Sunflower", mrp: 145, costPrice: 116, sellingPrice: 130, unitSize: "1L", unitsPerCase: 12, shelfLifeDays: 365, avgWeeklySales: 45, isDeadStockCandidate: false },
  { sku: "OIL-PAR-500", name: "Parachute Coconut Oil 500ml", brand: "Parachute", company: "Marico", category: "Personal Care", subCategory: "Hair Oil", mrp: 145, costPrice: 116, sellingPrice: 130, unitSize: "500ml", unitsPerCase: 24, shelfLifeDays: 730, avgWeeklySales: 52, isDeadStockCandidate: false },

  // Soaps / Detergents - HIGH VELOCITY
  { sku: "SOP-LIF-100", name: "Lifebuoy Bar 100g", brand: "Lifebuoy", company: "HUL", category: "Soaps", subCategory: "Bathing", mrp: 44, costPrice: 35, sellingPrice: 39, unitSize: "100g", unitsPerCase: 144, shelfLifeDays: 1095, avgWeeklySales: 95, isDeadStockCandidate: false },
  { sku: "DET-SUR-500", name: "Surf Excel 500g", brand: "Surf Excel", company: "HUL", category: "Detergents", subCategory: "Washing Powder", mrp: 92, costPrice: 74, sellingPrice: 83, unitSize: "500g", unitsPerCase: 24, shelfLifeDays: 1095, avgWeeklySales: 68, isDeadStockCandidate: false },
  { sku: "DIS-PRI-500", name: "Pril Dishwash Gel 500ml", brand: "Pril", company: "Henkel", category: "Dishwash", subCategory: "Liquid", mrp: 79, costPrice: 63, sellingPrice: 71, unitSize: "500ml", unitsPerCase: 24, shelfLifeDays: 730, avgWeeklySales: 48, isDeadStockCandidate: false },

  // Noodles / Snacks
  { sku: "NOD-MAG-070", name: "Maggi 2-Min Noodles 70g", brand: "Maggi", company: "Nestle", category: "Noodles", subCategory: "Instant", mrp: 14, costPrice: 11, sellingPrice: 12, unitSize: "70g", unitsPerCase: 96, shelfLifeDays: 180, avgWeeklySales: 180, isDeadStockCandidate: false },
  { sku: "NOD-YIP-070", name: "Yippee Mood Masala 70g", brand: "Yippee", company: "ITC", category: "Noodles", subCategory: "Instant", mrp: 14, costPrice: 11, sellingPrice: 12, unitSize: "70g", unitsPerCase: 96, shelfLifeDays: 180, avgWeeklySales: 95, isDeadStockCandidate: false },

  // Snacks
  { sku: "SNK-LAY-030", name: "Lays Classic Salted 30g", brand: "Lays", company: "PepsiCo", category: "Snacks", subCategory: "Chips", mrp: 20, costPrice: 16, sellingPrice: 18, unitSize: "30g", unitsPerCase: 60, shelfLifeDays: 120, avgWeeklySales: 110, isDeadStockCandidate: false },
  { sku: "SNK-KUR-100", name: "Kurkure Masala Munch 100g", brand: "Kurkure", company: "PepsiCo", category: "Snacks", subCategory: "Extruded", mrp: 30, costPrice: 24, sellingPrice: 27, unitSize: "100g", unitsPerCase: 48, shelfLifeDays: 120, avgWeeklySales: 75, isDeadStockCandidate: false },

  // Personal Care
  { sku: "PC-COL-100", name: "Colgate Strong Teeth 100g", brand: "Colgate", company: "Colgate-Palmolive", category: "Personal Care", subCategory: "Toothpaste", mrp: 52, costPrice: 42, sellingPrice: 47, unitSize: "100g", unitsPerCase: 96, shelfLifeDays: 730, avgWeeklySales: 88, isDeadStockCandidate: false },
  { sku: "PC-CLN-100", name: "Clinic Plus Shampoo 100ml", brand: "Clinic Plus", company: "HUL", category: "Personal Care", subCategory: "Shampoo", mrp: 62, costPrice: 50, sellingPrice: 56, unitSize: "100ml", unitsPerCase: 48, shelfLifeDays: 730, avgWeeklySales: 38, isDeadStockCandidate: false },

  // Rice / Staples
  { sku: "RIC-IND-5K", name: "India Gate Basmati 5kg", brand: "India Gate", company: "KRBL", category: "Staples", subCategory: "Rice", mrp: 520, costPrice: 416, sellingPrice: 468, unitSize: "5kg", unitsPerCase: 4, shelfLifeDays: 365, avgWeeklySales: 25, isDeadStockCandidate: false },

  // ===== DEAD STOCK CANDIDATES =====
  { sku: "BEV-ARN-1L", name: "Arun Badam Drink 1L Tetra", brand: "Hatsun", company: "Hatsun Agro", category: "Beverages", subCategory: "Flavoured Milk", mrp: 95, costPrice: 76, sellingPrice: 85, unitSize: "1L", unitsPerCase: 12, shelfLifeDays: 120, avgWeeklySales: 8, isDeadStockCandidate: true },
  { sku: "BEV-CNG-500", name: "Complan NutriGro Strawberry 500g", brand: "Complan", company: "Zydus", category: "Health Drinks", subCategory: "Nutrition", mrp: 395, costPrice: 316, sellingPrice: 355, unitSize: "500g", unitsPerCase: 12, shelfLifeDays: 730, avgWeeklySales: 4, isDeadStockCandidate: true },
  { sku: "BEV-MIL-400", name: "Milo Drink Mix 400g", brand: "Milo", company: "Nestle", category: "Health Drinks", subCategory: "Chocolate Malt", mrp: 280, costPrice: 224, sellingPrice: 252, unitSize: "400g", unitsPerCase: 12, shelfLifeDays: 730, avgWeeklySales: 6, isDeadStockCandidate: true },
  { sku: "SNK-BNG-150", name: "Bingo Tedhe Medhe 150g", brand: "Bingo", company: "ITC", category: "Snacks", subCategory: "Extruded", mrp: 30, costPrice: 24, sellingPrice: 27, unitSize: "150g", unitsPerCase: 48, shelfLifeDays: 90, avgWeeklySales: 5, isDeadStockCandidate: true },
  { sku: "BIS-NIC-300", name: "Nice Time Coconut 300g", brand: "Britannia", company: "Britannia", category: "Biscuits", subCategory: "Coconut", mrp: 40, costPrice: 32, sellingPrice: 36, unitSize: "300g", unitsPerCase: 48, shelfLifeDays: 150, avgWeeklySales: 7, isDeadStockCandidate: true },
  { sku: "BEV-TNG-500", name: "Tang Orange 500g", brand: "Tang", company: "Mondelez", category: "Beverages", subCategory: "Powder Drink", mrp: 150, costPrice: 120, sellingPrice: 135, unitSize: "500g", unitsPerCase: 24, shelfLifeDays: 365, avgWeeklySales: 3, isDeadStockCandidate: true },
  { sku: "PC-FAI-100", name: "Fair & Lovely Advanced 100g", brand: "Glow & Lovely", company: "HUL", category: "Personal Care", subCategory: "Face Cream", mrp: 175, costPrice: 140, sellingPrice: 157, unitSize: "100g", unitsPerCase: 48, shelfLifeDays: 730, avgWeeklySales: 5, isDeadStockCandidate: true },
  { sku: "DET-GHD-500", name: "Ghadi Detergent 500g", brand: "Ghadi", company: "RSPL", category: "Detergents", subCategory: "Washing Powder", mrp: 40, costPrice: 32, sellingPrice: 36, unitSize: "500g", unitsPerCase: 36, shelfLifeDays: 1095, avgWeeklySales: 10, isDeadStockCandidate: true },
];

// Retailer names grouped by zone
export const RETAILER_NAMES: Record<string, Array<{ name: string; owner: string; type: string; town: string }>> = {
  "TN-URB": [
    { name: "Sri Murugan General Stores", owner: "Murugan S", type: "kirana", town: "Palayamkottai" },
    { name: "Annapoorna Supermarket", owner: "Lakshmi R", type: "supermarket", town: "Palayamkottai" },
    { name: "Karpagam Traders", owner: "Karpagam V", type: "wholesale", town: "Palayamkottai" },
    { name: "Bharath General Stores", owner: "Bharath K", type: "kirana", town: "Palayamkottai" },
    { name: "Sri Vinayaga Traders", owner: "Vinayagam P", type: "kirana", town: "Melapalayam" },
    { name: "Rajlaxmi Provision Store", owner: "Rajesh M", type: "kirana", town: "Palayamkottai" },
    { name: "Al-Ameena Stores", owner: "Ameena B", type: "kirana", town: "Palayamkottai" },
    { name: "Bismillah Provision", owner: "Farook A", type: "kirana", town: "Palayamkottai" },
    { name: "Crescent General Stores", owner: "Ibrahim S", type: "kirana", town: "Melapalayam" },
    { name: "Thangam Supermart", owner: "Thangam N", type: "supermarket", town: "Palayamkottai" },
    { name: "Surya Medicals", owner: "Surya P", type: "medical", town: "Palayamkottai" },
    { name: "Nila Stores", owner: "Nila K", type: "kirana", town: "Palayamkottai" },
    { name: "Devi Provision", owner: "Devi S", type: "kirana", town: "Melapalayam" },
  ],
  "TN-TWN": [
    { name: "Sri Ram Kirana", owner: "Ramachandran T", type: "kirana", town: "Tirunelveli Town" },
    { name: "Fathima Traders", owner: "Fathima Z", type: "kirana", town: "Tirunelveli Town" },
    { name: "Sakthi Provision Store", owner: "Sakthi V", type: "kirana", town: "Tirunelveli Junction" },
    { name: "Mahalakshmi Stores", owner: "Mahalakshmi K", type: "kirana", town: "Tirunelveli Town" },
    { name: "Ganesh General Store", owner: "Ganesh R", type: "kirana", town: "Tirunelveli Junction" },
    { name: "Kavitha Provision", owner: "Kavitha M", type: "kirana", town: "Tirunelveli Town" },
    { name: "Daily Needs Mini Mart", owner: "Prasanna S", type: "supermarket", town: "Tirunelveli Junction" },
    { name: "Senthil Traders", owner: "Senthil K", type: "wholesale", town: "Tirunelveli Town" },
    { name: "Abirami Medicals", owner: "Abirami V", type: "medical", town: "Tirunelveli Junction" },
    { name: "Ponni Stores", owner: "Ponni R", type: "kirana", town: "Tirunelveli Town" },
    { name: "Kumaran General", owner: "Kumaran P", type: "kirana", town: "Tirunelveli Town" },
  ],
  "TN-NAN": [
    { name: "Selvam Stores", owner: "Selvam M", type: "kirana", town: "Nanguneri" },
    { name: "Mariappan General", owner: "Mariappan K", type: "kirana", town: "Nanguneri" },
    { name: "Murugesan Provision", owner: "Murugesan R", type: "kirana", town: "Nanguneri" },
    { name: "Chellaswamy Traders", owner: "Chellaswamy S", type: "kirana", town: "Nanguneri" },
    { name: "Pandi Kirana", owner: "Pandian V", type: "kirana", town: "Nanguneri" },
    { name: "Ayyasamy Stores", owner: "Ayyasamy T", type: "kirana", town: "Nanguneri" },
    { name: "Valli Provision", owner: "Valli K", type: "petty", town: "Nanguneri" },
    { name: "Karuppan General", owner: "Karuppan M", type: "kirana", town: "Nanguneri" },
  ],
  "TN-AMB": [
    { name: "Meenakshi Stores", owner: "Meenakshi S", type: "kirana", town: "Ambasamudram" },
    { name: "Palani Provision", owner: "Palani R", type: "kirana", town: "Ambasamudram" },
    { name: "Velusamy General", owner: "Velusamy K", type: "kirana", town: "Ambasamudram" },
    { name: "Kamala Traders", owner: "Kamala V", type: "wholesale", town: "Ambasamudram" },
    { name: "Arumugam Stores", owner: "Arumugam P", type: "kirana", town: "Ambasamudram" },
    { name: "Super Savings Store", owner: "Karthik M", type: "supermarket", town: "Ambasamudram" },
    { name: "Sangeetha Provision", owner: "Sangeetha R", type: "kirana", town: "Ambasamudram" },
  ],
  "TN-CHE": [
    { name: "Ramasamy General", owner: "Ramasamy K", type: "kirana", town: "Cheranmahadevi" },
    { name: "Subbulakshmi Stores", owner: "Subbulakshmi P", type: "kirana", town: "Cheranmahadevi" },
    { name: "Kannan Provision", owner: "Kannan M", type: "kirana", town: "Cheranmahadevi" },
    { name: "Thamarai General", owner: "Thamarai S", type: "petty", town: "Cheranmahadevi" },
    { name: "Jeyaram Traders", owner: "Jeyaram V", type: "kirana", town: "Cheranmahadevi" },
    { name: "Family Needs Center", owner: "Priya K", type: "supermarket", town: "Cheranmahadevi" },
  ],
  "TN-SAN": [
    { name: "Velmurugan Stores", owner: "Velmurugan S", type: "kirana", town: "Sankarankovil" },
    { name: "Pazhani General", owner: "Pazhanisamy R", type: "kirana", town: "Sankarankovil" },
    { name: "Kamatchi Provision", owner: "Kamatchi K", type: "kirana", town: "Sankarankovil" },
    { name: "Munusamy Traders", owner: "Munusamy V", type: "wholesale", town: "Sankarankovil" },
    { name: "Chitra Stores", owner: "Chitra M", type: "petty", town: "Sankarankovil" },
  ],
};
```

**Step 2: Commit**

```bash
git add src/lib/seed/data.ts
git commit -m "feat: tirunelveli FMCG product catalog and retailer data"
```

---

### Task 4: Create Seasonal Indices

**Files:**
- Create: `vyapar-sahayak/src/lib/seed/seasonal.ts`

**Step 1: Write seasonal data**

```typescript
// src/lib/seed/seasonal.ts

// Monthly multipliers for Tamil Nadu FMCG (base = 1.0)
// Month index: 1 = January, 12 = December
export const SEASONAL_INDEX: Record<string, Record<number, number>> = {
  "Beverages": {
    1: 0.9, 2: 0.85, 3: 1.1, 4: 1.35, 5: 1.4, 6: 1.15,
    7: 0.9, 8: 0.85, 9: 0.9, 10: 1.2, 11: 1.45, 12: 0.95,
  },
  "Health Drinks": {
    1: 0.9, 2: 1.0, 3: 1.0, 4: 0.7, 5: 0.7, 6: 1.1,
    7: 1.15, 8: 1.1, 9: 1.05, 10: 1.0, 11: 0.9, 12: 0.85,
  },
  "Biscuits": {
    1: 1.15, 2: 0.9, 3: 0.95, 4: 0.9, 5: 0.85, 6: 0.9,
    7: 1.0, 8: 1.05, 9: 1.1, 10: 1.2, 11: 1.4, 12: 1.1,
  },
  "Edible Oils": {
    1: 1.3, 2: 1.0, 3: 0.9, 4: 0.85, 5: 0.85, 6: 0.9,
    7: 1.0, 8: 1.05, 9: 1.1, 10: 1.3, 11: 1.5, 12: 1.1,
  },
  "Soaps": {
    1: 1.0, 2: 1.0, 3: 1.05, 4: 1.1, 5: 1.15, 6: 1.1,
    7: 1.0, 8: 1.0, 9: 0.95, 10: 1.1, 11: 1.2, 12: 1.0,
  },
  "Detergents": {
    1: 1.0, 2: 0.95, 3: 1.0, 4: 1.05, 5: 1.1, 6: 1.05,
    7: 1.0, 8: 1.0, 9: 0.95, 10: 1.1, 11: 1.15, 12: 1.0,
  },
  "Noodles": {
    1: 1.0, 2: 0.95, 3: 0.9, 4: 0.85, 5: 0.8, 6: 0.95,
    7: 1.1, 8: 1.15, 9: 1.1, 10: 1.05, 11: 1.2, 12: 1.15,
  },
  "Snacks": {
    1: 1.1, 2: 1.0, 3: 1.05, 4: 1.1, 5: 1.15, 6: 0.95,
    7: 0.9, 8: 0.95, 9: 1.0, 10: 1.15, 11: 1.35, 12: 1.1,
  },
  "Personal Care": {
    1: 1.0, 2: 1.0, 3: 1.05, 4: 1.1, 5: 1.1, 6: 1.05,
    7: 1.0, 8: 1.0, 9: 0.95, 10: 1.05, 11: 1.15, 12: 1.0,
  },
  "Dishwash": {
    1: 1.0, 2: 1.0, 3: 1.0, 4: 1.0, 5: 1.0, 6: 1.0,
    7: 1.0, 8: 1.0, 9: 1.0, 10: 1.05, 11: 1.1, 12: 1.0,
  },
  "Staples": {
    1: 1.2, 2: 1.0, 3: 0.95, 4: 0.9, 5: 0.9, 6: 1.0,
    7: 1.0, 8: 1.05, 9: 1.1, 10: 1.2, 11: 1.3, 12: 1.05,
  },
};

// Ramadan zone boost for Palayamkottai area (TN-URB zone)
// Feb 18 - Mar 19 in 2026
export const RAMADAN_BOOST_ZONES = ["TN-URB"];
export const RAMADAN_CATEGORIES = ["Beverages", "Snacks", "Edible Oils", "Staples"];
export const RAMADAN_MULTIPLIER = 1.45;

export function getSeasonalMultiplier(category: string, month: number): number {
  const catIndex = SEASONAL_INDEX[category];
  if (!catIndex) return 1.0;
  return catIndex[month] ?? 1.0;
}
```

**Step 2: Commit**

```bash
git add src/lib/seed/seasonal.ts
git commit -m "feat: tamil nadu seasonal indices with ramadan + pongal patterns"
```

---

### Task 5: Create Sales History Generator

**Files:**
- Create: `vyapar-sahayak/src/lib/seed/generate.ts`

**Step 1: Write the generator**

```typescript
// src/lib/seed/generate.ts

import seedrandom from "seedrandom";
import { addDays, subDays, format, getMonth, differenceInDays } from "date-fns";
import { PRODUCTS, RETAILER_NAMES, ZONES, type ProductDef } from "./data";
import { getSeasonalMultiplier, RAMADAN_BOOST_ZONES, RAMADAN_CATEGORIES, RAMADAN_MULTIPLIER } from "./seasonal";

const RNG_SEED = "kalyan-traders-2026";

interface GeneratedSale {
  date: string; // ISO date
  retailerIdx: number; // index into zone retailers
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

// Ramadan 2026: Feb 18 - Mar 19
const RAMADAN_START = new Date("2026-02-18");
const RAMADAN_END = new Date("2026-03-19");

function isRamadan(date: Date): boolean {
  return date >= RAMADAN_START && date <= RAMADAN_END;
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
    const month = getMonth(date) + 1; // 1-indexed
    const dayOfWeek = date.getDay();

    // Skip Sundays (many kiranas closed)
    if (dayOfWeek === 0) continue;

    for (const product of PRODUCTS) {
      for (const zone of ZONES) {
        const seasonal = getSeasonalMultiplier(product.category, month);
        let dailyBase = product.avgWeeklySales / 6; // 6 working days

        // Apply seasonal
        dailyBase *= seasonal;

        // Ramadan boost for specific zones
        if (
          isRamadan(date) &&
          RAMADAN_BOOST_ZONES.includes(zone.code) &&
          RAMADAN_CATEGORIES.includes(product.category)
        ) {
          dailyBase *= RAMADAN_MULTIPLIER;
        }

        // Zone size factor (larger zones sell more)
        const zoneFactor = zone.retailerCount / 65; // normalize to largest zone
        dailyBase *= zoneFactor;

        // Dead stock simulation: candidates stop selling after ~40 days
        if (product.isDeadStockCandidate && dayOffset > 40) {
          // Dramatic velocity drop
          dailyBase *= Math.max(0.05, 1 - (dayOffset - 40) / 30);
        }

        // Random noise (+-20%)
        const noise = 0.8 + rng() * 0.4;
        const quantity = Math.max(0, Math.round(dailyBase * noise));

        if (quantity <= 0) continue;

        // Distribute across retailers in this zone
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
      // Calculate total sold in this zone
      const zoneSales = salesHistory.filter(
        (s) => s.productSku === product.sku && s.zoneCode === zone.code
      );
      const totalSold = zoneSales.reduce((sum, s) => sum + s.quantity, 0);
      const lastSaleDate = zoneSales.length > 0
        ? zoneSales[zoneSales.length - 1].date
        : format(subDays(referenceDate, 90), "yyyy-MM-dd");

      // Starting stock was enough for ~6 weeks
      const startingStock = Math.round(product.avgWeeklySales * 6 * (zone.retailerCount / 65));
      let currentStock = Math.max(0, startingStock - totalSold);

      // Dead stock candidates: inflate remaining stock
      if (product.isDeadStockCandidate) {
        currentStock = Math.round(currentStock * (1.5 + rng() * 1.5));
      }

      const mfgDate = subDays(referenceDate, Math.round(product.shelfLifeDays * 0.6 + rng() * 30));
      const expDate = addDays(mfgDate, product.shelfLifeDays);

      // For dead stock candidates, make some batches near expiry
      let adjustedExpDate = expDate;
      if (product.isDeadStockCandidate && rng() > 0.4) {
        adjustedExpDate = addDays(referenceDate, Math.round(15 + rng() * 45));
      }

      inventory.push({
        productSku: product.sku,
        zoneCode: zone.code,
        currentStock,
        batchNo: `B${format(mfgDate, "yyMM")}${Math.round(rng() * 999).toString().padStart(3, "0")}`,
        manufacturingDate: format(mfgDate, "yyyy-MM-dd"),
        expiryDate: format(adjustedExpDate, "yyyy-MM-dd"),
        lastMovementDate: lastSaleDate,
      });
    }
  }

  return inventory;
}
```

**Step 2: Commit**

```bash
git add src/lib/seed/generate.ts
git commit -m "feat: synthetic sales history generator with dead stock patterns"
```

---

### Task 6: Create Seed API Route

**Files:**
- Create: `vyapar-sahayak/src/app/api/seed/route.ts`

**Step 1: Write the seed endpoint**

```typescript
// src/app/api/seed/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { DISTRIBUTOR, ZONES, PRODUCTS, RETAILER_NAMES } from "@/lib/seed/data";
import { generateSalesHistory, generateInventory } from "@/lib/seed/generate";
import { subDays } from "date-fns";

export async function POST() {
  try {
    // Clear existing data
    await prisma.salesLineItem.deleteMany();
    await prisma.salesTransaction.deleteMany();
    await prisma.campaign.deleteMany();
    await prisma.recommendation.deleteMany();
    await prisma.deadStockAlert.deleteMany();
    await prisma.inventory.deleteMany();
    await prisma.retailer.deleteMany();
    await prisma.zone.deleteMany();
    await prisma.product.deleteMany();
    await prisma.distributor.deleteMany();

    // Create distributor
    const dist = await prisma.distributor.create({ data: DISTRIBUTOR });

    // Create zones
    const zoneRecords: Record<string, string> = {};
    for (const z of ZONES) {
      const zone = await prisma.zone.create({
        data: { ...z, distributorId: dist.id },
      });
      zoneRecords[z.code] = zone.id;
    }

    // Create retailers
    const retailerMap: Record<string, string[]> = {};
    for (const [zoneCode, retailers] of Object.entries(RETAILER_NAMES)) {
      retailerMap[zoneCode] = [];
      const zoneId = zoneRecords[zoneCode];
      if (!zoneId) continue;

      for (const r of retailers) {
        const retailer = await prisma.retailer.create({
          data: {
            name: r.name,
            ownerName: r.owner,
            zoneId,
            type: r.type,
            town: r.town,
            whatsappNumber: `+9198${Math.floor(10000000 + Math.random() * 89999999)}`,
            creditLimit: r.type === "wholesale" ? 200000 : r.type === "supermarket" ? 100000 : 50000,
            avgMonthlyPurchase: r.type === "wholesale" ? 150000 : r.type === "supermarket" ? 80000 : 25000,
            segment: r.type === "wholesale" ? "platinum" : r.type === "supermarket" ? "gold" : "silver",
          },
        });
        retailerMap[zoneCode].push(retailer.id);
      }
    }

    // Create products
    const productMap: Record<string, string> = {};
    for (const p of PRODUCTS) {
      const product = await prisma.product.create({
        data: {
          sku: p.sku,
          name: p.name,
          brand: p.brand,
          company: p.company,
          category: p.category,
          subCategory: p.subCategory,
          mrp: p.mrp,
          costPrice: p.costPrice,
          sellingPrice: p.sellingPrice,
          unitSize: p.unitSize,
          unitsPerCase: p.unitsPerCase,
          shelfLifeDays: p.shelfLifeDays,
        },
      });
      productMap[p.sku] = product.id;
    }

    // Generate 90 days of sales history
    const today = new Date();
    const startDate = subDays(today, 90);
    const salesData = generateSalesHistory(startDate, today);

    // Batch insert sales (group by day+retailer for transactions)
    const txnGroups = new Map<string, typeof salesData>();
    for (const sale of salesData) {
      const key = `${sale.date}-${sale.zoneCode}-${sale.retailerIdx}`;
      if (!txnGroups.has(key)) txnGroups.set(key, []);
      txnGroups.get(key)!.push(sale);
    }

    let invoiceCounter = 1;
    for (const [, items] of txnGroups) {
      const first = items[0];
      const retailerIds = retailerMap[first.zoneCode] || [];
      if (retailerIds.length === 0) continue;
      const retailerId = retailerIds[first.retailerIdx % retailerIds.length];

      const total = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);

      await prisma.salesTransaction.create({
        data: {
          date: new Date(first.date),
          retailerId,
          invoiceNo: `KT-${invoiceCounter++}`,
          totalAmount: total,
          paymentStatus: Math.random() > 0.1 ? "paid" : "pending",
          lineItems: {
            create: items.map((item) => ({
              productId: productMap[item.productSku],
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              discount: 0,
              total: item.quantity * item.unitPrice,
            })),
          },
        },
      });
    }

    // Generate inventory
    const inventoryData = generateInventory(today, salesData);
    for (const inv of inventoryData) {
      await prisma.inventory.create({
        data: {
          productId: productMap[inv.productSku],
          distributorId: dist.id,
          zoneCode: inv.zoneCode,
          currentStock: inv.currentStock,
          batchNo: inv.batchNo,
          manufacturingDate: new Date(inv.manufacturingDate),
          expiryDate: new Date(inv.expiryDate),
          lastMovementDate: new Date(inv.lastMovementDate),
          status: "active",
        },
      });
    }

    const stats = {
      distributor: dist.name,
      zones: ZONES.length,
      retailers: Object.values(RETAILER_NAMES).flat().length,
      products: PRODUCTS.length,
      salesTransactions: txnGroups.size,
      inventoryRecords: inventoryData.length,
    };

    return NextResponse.json({ success: true, stats });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
```

**Step 2: Test the seed**

```bash
cd /Users/km/coding/aiforbharath/vyapar-sahayak
npm run dev
# In another terminal:
curl -X POST http://localhost:3000/api/seed
```

Expected: JSON with stats showing ~60 retailers, 30 products, thousands of sales.

**Step 3: Commit**

```bash
git add src/app/api/seed/route.ts
git commit -m "feat: seed API route populates tirunelveli FMCG data"
```

---

## Phase 3: ML Pipeline

### Task 7: Feature Engineering

**Files:**
- Create: `vyapar-sahayak/src/lib/ml/features.ts`

**Step 1: Write feature extraction**

```typescript
// src/lib/ml/features.ts

import { prisma } from "@/lib/db";
import { differenceInDays } from "date-fns";
import { getSeasonalMultiplier } from "@/lib/seed/seasonal";

export interface SKUFeatures {
  inventoryId: string;
  productId: string;
  productName: string;
  brand: string;
  category: string;
  sku: string;
  zoneCode: string;

  // Velocity
  daysSinceLastSale: number;
  avgDailySalesLast30d: number;
  avgDailySalesLast90d: number;
  velocityRatio: number;
  velocityTrend: number;

  // Stock
  currentStock: number;
  currentStockValue: number;
  weeksOfCover: number;

  // Expiry
  daysToExpiry: number;
  hasExpiry: boolean;
  expiryUrgency: number;

  // Seasonal
  seasonalIndex: number;
  nextMonthSeasonalIndex: number;

  // Retailer
  activeRetailerCount: number;
  totalRetailerCount: number;
  retailerPenetration: number;

  // Returns
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
  });

  const zones = await prisma.zone.findMany({ where: { distributorId } });
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

    // Sales in last 30 days
    const sales30d = allSales.filter(
      (li) => li.transaction.date >= thirtyDaysAgo
    );
    const totalQty30d = sales30d.reduce((s, li) => s + li.quantity, 0);
    const avgDaily30d = totalQty30d / 30;

    // Sales in last 90 days
    const sales90d = allSales.filter(
      (li) => li.transaction.date >= ninetyDaysAgo
    );
    const totalQty90d = sales90d.reduce((s, li) => s + li.quantity, 0);
    const avgDaily90d = totalQty90d / 90;

    // Velocity ratio
    const velocityRatio = avgDaily90d > 0 ? avgDaily30d / avgDaily90d : 0;

    // Simple velocity trend (compare week-over-week)
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

    // Last sale date
    const sortedSales = allSales
      .map((li) => li.transaction.date)
      .sort((a, b) => b.getTime() - a.getTime());
    const lastSaleDate = sortedSales[0] || ninetyDaysAgo;
    const daysSinceLastSale = differenceInDays(today, lastSaleDate);

    // Stock metrics
    const avgWeeklySales = avgDaily30d * 7;
    const weeksOfCover = avgWeeklySales > 0 ? inv.currentStock / avgWeeklySales : 99;

    // Expiry
    const daysToExpiry = differenceInDays(inv.expiryDate, today);
    const expiryUrgency = daysToExpiry < 60 ? Math.max(0, 1 - daysToExpiry / 60) : 0;

    // Seasonal
    const seasonalIndex = getSeasonalMultiplier(product.category, currentMonth);
    const nextMonthSeasonalIndex = getSeasonalMultiplier(product.category, nextMonth);

    // Active retailers (bought in last 60d)
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

      returnRate: 0, // placeholder for prototype
    });
  }

  return features;
}
```

**Step 2: Commit**

```bash
git add src/lib/ml/features.ts
git commit -m "feat: ML feature engineering for dead stock detection"
```

---

### Task 8: Dead Stock Scoring

**Files:**
- Create: `vyapar-sahayak/src/lib/ml/scoring.ts`

**Step 1: Write scoring engine**

```typescript
// src/lib/ml/scoring.ts

import type { SKUFeatures } from "./features";

export interface ScoredSKU extends SKUFeatures {
  deadStockScore: number;
  riskLevel: "high" | "medium" | "watch" | "healthy";
  signals: {
    idleness: number;
    velocityDecline: number;
    overstock: number;
    expiry: number;
    seasonalRisk: number;
    returns: number;
  };
}

const WEIGHTS = {
  idleness: 0.28,
  velocityDecline: 0.22,
  overstock: 0.20,
  expiry: 0.18,
  seasonalRisk: 0.08,
  returns: 0.04,
};

export function scoreDeadStock(features: SKUFeatures[]): ScoredSKU[] {
  return features.map((f) => {
    const signals = {
      idleness: Math.min(f.daysSinceLastSale / 90, 1.0),
      velocityDecline: f.velocityRatio < 0.5
        ? (0.5 - f.velocityRatio) / 0.5
        : 0,
      overstock: Math.min(Math.max(f.weeksOfCover - 4, 0) / 4, 1.0),
      expiry: f.hasExpiry ? Math.max(0, 1 - f.daysToExpiry / 60) : 0,
      seasonalRisk: f.seasonalIndex < 0.9 ? 0.3 : 0,
      returns: Math.min(f.returnRate / 0.10, 1.0),
    };

    const score = Object.entries(WEIGHTS).reduce(
      (sum, [key, w]) => sum + w * signals[key as keyof typeof signals],
      0
    );

    let riskLevel: ScoredSKU["riskLevel"];
    if (score >= 0.7) riskLevel = "high";
    else if (score >= 0.4) riskLevel = "medium";
    else if (score >= 0.2) riskLevel = "watch";
    else riskLevel = "healthy";

    return { ...f, deadStockScore: Math.round(score * 100) / 100, riskLevel, signals };
  });
}
```

**Step 2: Commit**

```bash
git add src/lib/ml/scoring.ts
git commit -m "feat: weighted dead stock scoring engine"
```

---

### Task 9: Forecasting + Clustering

**Files:**
- Create: `vyapar-sahayak/src/lib/ml/forecasting.ts`
- Create: `vyapar-sahayak/src/lib/ml/clustering.ts`

**Step 1: Write forecasting**

```typescript
// src/lib/ml/forecasting.ts

import * as ss from "simple-statistics";

export interface ForecastPoint {
  week: number;
  actual?: number;
  forecast: number;
  trend: number;
}

// Exponential smoothing (simple)
export function exponentialSmoothing(
  data: number[],
  alpha: number = 0.3
): number[] {
  if (data.length === 0) return [];
  const smoothed = [data[0]];
  for (let i = 1; i < data.length; i++) {
    smoothed.push(alpha * data[i] + (1 - alpha) * smoothed[i - 1]);
  }
  return smoothed;
}

// Compute rolling velocity with trend
export function computeRollingVelocity(
  weeklySales: number[],
  windowSize: number = 4
): Array<{ velocity: number; trend: number }> {
  if (weeklySales.length < windowSize) return [];

  return weeklySales.slice(windowSize - 1).map((_, i) => {
    const window = weeklySales.slice(i, i + windowSize);
    const velocity = ss.mean(window);
    const points: [number, number][] = window.map((v, x) => [x, v]);
    const regression = ss.linearRegression(points);
    return { velocity, trend: regression.m };
  });
}

// Forecast next N weeks
export function forecastDemand(
  weeklySales: number[],
  weeksAhead: number = 4
): ForecastPoint[] {
  if (weeklySales.length < 4) {
    return Array.from({ length: weeksAhead }, (_, i) => ({
      week: weeklySales.length + i,
      forecast: weeklySales.length > 0 ? ss.mean(weeklySales) : 0,
      trend: 0,
    }));
  }

  const smoothed = exponentialSmoothing(weeklySales, 0.3);
  const lastSmoothed = smoothed[smoothed.length - 1];

  // Trend from last 8 weeks
  const recentWeeks = Math.min(8, weeklySales.length);
  const recent = weeklySales.slice(-recentWeeks);
  const points: [number, number][] = recent.map((v, x) => [x, v]);
  const regression = ss.linearRegression(points);
  const trendPerWeek = regression.m;

  const forecasts: ForecastPoint[] = [];
  for (let i = 0; i < weeksAhead; i++) {
    forecasts.push({
      week: weeklySales.length + i,
      forecast: Math.max(0, Math.round(lastSmoothed + trendPerWeek * (i + 1))),
      trend: trendPerWeek,
    });
  }

  return forecasts;
}
```

**Step 2: Write clustering**

```typescript
// src/lib/ml/clustering.ts

import kmeans from "ml-kmeans";

export interface RetailerProfile {
  retailerId: string;
  name: string;
  zoneCode: string;
  purchaseFrequency: number;
  avgOrderValue: number;
  categoryDiversity: number;
  totalPurchaseValue: number;
}

export interface ClusteredRetailer extends RetailerProfile {
  segment: "platinum" | "gold" | "silver" | "new";
  clusterId: number;
}

const SEGMENT_LABELS: Record<number, ClusteredRetailer["segment"]> = {
  0: "platinum",
  1: "gold",
  2: "silver",
  3: "new",
};

export function clusterRetailers(
  profiles: RetailerProfile[]
): ClusteredRetailer[] {
  if (profiles.length < 4) {
    return profiles.map((p) => ({ ...p, segment: "silver", clusterId: 2 }));
  }

  // Normalize features
  const features = profiles.map((p) => [
    p.purchaseFrequency,
    p.avgOrderValue / 1000, // scale down
    p.categoryDiversity,
    p.totalPurchaseValue / 10000, // scale down
  ]);

  const result = kmeans(features, 4, {
    initialization: "kmeans++",
    maxIterations: 100,
  });

  // Sort clusters by centroid magnitude to assign labels
  const centroidMagnitudes = result.centroids.map((c, i) => ({
    idx: i,
    magnitude: c.reduce((s, v) => s + v, 0),
  }));
  centroidMagnitudes.sort((a, b) => b.magnitude - a.magnitude);

  const clusterToSegment: Record<number, ClusteredRetailer["segment"]> = {};
  centroidMagnitudes.forEach((c, rank) => {
    clusterToSegment[c.idx] = SEGMENT_LABELS[rank] || "silver";
  });

  return profiles.map((p, i) => ({
    ...p,
    clusterId: result.clusters[i],
    segment: clusterToSegment[result.clusters[i]],
  }));
}
```

**Step 3: Commit**

```bash
git add src/lib/ml/forecasting.ts src/lib/ml/clustering.ts
git commit -m "feat: demand forecasting + retailer clustering"
```

---

### Task 10: Recommendation Engine

**Files:**
- Create: `vyapar-sahayak/src/lib/ml/recommendations.ts`

**Step 1: Write recommendation logic**

```typescript
// src/lib/ml/recommendations.ts

import type { ScoredSKU } from "./scoring";

export interface RecommendationResult {
  type: "reallocate" | "bundle" | "price_off" | "monitor";
  targetZone?: string;
  bundleWithSku?: string;
  bundleWithName?: string;
  discountPct?: number;
  estimatedRecovery: number;
  rationale: string;
  urgency: "immediate" | "this_week" | "this_month";
}

export function generateRecommendation(
  sku: ScoredSKU,
  allScoredSkus: ScoredSKU[]
): RecommendationResult {
  // Near expiry + high stock value -> reallocate urgently
  if (sku.daysToExpiry < 30 && sku.currentStockValue > 20000) {
    // Find zone where this category sells best
    const sameCategoryOtherZones = allScoredSkus.filter(
      (s) =>
        s.category === sku.category &&
        s.zoneCode !== sku.zoneCode &&
        s.velocityRatio > 0.8
    );
    const bestZone = sameCategoryOtherZones.sort(
      (a, b) => b.avgDailySalesLast30d - a.avgDailySalesLast30d
    )[0];

    return {
      type: "reallocate",
      targetZone: bestZone?.zoneCode || "TN-URB",
      estimatedRecovery: Math.round(sku.currentStockValue * 0.75),
      rationale: `${sku.productName} expires in ${sku.daysToExpiry} days with Rs.${Math.round(sku.currentStockValue).toLocaleString("en-IN")} worth of stock. Reallocate to ${bestZone?.zoneCode || "Urban Tirunelveli"} where ${sku.category} demand is stronger.`,
      urgency: "immediate",
    };
  }

  // Low velocity + long shelf life -> bundle with fast-mover
  if (sku.velocityRatio < 0.4 && sku.daysToExpiry > 60) {
    const fastMovers = allScoredSkus.filter(
      (s) =>
        s.category === sku.category &&
        s.riskLevel === "healthy" &&
        s.avgDailySalesLast30d > 5
    );
    const bestBundle = fastMovers.sort(
      (a, b) => b.avgDailySalesLast30d - a.avgDailySalesLast30d
    )[0];

    return {
      type: "bundle",
      bundleWithSku: bestBundle?.sku,
      bundleWithName: bestBundle?.productName,
      discountPct: 20,
      estimatedRecovery: Math.round(sku.currentStockValue * 0.85),
      rationale: `${sku.productName} velocity dropped to ${Math.round(sku.velocityRatio * 100)}% of baseline. Bundle with ${bestBundle?.productName || "a fast-mover"} at 20% combo discount to move stock.`,
      urgency: "this_week",
    };
  }

  // Seasonal recovery coming -> monitor
  if (sku.seasonalIndex < 0.9 && sku.nextMonthSeasonalIndex > 1.1) {
    return {
      type: "monitor",
      estimatedRecovery: Math.round(sku.currentStockValue * 0.95),
      rationale: `${sku.productName} is in off-season (index ${sku.seasonalIndex}). Next month picks up to ${sku.nextMonthSeasonalIndex}. Hold and monitor -- seasonal recovery expected.`,
      urgency: "this_month",
    };
  }

  // Default -> price off
  return {
    type: "price_off",
    discountPct: 15,
    estimatedRecovery: Math.round(sku.currentStockValue * 0.80),
    rationale: `${sku.productName} has ${sku.currentStock} units with ${Math.round(sku.weeksOfCover)} weeks of cover. Run 15% discount campaign targeting active retailers.`,
    urgency: "this_week",
  };
}
```

**Step 2: Commit**

```bash
git add src/lib/ml/recommendations.ts
git commit -m "feat: recommendation engine with reallocate/bundle/price-off/monitor"
```

---

### Task 11: Detection API Route

**Files:**
- Create: `vyapar-sahayak/src/app/api/detect/route.ts`

**Step 1: Write the detection endpoint**

```typescript
// src/app/api/detect/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { extractFeatures } from "@/lib/ml/features";
import { scoreDeadStock } from "@/lib/ml/scoring";
import { generateRecommendation } from "@/lib/ml/recommendations";

export async function POST() {
  try {
    const distributor = await prisma.distributor.findFirst();
    if (!distributor) {
      return NextResponse.json(
        { error: "No distributor found. Run seed first." },
        { status: 400 }
      );
    }

    // Clear existing alerts
    await prisma.deadStockAlert.deleteMany({ where: { distributorId: distributor.id } });

    // Extract features and score
    const features = await extractFeatures(distributor.id);
    const scored = scoreDeadStock(features);

    // Filter to items that need attention
    const atRisk = scored.filter((s) => s.riskLevel !== "healthy");

    // Generate recommendations and save alerts
    const alerts = [];
    for (const sku of atRisk) {
      const rec = generateRecommendation(sku, scored);

      const alert = await prisma.deadStockAlert.create({
        data: {
          distributorId: distributor.id,
          productId: sku.productId,
          zoneCode: sku.zoneCode,
          score: sku.deadStockScore,
          riskLevel: sku.riskLevel,
          daysSinceLastSale: sku.daysSinceLastSale,
          weeksOfCover: sku.weeksOfCover,
          velocityRatio: sku.velocityRatio,
          daysToExpiry: sku.daysToExpiry,
          stockValue: sku.currentStockValue,
          recommendationType: rec.type,
          recommendationJson: JSON.stringify(rec),
        },
      });
      alerts.push({ ...alert, recommendation: rec });
    }

    // Summary stats
    const totalDeadStockValue = atRisk.reduce((s, a) => s + a.currentStockValue, 0);
    const highRisk = atRisk.filter((a) => a.riskLevel === "high").length;
    const mediumRisk = atRisk.filter((a) => a.riskLevel === "medium").length;

    return NextResponse.json({
      success: true,
      summary: {
        totalItems: scored.length,
        atRiskItems: atRisk.length,
        highRisk,
        mediumRisk,
        totalDeadStockValue: Math.round(totalDeadStockValue),
        totalDeadStockValueFormatted: `Rs.${(totalDeadStockValue / 100000).toFixed(1)}L`,
      },
      alerts: alerts.slice(0, 20), // top 20 for API response
    });
  } catch (error) {
    console.error("Detection error:", error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
```

**Step 2: Test**

```bash
curl -X POST http://localhost:3000/api/seed
curl -X POST http://localhost:3000/api/detect
```

Expected: JSON with dead stock alerts, high-risk items flagged, recommendations.

**Step 3: Commit**

```bash
git add src/app/api/detect/route.ts
git commit -m "feat: detection API runs full ML pipeline and saves alerts"
```

---

## Phase 4: AWS Bedrock Integration

### Task 12: Bedrock Client Wrapper

**Files:**
- Create: `vyapar-sahayak/src/lib/bedrock.ts`

**Step 1: Write the Bedrock wrapper**

```typescript
// src/lib/bedrock.ts

import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";

const client = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || "us-east-1",
});

// Text generation via Claude on Bedrock
export async function generateText(prompt: string): Promise<string> {
  const modelId = process.env.BEDROCK_TEXT_MODEL || "anthropic.claude-3-haiku-20240307-v1:0";

  const body = JSON.stringify({
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: 2048,
    messages: [{ role: "user", content: prompt }],
  });

  const response = await client.send(
    new InvokeModelCommand({
      modelId,
      body,
      contentType: "application/json",
      accept: "application/json",
    })
  );

  const decoded = JSON.parse(new TextDecoder().decode(response.body));
  return decoded.content[0].text;
}

// Image generation via Nova Canvas
export async function generateImage(
  prompt: string,
  negativePrompt?: string
): Promise<Buffer> {
  const body = JSON.stringify({
    taskType: "TEXT_IMAGE",
    textToImageParams: {
      text: prompt,
      negativeText: negativePrompt || "blurry, low quality, distorted text, watermark, dark background, cluttered",
    },
    imageGenerationConfig: {
      seed: Math.floor(Math.random() * 858993459),
      quality: "standard",
      width: 1024,
      height: 1024,
      numberOfImages: 1,
      cfgScale: 8.0,
    },
  });

  const response = await client.send(
    new InvokeModelCommand({
      modelId: "amazon.nova-canvas-v1:0",
      body,
      contentType: "application/json",
      accept: "application/json",
    })
  );

  const decoded = JSON.parse(new TextDecoder().decode(response.body));
  if (decoded.error) throw new Error(`Nova Canvas error: ${decoded.error}`);
  return Buffer.from(decoded.images[0], "base64");
}
```

**Step 2: Add env vars**

Add to `.env`:
```
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
BEDROCK_TEXT_MODEL=anthropic.claude-3-haiku-20240307-v1:0
```

**Step 3: Commit**

```bash
git add src/lib/bedrock.ts
git commit -m "feat: bedrock client wrapper for text + image generation"
```

---

### Task 13: Recommendation + Campaign API Routes

**Files:**
- Create: `vyapar-sahayak/src/app/api/recommend/[id]/route.ts`
- Create: `vyapar-sahayak/src/app/api/campaign/generate/route.ts`

**Step 1: Recommendation endpoint**

```typescript
// src/app/api/recommend/[id]/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateText } from "@/lib/bedrock";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const alert = await prisma.deadStockAlert.findUnique({ where: { id } });
    if (!alert) {
      return NextResponse.json({ error: "Alert not found" }, { status: 404 });
    }

    const mlRec = JSON.parse(alert.recommendationJson || "{}");

    const prompt = `You are an AI assistant for Indian FMCG distributors. Given this dead stock situation, provide a detailed recommendation in JSON format.

Dead stock details:
- Risk level: ${alert.riskLevel}
- Dead stock score: ${alert.score}
- Days since last sale: ${alert.daysSinceLastSale}
- Weeks of stock cover: ${alert.weeksOfCover.toFixed(1)}
- Days to expiry: ${alert.daysToExpiry}
- Stock value: Rs.${Math.round(alert.stockValue).toLocaleString("en-IN")}
- ML recommendation: ${mlRec.type} - ${mlRec.rationale}

Respond with ONLY valid JSON:
{
  "type": "${mlRec.type}",
  "headline": "short action headline",
  "detailedRationale": "2-3 sentences explaining why this action",
  "estimatedRecovery": ${mlRec.estimatedRecovery},
  "steps": ["step 1", "step 2", "step 3"],
  "risks": ["risk 1"],
  "timeframe": "X days"
}`;

    const response = await generateText(prompt);
    let recommendation;
    try {
      recommendation = JSON.parse(response);
    } catch {
      recommendation = { ...mlRec, aiResponse: response };
    }

    const rec = await prisma.recommendation.create({
      data: {
        alertId: id,
        type: recommendation.type || mlRec.type,
        targetZone: mlRec.targetZone,
        bundleWith: mlRec.bundleWithName,
        discountPct: mlRec.discountPct,
        estimatedRecovery: mlRec.estimatedRecovery,
        rationale: JSON.stringify(recommendation),
      },
    });

    return NextResponse.json({ success: true, recommendation: rec, ai: recommendation });
  } catch (error) {
    console.error("Recommend error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
```

**Step 2: Campaign generation endpoint**

```typescript
// src/app/api/campaign/generate/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateText, generateImage } from "@/lib/bedrock";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(req: Request) {
  try {
    const { recommendationId } = await req.json();
    const rec = await prisma.recommendation.findUnique({
      where: { id: recommendationId },
    });
    if (!rec) {
      return NextResponse.json({ error: "Recommendation not found" }, { status: 404 });
    }

    const alert = await prisma.deadStockAlert.findUnique({
      where: { id: rec.alertId },
    });
    if (!alert) {
      return NextResponse.json({ error: "Alert not found" }, { status: 404 });
    }

    const product = await prisma.product.findUnique({
      where: { id: alert.productId },
    });
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const distributor = await prisma.distributor.findFirst();

    // Generate WhatsApp message via Bedrock
    const textPrompt = `Generate a WhatsApp promotional message for Indian FMCG retailers. Keep it casual, direct, deal-focused. Use Hinglish style.

Product: ${product.name} (${product.brand})
MRP: Rs.${product.mrp}
Offer: ${rec.discountPct || 15}% OFF
Type: ${rec.type} campaign
Distributor: ${distributor?.name || "Kalyan Traders"}

Write ONLY the WhatsApp message (150 words max). Include a hashtag at the end.`;

    const whatsappMessage = await generateText(textPrompt);

    // Generate poster headline
    const headlinePrompt = `Write a short, punchy headline for an Indian FMCG clearance sale poster.
Product: ${product.name}
Discount: ${rec.discountPct || 15}% OFF
Style: Bold, urgent, eye-catching

Respond with ONLY JSON: {"headline": "...", "subline": "...", "offerText": "..."}`;

    const headlineResponse = await generateText(headlinePrompt);
    let posterText;
    try {
      posterText = JSON.parse(headlineResponse);
    } catch {
      posterText = { headline: "MEGA SALE!", subline: product.name, offerText: `${rec.discountPct || 15}% OFF` };
    }

    // Generate poster image via Nova Canvas
    const imagePrompt = `Vibrant Indian FMCG clearance sale promotional poster. Bold red and saffron yellow color scheme. Eye-catching retail advertisement with clean white background. Professional product display for ${product.category} items. Modern flat design style with dynamic composition. High contrast, print-ready quality. Indian retail market style.`;

    let posterUrl = "";
    try {
      const imageBuffer = await generateImage(imagePrompt);
      const postersDir = path.join(process.cwd(), "public", "posters");
      await mkdir(postersDir, { recursive: true });
      const filename = `poster-${rec.id}.png`;
      await writeFile(path.join(postersDir, filename), imageBuffer);
      posterUrl = `/posters/${filename}`;
    } catch (imgError) {
      console.error("Image generation failed:", imgError);
      posterUrl = ""; // fallback: no poster
    }

    // Save campaign
    const campaign = await prisma.campaign.create({
      data: {
        recommendationId: rec.id,
        distributorId: distributor?.id || "",
        productName: product.name,
        posterUrl,
        posterPrompt: imagePrompt,
        whatsappMessage,
        offerHeadline: posterText.headline,
        offerDetails: JSON.stringify(posterText),
        status: "draft",
      },
    });

    return NextResponse.json({
      success: true,
      campaign,
      posterText,
      whatsappMessage,
    });
  } catch (error) {
    console.error("Campaign generation error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
```

**Step 3: Commit**

```bash
git add src/app/api/recommend/ src/app/api/campaign/
git commit -m "feat: bedrock-powered recommendation + campaign generation APIs"
```

---

## Phase 5: Dashboard UI

> Tasks 14-18 build the 4 dashboard screens + layout.
> Each task creates one screen component matching the wireframes.
> Uses shadcn/ui + Tailwind CSS. Mobile-first (375px).
>
> These tasks follow the same pattern:
> Step 1: Create the component file
> Step 2: Verify it renders at localhost
> Step 3: Commit
>
> Due to length, the full JSX for all 4 screens + layout + shared components
> is omitted from this plan doc. The implementing agent should:
> - Reference wireframes at /Users/km/coding/aiforbharath/wireframes/screen1-4.html
> - Match the visual design exactly (colors, layout, spacing)
> - Use shadcn/ui Card, Badge, Button, Separator, Tabs, Sheet, Dialog
> - Use recharts for the trend chart on the home screen
> - Wire up API calls to /api/seed, /api/detect, /api/recommend, /api/campaign

### Task 14: Dashboard Layout + Bottom Nav

**Files:**
- Create: `vyapar-sahayak/src/app/demo/layout.tsx`
- Create: `vyapar-sahayak/src/components/dashboard/bottom-nav.tsx`

Build the shared dashboard layout with bottom navigation matching wireframe nav:
Home, Alerts, Campaigns, Network, More.

### Task 15: Home Dashboard Screen

**Files:**
- Create: `vyapar-sahayak/src/app/demo/page.tsx`
- Create: `vyapar-sahayak/src/components/dashboard/hero-cards.tsx`
- Create: `vyapar-sahayak/src/components/dashboard/quick-actions.tsx`
- Create: `vyapar-sahayak/src/components/dashboard/trend-chart.tsx`
- Create: `vyapar-sahayak/src/components/dashboard/ai-insight.tsx`

Reference: wireframes/screen1-home.html

### Task 16: Dead Stock Detail Screen

**Files:**
- Create: `vyapar-sahayak/src/app/demo/alerts/page.tsx`
- Create: `vyapar-sahayak/src/components/dashboard/product-card.tsx`
- Create: `vyapar-sahayak/src/components/dashboard/risk-badge.tsx`

Reference: wireframes/screen2-deadstock.html

### Task 17: AI Recommendation Screen

**Files:**
- Create: `vyapar-sahayak/src/app/demo/recommendations/[id]/page.tsx`
- Create: `vyapar-sahayak/src/components/dashboard/recommendation-card.tsx`

Reference: wireframes/screen3-recommendation.html

### Task 18: Campaign Sender Screen

**Files:**
- Create: `vyapar-sahayak/src/app/demo/campaigns/[id]/page.tsx`
- Create: `vyapar-sahayak/src/components/dashboard/campaign-preview.tsx`

Reference: wireframes/screen4-campaign.html

---

## Phase 6: Landing Page

> Tasks 19-22 build the showstopper landing page.
> Uses Aceternity UI patterns + Framer Motion + GSAP + Lenis.
> Dark theme, saffron-to-blue gradient, glassmorphic cards.

### Task 19: Landing Page Layout + Nav

**Files:**
- Create: `vyapar-sahayak/src/app/page.tsx` (replace default)
- Create: `vyapar-sahayak/src/components/landing/navbar.tsx`

Sticky glassmorphic nav: Logo | Features | Demo | [WhatsApp CTA] [Try Demo]

### Task 20: Hero + Problem + Solution Sections

**Files:**
- Create: `vyapar-sahayak/src/components/landing/hero.tsx`
- Create: `vyapar-sahayak/src/components/landing/problem-section.tsx`
- Create: `vyapar-sahayak/src/components/landing/solution-steps.tsx`

Hero: "Your dead stock is costing you crores." with animated dashboard preview.
Problem: 3 pain points animated on scroll.
Solution: 3-step flow with connecting line animation.

### Task 21: Features Bento Grid + Demo Section

**Files:**
- Create: `vyapar-sahayak/src/components/landing/bento-features.tsx`
- Create: `vyapar-sahayak/src/components/landing/demo-section.tsx`

Bento grid with varying card sizes. Demo section with "Try Live Demo" CTA linking to /demo.

### Task 22: Metrics + Pricing + Footer

**Files:**
- Create: `vyapar-sahayak/src/components/landing/metrics-section.tsx`
- Create: `vyapar-sahayak/src/components/landing/pricing.tsx`
- Create: `vyapar-sahayak/src/components/landing/footer.tsx`

Oversized numbers section. INR pricing with 3 tiers. Minimal footer with GST + WhatsApp.

---

## Phase 7: Integration + Polish

### Task 23: Wire Landing -> Demo Transition

Connect "Try Live Demo" buttons on landing page to /demo route.
Add subtle banner on /demo: "Live demo with sample data. [Start Free Trial]"
Auto-seed data on first /demo visit if DB is empty.

### Task 24: End-to-End Test

Run the full flow manually:
1. Visit landing page -> looks amazing
2. Click "Try Live Demo" -> lands on dashboard
3. Dashboard shows seeded data
4. Click "Run Detection" -> ML pipeline runs, alerts appear
5. Click into a dead stock item -> see AI suggestion
6. Click "Review Suggestion" -> Bedrock generates recommendation
7. Approve -> campaign content + poster generated
8. Preview WhatsApp message -> send (simulated)

Fix any broken links, missing data, or UI issues.

### Task 25: Final Commit

```bash
git add -A
git commit -m "feat: complete vyapar-sahayak prototype with landing + dashboard + ml + bedrock"
```

---

## Notes

- Tasks marked with full code (Phase 1-4) should be implemented exactly as written
- Tasks in Phase 5-6 (UI) reference wireframes -- the implementing agent should read those HTML files and match the visual design
- Bedrock calls will fail without AWS credentials -- test with mock responses first, then add real keys
- The seed data is deterministic (seeded RNG) so results are reproducible
- SQLite file is at prisma/dev.db -- delete it and re-seed to reset
