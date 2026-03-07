export const DISTRIBUTOR = {
  name: "Kalyan Traders",
  ownerName: "Kalyan",
  partnerName: "Sanjana",
  city: "Tirunelveli",
  state: "Tamil Nadu",
  gstin: "33AABCK1234F1Z5",
  monthlyTurnover: 20000000,
  deadStockThreshold: 60,
  expiryHorizonDays: 90,
};

export const ZONES = [
  { name: "Urban Tirunelveli", code: "TN-URB", retailerCount: 8, avgOrderValue: 12000, orderFrequency: 3.5 },
  { name: "Tirunelveli Town", code: "TN-TWN", retailerCount: 7, avgOrderValue: 8500, orderFrequency: 3.0 },
  { name: "Nanguneri Rural", code: "TN-NAN", retailerCount: 5, avgOrderValue: 5500, orderFrequency: 2.0 },
  { name: "Ambasamudram", code: "TN-AMB", retailerCount: 4, avgOrderValue: 6000, orderFrequency: 2.5 },
];

export type ProblemType = "healthy" | "dead_stock" | "slow_moving" | "excess" | "near_expiry" | "high_demand";

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
  problemType: ProblemType;
}

export const PRODUCTS: ProductDef[] = [
  // --- Healthy (5): fast-moving staples, no issues ---
  { sku: "BIS-PAR-200", name: "Parle-G 200g", brand: "Parle", company: "Parle", category: "Biscuits", subCategory: "Glucose", mrp: 15, costPrice: 12, sellingPrice: 13, unitSize: "200g", unitsPerCase: 96, shelfLifeDays: 180, avgWeeklySales: 200, problemType: "healthy" },
  { sku: "NOD-MAG-070", name: "Maggi 2-Min Noodles 70g", brand: "Maggi", company: "Nestle", category: "Noodles", subCategory: "Instant", mrp: 14, costPrice: 11, sellingPrice: 12, unitSize: "70g", unitsPerCase: 96, shelfLifeDays: 180, avgWeeklySales: 180, problemType: "healthy" },
  { sku: "SOP-LIF-100", name: "Lifebuoy Bar 100g", brand: "Lifebuoy", company: "HUL", category: "Soaps", subCategory: "Bathing", mrp: 44, costPrice: 35, sellingPrice: 39, unitSize: "100g", unitsPerCase: 144, shelfLifeDays: 1095, avgWeeklySales: 95, problemType: "healthy" },
  { sku: "BEV-BRU-050", name: "Bru Instant Coffee 50g", brand: "Bru", company: "HUL", category: "Beverages", subCategory: "Coffee", mrp: 65, costPrice: 52, sellingPrice: 58, unitSize: "50g", unitsPerCase: 48, shelfLifeDays: 540, avgWeeklySales: 85, problemType: "healthy" },
  { sku: "PC-COL-100", name: "Colgate Strong Teeth 100g", brand: "Colgate", company: "Colgate-Palmolive", category: "Personal Care", subCategory: "Toothpaste", mrp: 52, costPrice: 42, sellingPrice: 47, unitSize: "100g", unitsPerCase: 96, shelfLifeDays: 730, avgWeeklySales: 88, problemType: "healthy" },

  // --- Dead Stock (2): zero velocity for 60+ days, stuck in warehouse ---
  { sku: "BEV-TNG-500", name: "Tang Orange 500g", brand: "Tang", company: "Mondelez", category: "Beverages", subCategory: "Powder Drink", mrp: 150, costPrice: 120, sellingPrice: 135, unitSize: "500g", unitsPerCase: 24, shelfLifeDays: 365, avgWeeklySales: 3, problemType: "dead_stock" },
  { sku: "PC-FAI-100", name: "Glow & Lovely Advanced 100g", brand: "Glow & Lovely", company: "HUL", category: "Personal Care", subCategory: "Face Cream", mrp: 175, costPrice: 140, sellingPrice: 157, unitSize: "100g", unitsPerCase: 48, shelfLifeDays: 730, avgWeeklySales: 5, problemType: "dead_stock" },

  // --- Slow Moving (2): declining velocity, selling but slower each week ---
  { sku: "BEV-CNG-500", name: "Complan NutriGro 500g", brand: "Complan", company: "Zydus", category: "Health Drinks", subCategory: "Nutrition", mrp: 395, costPrice: 316, sellingPrice: 355, unitSize: "500g", unitsPerCase: 12, shelfLifeDays: 730, avgWeeklySales: 12, problemType: "slow_moving" },
  { sku: "DET-GHD-500", name: "Ghadi Detergent 500g", brand: "Ghadi", company: "RSPL", category: "Detergents", subCategory: "Washing Powder", mrp: 40, costPrice: 32, sellingPrice: 36, unitSize: "500g", unitsPerCase: 36, shelfLifeDays: 1095, avgWeeklySales: 18, problemType: "slow_moving" },

  // --- Excess Inventory (2): over-ordered, too much stock vs demand ---
  { sku: "OIL-FOR-1L", name: "Fortune Sunflower Oil 1L", brand: "Fortune", company: "Adani Wilmar", category: "Edible Oils", subCategory: "Sunflower", mrp: 145, costPrice: 116, sellingPrice: 130, unitSize: "1L", unitsPerCase: 12, shelfLifeDays: 365, avgWeeklySales: 45, problemType: "excess" },
  { sku: "DET-SUR-500", name: "Surf Excel 500g", brand: "Surf Excel", company: "HUL", category: "Detergents", subCategory: "Washing Powder", mrp: 92, costPrice: 74, sellingPrice: 83, unitSize: "500g", unitsPerCase: 24, shelfLifeDays: 1095, avgWeeklySales: 68, problemType: "excess" },

  // --- Near Expiry (2): short shelf life left, need to move fast ---
  { sku: "SNK-LAY-030", name: "Lays Classic Salted 30g", brand: "Lays", company: "PepsiCo", category: "Snacks", subCategory: "Chips", mrp: 20, costPrice: 16, sellingPrice: 18, unitSize: "30g", unitsPerCase: 60, shelfLifeDays: 120, avgWeeklySales: 110, problemType: "near_expiry" },
  { sku: "BEV-ARN-200", name: "Arun Badam Mix 200ml", brand: "Hatsun", company: "Hatsun Agro", category: "Beverages", subCategory: "Flavoured Milk", mrp: 45, costPrice: 36, sellingPrice: 40, unitSize: "200ml", unitsPerCase: 30, shelfLifeDays: 180, avgWeeklySales: 22, problemType: "near_expiry" },

  // --- High Demand / Understocked (2): selling fast, running out ---
  { sku: "BIS-MAR-250", name: "Britannia Marie Gold 250g", brand: "Britannia", company: "Britannia", category: "Biscuits", subCategory: "Marie", mrp: 30, costPrice: 24, sellingPrice: 27, unitSize: "250g", unitsPerCase: 48, shelfLifeDays: 180, avgWeeklySales: 120, problemType: "high_demand" },
  { sku: "OIL-IDH-1L", name: "Idhayam Sesame Oil 1L", brand: "Idhayam", company: "VVV & Sons", category: "Edible Oils", subCategory: "Sesame", mrp: 285, costPrice: 228, sellingPrice: 256, unitSize: "1L", unitsPerCase: 12, shelfLifeDays: 365, avgWeeklySales: 35, problemType: "high_demand" },
];

export const RETAILER_NAMES: Record<string, Array<{ name: string; owner: string; type: string; town: string }>> = {
  "TN-URB": [
    { name: "Sri Murugan General Stores", owner: "Murugan S", type: "kirana", town: "Palayamkottai" },
    { name: "Annapoorna Supermarket", owner: "Lakshmi R", type: "supermarket", town: "Palayamkottai" },
    { name: "Karpagam Traders", owner: "Karpagam V", type: "wholesale", town: "Palayamkottai" },
    { name: "Bharath General Stores", owner: "Bharath K", type: "kirana", town: "Palayamkottai" },
    { name: "Sri Vinayaga Traders", owner: "Vinayagam P", type: "kirana", town: "Melapalayam" },
    { name: "Rajlaxmi Provision Store", owner: "Rajesh M", type: "kirana", town: "Palayamkottai" },
    { name: "Al-Ameena Stores", owner: "Ameena B", type: "kirana", town: "Palayamkottai" },
    { name: "Thangam Supermart", owner: "Thangam N", type: "supermarket", town: "Palayamkottai" },
  ],
  "TN-TWN": [
    { name: "Sri Ram Kirana", owner: "Ramachandran T", type: "kirana", town: "Tirunelveli Town" },
    { name: "Fathima Traders", owner: "Fathima Z", type: "kirana", town: "Tirunelveli Town" },
    { name: "Sakthi Provision Store", owner: "Sakthi V", type: "kirana", town: "Tirunelveli Junction" },
    { name: "Mahalakshmi Stores", owner: "Mahalakshmi K", type: "kirana", town: "Tirunelveli Town" },
    { name: "Ganesh General Store", owner: "Ganesh R", type: "kirana", town: "Tirunelveli Junction" },
    { name: "Daily Needs Mini Mart", owner: "Prasanna S", type: "supermarket", town: "Tirunelveli Junction" },
    { name: "Senthil Traders", owner: "Senthil K", type: "wholesale", town: "Tirunelveli Town" },
  ],
  "TN-NAN": [
    { name: "Selvam Stores", owner: "Selvam M", type: "kirana", town: "Nanguneri" },
    { name: "Mariappan General", owner: "Mariappan K", type: "kirana", town: "Nanguneri" },
    { name: "Murugesan Provision", owner: "Murugesan R", type: "kirana", town: "Nanguneri" },
    { name: "Chellaswamy Traders", owner: "Chellaswamy S", type: "kirana", town: "Nanguneri" },
    { name: "Pandi Kirana", owner: "Pandian V", type: "kirana", town: "Nanguneri" },
  ],
  "TN-AMB": [
    { name: "Meenakshi Stores", owner: "Meenakshi S", type: "kirana", town: "Ambasamudram" },
    { name: "Palani Provision", owner: "Palani R", type: "kirana", town: "Ambasamudram" },
    { name: "Velusamy General", owner: "Velusamy K", type: "kirana", town: "Ambasamudram" },
    { name: "Kamala Traders", owner: "Kamala V", type: "wholesale", town: "Ambasamudram" },
  ],
};
