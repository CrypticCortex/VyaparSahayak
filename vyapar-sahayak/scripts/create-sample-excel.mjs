import XLSX from "xlsx";
import { mkdirSync } from "fs";
import { dirname, resolve } from "path";

// Tamil + English mixed column headers (realistic Tally export style)
const headers = [
  "\u0BAA\u0BCA\u0BB0\u0BC1\u0BB3\u0BCD \u0BAA\u0BC6\u0BAF\u0BB0\u0BCD",       // Product Name
  "Brand",
  "\u0BA8\u0BBF\u0BB1\u0BC1\u0BB5\u0BA9\u0BAE\u0BCD",          // Company
  "\u0BB5\u0B95\u0BC8",               // Category
  "\u0B8E\u0BAE\u0BCD.\u0B86\u0BB0\u0BCD.\u0BAA\u0BBF",        // MRP
  "Cost Price",
  "Selling Price",
  "\u0B85\u0BB3\u0BB5\u0BC1",              // Unit Size
  "Units/Case",
  "Shelf Life (days)",
  "\u0B87\u0BB0\u0BC1\u0BAA\u0BCD\u0BAA\u0BC1",           // Current Stock
  "Batch No",
  "\u0B89\u0BB1\u0BCD\u0BAA\u0BA4\u0BCD\u0BA4\u0BBF \u0BA4\u0BC7\u0BA4\u0BBF",     // Manufacturing Date
  "\u0B95\u0BBE\u0BB2\u0BBE\u0BB5\u0BA4\u0BBF \u0BA4\u0BC7\u0BA4\u0BBF",     // Expiry Date
];

// Helper: format date as DD/MM/YYYY
function fmt(d) {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

// Reference date: "today" for the demo
const today = new Date(2026, 2, 27); // 27 Mar 2026

function daysFromNow(n) {
  const d = new Date(today);
  d.setDate(d.getDate() + n);
  return fmt(d);
}

function daysAgo(n) {
  const d = new Date(today);
  d.setDate(d.getDate() - n);
  return fmt(d);
}

// -------------------------------------------------------
// 50 rows of realistic FMCG data for Tamil Nadu distributor
// -------------------------------------------------------

const rows = [
  // === 10 HEALTHY FAST-MOVERS ===
  ["Parle-G Glucose Biscuit 200g",         "Parle",      "Parle Products",       "\u0BAA\u0BBF\u0BB8\u0BCD\u0B95\u0BC6\u0B9F\u0BCD",   10,   7.5,   9,    "200g",  48, 365, 250,  "PG2602A",  "15/01/2026", "15/01/2027"],
  ["Maggi 2-Minute Noodles 70g",           "Maggi",      "Nestle India",         "\u0BA8\u0BC2\u0B9F\u0BBF\u0BB2\u0BCD\u0BB8\u0BCD",    14,  10,    12.5,  "70g",   48, 365, 180,  "MG2601B",  "01/02/2026", "01/02/2027"],
  ["Lifebuoy \u0B9A\u0BCB\u0BAA\u0BCD 100g",               "Lifebuoy",   "Hindustan Unilever",   "\u0B9A\u0BCB\u0BAA\u0BCD",       35,  22,    30,    "100g",  72, 730, 320,  "LB2601C",  "10/01/2026", "10/01/2028"],
  ["Bru Instant Coffee 50g",               "Bru",        "Hindustan Unilever",   "\u0BAA\u0BBE\u0BA9\u0BAE\u0BCD",     85,  55,    75,    "50g",   36, 365, 140,  "BR2602D",  "20/02/2026", "20/02/2027"],
  ["Colgate Strong Teeth 100g",            "Colgate",    "Colgate-Palmolive",    "\u0BAA\u0BB2\u0BCD \u0BAA\u0BCA\u0BB0\u0BC1\u0BB3\u0BCD",  52,  32,    45,    "100g",  48, 730, 200,  "CL2601E",  "05/01/2026", "05/01/2028"],
  ["Tata Tea Gold 250g",                   "Tata Tea",   "Tata Consumer",        "\u0BA4\u0BC7\u0BA8\u0BC0\u0BB0\u0BCD",     125, 82,    110,   "250g",  24, 365, 160,  "TT2602F",  "01/02/2026", "01/02/2027"],
  ["\u0B9A\u0BC1\u0BA9\u0BCD\u0BAA\u0BC0\u0B95\u0BCD Sunflower Oil 1L",      "Sunpeak",    "Adani Wilmar",         "\u0B8E\u0BA3\u0BCD\u0BA3\u0BC6\u0BAF\u0BCD",    165, 120,   150,   "1L",    12, 365, 300,  "SP2601G",  "15/01/2026", "15/01/2027"],
  ["Britannia Good Day 75g",               "Britannia",  "Britannia Industries", "\u0BAA\u0BBF\u0BB8\u0BCD\u0B95\u0BC6\u0B9F\u0BCD",   30,  20,    27,    "75g",   60, 270, 190,  "BD2602H",  "01/03/2026", "27/11/2026"],
  ["Surf Excel \u0BA4\u0BC2\u0BB3\u0BCD 1kg",             "Surf Excel",  "Hindustan Unilever",  "\u0B9A\u0BB2\u0BB5\u0BC8\u0BA4\u0BCD\u0BA4\u0BC2\u0BB3\u0BCD", 135, 90,   120,   "1kg",   12, 730, 175,  "SE2601I",  "10/01/2026", "10/01/2028"],
  ["Amul Taaza \u0BAA\u0BBE\u0BB2\u0BCD 500ml",           "Amul",       "Gujarat Co-op Milk",   "\u0BAA\u0BBE\u0BB2\u0BCD",       27,  20,    25,    "500ml", 24, 180, 400,  "AT2603J",  "20/03/2026", "16/09/2026"],

  // === 5 DEAD STOCK ITEMS ===
  ["Tang Orange 500g",                     "Tang",       "Mondelez India",       "\u0BAA\u0BBE\u0BA9\u0BAE\u0BCD",     165, 110,   150,   "500g",  24, 365,  5,   "TG2504K",  "01/04/2025", "01/04/2026"],
  ["Glow & Lovely Cream 50g",             "Glow & Lovely", "Hindustan Unilever", "\u0B95\u0BCD\u0BB0\u0BC0\u0BAE\u0BCD",      99,  60,    85,    "50g",   48, 730,  2,   "GL2506L",  "15/06/2025", "15/06/2027"],
  ["Complan Royale Chocolate 500g",        "Complan",    "Zydus Wellness",       "\u0BAA\u0BBE\u0BA9\u0BAE\u0BCD",     270, 180,   245,   "500g",  12, 365,  0,   "CP2504M",  "01/04/2025", "01/04/2026"],
  ["Medimix \u0B86\u0BAF\u0BC1\u0BB0\u0BCD\u0BB5\u0BC7\u0BA4 \u0B9A\u0BCB\u0BAA\u0BCD 75g",   "Medimix",    "Cholayil Pvt Ltd",     "\u0B9A\u0BCB\u0BAA\u0BCD",       42,  25,    36,    "75g",   72, 730,  1,   "MM2507N",  "01/07/2025", "01/07/2027"],
  ["\u0BAA\u0BC2\u0BB8\u0BCD\u0B9F\u0BCD Boost Jar 500g",          "Boost",      "Hindustan Unilever",   "\u0BAA\u0BBE\u0BA9\u0BAE\u0BCD",     299, 195,   270,   "500g",  12, 365,  3,   "BT2505O",  "15/05/2025", "15/05/2026"],

  // === 5 SLOW-MOVERS (declining demand) ===
  ["Ghadi Detergent Powder 1kg",           "Ghadi",      "RSPL Group",           "\u0B9A\u0BB2\u0BB5\u0BC8\u0BA4\u0BCD\u0BA4\u0BC2\u0BB3\u0BCD", 60,  38,    52,    "1kg",   12, 730, 85,   "GD2601P",  "01/01/2026", "01/01/2028"],
  ["Vicks VapoRub 25ml",                   "Vicks",      "P&G Health",           "\u0BAE\u0BB0\u0BC1\u0BA8\u0BCD\u0BA4\u0BC1",     99,  60,    85,    "25ml",  72, 730, 65,   "VK2512Q",  "01/12/2025", "01/12/2027"],
  ["Godrej No.1 \u0B9A\u0BCB\u0BAA\u0BCD 100g",            "Godrej",     "Godrej Consumer",      "\u0B9A\u0BCB\u0BAA\u0BCD",       22,  13,    19,    "100g",  72, 730, 110,  "GN2601R",  "15/01/2026", "15/01/2028"],
  ["Clinic Plus Shampoo 175ml",            "Clinic Plus","Hindustan Unilever",   "\u0B9E\u0BBE\u0BAE\u0BCD\u0BAA\u0BC2",    95,  58,    82,    "175ml", 24, 730, 72,   "CP2602S",  "01/02/2026", "01/02/2028"],
  ["Ujala \u0BB5\u0BC6\u0BB3\u0BCD\u0BB3\u0BC8 Liquid 75ml",         "Ujala",      "Jyothy Labs",          "\u0BB5\u0BC6\u0BB3\u0BCD\u0BB3\u0BC8",    30,  17,    25,    "75ml",  48, 730, 55,   "UJ2601T",  "10/01/2026", "10/01/2028"],

  // === 10 EXCESS INVENTORY (normal products, way too much stock) ===
  ["Lux \u0B9A\u0BCB\u0BAA\u0BCD 75g",                    "Lux",        "Hindustan Unilever",   "\u0B9A\u0BCB\u0BAA\u0BCD",       30,  18,    26,    "75g",   72, 730, 950,  "LX2601U",  "01/01/2026", "01/01/2028"],
  ["Kurkure Masala Munch 90g",             "Kurkure",    "PepsiCo India",        "\u0BA4\u0BBF\u0BA9\u0BCD\u0BAA\u0BA3\u0BCD\u0B9F\u0BAE\u0BCD", 20,  13,    18,    "90g",   24, 120, 800,  "KU2602V",  "15/02/2026", "15/06/2026"],
  ["Vim Dishwash Bar 200g",                "Vim",        "Hindustan Unilever",   "\u0BAA\u0BBE\u0BA4\u0BCD\u0BA4\u0BBF\u0BB0\u0BAE\u0BCD", 15,  9,     13,    "200g",  48, 365, 720,  "VM2601W",  "01/01/2026", "01/01/2027"],
  ["\u0B85\u0BB0\u0BBF\u0B9A\u0BBF Atta 5kg",                "Aashirvaad", "ITC Limited",          "\u0BAE\u0BBE\u0BB5\u0BC1",       275, 195,   255,   "5kg",   6,  180, 450,  "AA2603X",  "01/03/2026", "28/08/2026"],
  ["Dettol \u0B95\u0BBF\u0BB0\u0BC1\u0BAE\u0BBF\u0BA8\u0BBE\u0B9A\u0BBF 500ml",       "Dettol",     "Reckitt Benckiser",    "\u0B95\u0BBF\u0BB0\u0BC1\u0BAE\u0BBF\u0BA8\u0BBE\u0B9A\u0BBF", 99,  62,    88,    "500ml", 24, 730, 600,  "DT2601Y",  "10/01/2026", "10/01/2028"],
  ["Pepsodent Germicheck 150g",            "Pepsodent",  "Hindustan Unilever",   "\u0BAA\u0BB2\u0BCD \u0BAA\u0BCA\u0BB0\u0BC1\u0BB3\u0BCD",  55,  33,    48,    "150g",  48, 730, 880,  "PS2602Z",  "01/02/2026", "01/02/2028"],
  ["Hamam \u0B9A\u0BCB\u0BAA\u0BCD 100g",                  "Hamam",      "Hindustan Unilever",   "\u0B9A\u0BCB\u0BAA\u0BCD",       35,  20,    30,    "100g",  72, 730, 750,  "HM2601A1", "15/01/2026", "15/01/2028"],
  ["Lay's Classic Salted 52g",             "Lay's",      "PepsiCo India",        "\u0BA4\u0BBF\u0BA9\u0BCD\u0BAA\u0BA3\u0BCD\u0B9F\u0BAE\u0BCD", 20,  13,    18,    "52g",   36, 90,  650,  "LA2603B1", "10/03/2026", "08/06/2026"],
  ["Santoor \u0B9A\u0BA8\u0BCD\u0BA4\u0BA9 \u0B9A\u0BCB\u0BAA\u0BCD 100g",       "Santoor",    "Wipro Consumer",       "\u0B9A\u0BCB\u0BAA\u0BCD",       30,  17,    26,    "100g",  72, 730, 920,  "ST2601C1", "01/01/2026", "01/01/2028"],
  ["Fortune Sunlite Oil 1L",               "Fortune",    "Adani Wilmar",         "\u0B8E\u0BA3\u0BCD\u0BA3\u0BC6\u0BAF\u0BCD",    155, 112,   142,   "1L",    12, 365, 500,  "FO2602D1", "15/02/2026", "15/02/2027"],

  // === 5 NEAR-EXPIRY ITEMS (expiry within 30-45 days from 27 Mar 2026) ===
  ["Britannia Milk Bikis 100g",            "Britannia",  "Britannia Industries", "\u0BAA\u0BBF\u0BB8\u0BCD\u0B95\u0BC6\u0B9F\u0BCD",   15,  9.5,   13,    "100g",  60, 180, 45,   "BK2509E1", "27/09/2025", "26/03/2026"],
  ["Haldiram \u0BAE\u0BBF\u0B95\u0BCD\u0BB8\u0BCD\u0B9A\u0BB0\u0BCD 200g",        "Haldiram",   "Haldiram's",           "\u0BA4\u0BBF\u0BA9\u0BCD\u0BAA\u0BA3\u0BCD\u0B9F\u0BAE\u0BCD", 55,  35,    48,    "200g",  24, 150, 30,   "HD2510F1", "28/10/2025", "27/03/2026"],
  ["MTR \u0BB0\u0BC6\u0B9F\u0BBF \u0B9F\u0BC1 \u0B88\u0B9F\u0BCD Upma 180g",    "MTR",        "MTR Foods",            "\u0BB0\u0BC6\u0B9F\u0BBF \u0B9F\u0BC1 \u0B88\u0B9F\u0BCD", 45,  28,    39,    "180g",  36, 180, 60,   "MT2510G1", "15/10/2025", "14/04/2026"],
  ["Amul Butter 100g",                     "Amul",       "Gujarat Co-op Milk",   "\u0BAA\u0BBE\u0BB2\u0BCD \u0BAA\u0BCA\u0BB0\u0BC1\u0BB3\u0BCD", 56,  40,    52,    "100g",  24, 180, 25,   "AB2510H1", "10/10/2025", "09/04/2026"],
  ["\u0B87\u0B9F\u0BCD\u0BB2\u0BBF Idli/Dosa Batter 1kg",      "iD Fresh",   "iD Fresh Food",        "\u0BAA\u0BC7\u0B9F\u0BCD\u0B9F\u0BB0\u0BCD",    65,  42,    58,    "1kg",   6,  15,  20,   "ID2603I1", "20/03/2026", "04/04/2026"],

  // === 15 MODERATE ITEMS (mixed health) ===
  ["Horlicks Classic Malt 500g",           "Horlicks",   "Hindustan Unilever",   "\u0BAA\u0BBE\u0BA9\u0BAE\u0BCD",     250, 170,   230,   "500g",  12, 365, 70,   "HO2601J1", "01/01/2026", "01/01/2027"],
  ["Closeup \u0BAA\u0BB2\u0BCD\u0BAA\u0B9F\u0BBF 150g",           "Closeup",    "Hindustan Unilever",   "\u0BAA\u0BB2\u0BCD \u0BAA\u0BCA\u0BB0\u0BC1\u0BB3\u0BCD",  70,  42,    62,    "150g",  48, 730, 95,   "CU2602K1", "01/02/2026", "01/02/2028"],
  ["Sunsilk Thick & Long 180ml",           "Sunsilk",    "Hindustan Unilever",   "\u0B9E\u0BBE\u0BAE\u0BCD\u0BAA\u0BC2",    139, 88,    125,   "180ml", 24, 730, 55,   "SS2601L1", "15/01/2026", "15/01/2028"],
  ["Dabur Chyawanprash 500g",              "Dabur",      "Dabur India",          "\u0BAE\u0BB0\u0BC1\u0BA8\u0BCD\u0BA4\u0BC1",     285, 190,   260,   "500g",  12, 730, 40,   "DB2602M1", "01/02/2026", "01/02/2028"],
  ["\u0BAE\u0BBF\u0BB3\u0B95\u0BC1 Powder Tamarind 200g",       "MTR",        "MTR Foods",            "\u0BAE\u0BB3\u0BBF\u0B95\u0BC8",    45,  28,    39,    "200g",  36, 365, 85,   "MT2602N1", "01/02/2026", "01/02/2027"],
  ["Rin Detergent Bar 250g",               "Rin",        "Hindustan Unilever",   "\u0B9A\u0BB2\u0BB5\u0BC8\u0BA4\u0BCD\u0BA4\u0BC2\u0BB3\u0BCD", 12,  7,     10,    "250g",  48, 730, 130,  "RN2601O1", "10/01/2026", "10/01/2028"],
  ["Nescafe Classic 50g",                  "Nescafe",    "Nestle India",         "\u0BAA\u0BBE\u0BA9\u0BAE\u0BCD",     175, 115,   160,   "50g",   24, 365, 60,   "NC2603P1", "01/03/2026", "01/03/2027"],
  ["Head & Shoulders Shampoo 180ml",       "H&S",        "Procter & Gamble",     "\u0B9E\u0BBE\u0BAE\u0BCD\u0BAA\u0BC2",    275, 175,   250,   "180ml", 24, 730, 35,   "HS2602Q1", "15/02/2026", "15/02/2028"],
  ["Everest \u0BAE\u0BB3\u0BBF\u0B95\u0BC8\u0BA4\u0BCD\u0BA4\u0BC2\u0BB3\u0BCD 100g",       "Everest",    "Everest Spices",       "\u0BAE\u0BB3\u0BBF\u0B95\u0BC8",    65,  40,    58,    "100g",  36, 365, 110,  "EV2602R1", "01/02/2026", "01/02/2027"],
  ["Whisper Choice Wings 8 Pads",          "Whisper",    "Procter & Gamble",     "\u0BAA\u0BB0\u0BBE\u0BAE\u0BB0\u0BBF\u0BAA\u0BCD\u0BAA\u0BC1", 42,  25,    37,    "8 pads",48, 730, 90,   "WH2601S1", "01/01/2026", "01/01/2028"],
  ["Parachute \u0BA4\u0BC7\u0B99\u0BCD\u0B95\u0BBE\u0BAF\u0BCD \u0B8E\u0BA3\u0BCD\u0BA3\u0BC6\u0BAF\u0BCD 200ml","Parachute", "Marico Limited",      "\u0B8E\u0BA3\u0BCD\u0BA3\u0BC6\u0BAF\u0BCD",    115, 75,    105,   "200ml", 24, 730, 120,  "PC2601T1", "15/01/2026", "15/01/2028"],
  ["Paper Boat \u0B86\u0BAE\u0BCD \u0BAA\u0BA9\u0BCD\u0BA9\u0BBE 200ml",    "Paper Boat", "Hector Beverages",     "\u0BAA\u0BBE\u0BA9\u0BAE\u0BCD",     30,  18,    27,    "200ml", 24, 180, 48,   "PB2602U1", "01/02/2026", "01/08/2026"],
  ["Cinthol \u0B9A\u0BCB\u0BAA\u0BCD 100g",                "Cinthol",    "Godrej Consumer",      "\u0B9A\u0BCB\u0BAA\u0BCD",       35,  20,    30,    "100g",  72, 730, 65,   "CN2601V1", "10/01/2026", "10/01/2028"],
  ["Red Label \u0BA4\u0BC7\u0BA8\u0BC0\u0BB0\u0BCD 250g",          "Red Label",  "Hindustan Unilever",   "\u0BA4\u0BC7\u0BA8\u0BC0\u0BB0\u0BCD",     110, 72,    98,    "250g",  24, 365, 80,   "RL2602W1", "01/02/2026", "01/02/2027"],
  ["Ponds \u0BAA\u0BB5\u0BC1\u0B9F\u0BB0\u0BCD 50g",              "Pond's",     "Hindustan Unilever",   "\u0B95\u0BCD\u0BB0\u0BC0\u0BAE\u0BCD",      99,  62,    88,    "50g",   48, 730, 42,   "PD2601X1", "01/01/2026", "01/01/2028"],
];


// Build worksheet data: headers + rows
const wsData = [headers, ...rows];

// Create workbook
const wb = XLSX.utils.book_new();
const ws = XLSX.utils.aoa_to_sheet(wsData);

// Set column widths for readability
ws["!cols"] = [
  { wch: 38 }, // Product Name
  { wch: 14 }, // Brand
  { wch: 22 }, // Company
  { wch: 16 }, // Category
  { wch: 10 }, // MRP
  { wch: 12 }, // Cost Price
  { wch: 14 }, // Selling Price
  { wch: 10 }, // Unit Size
  { wch: 12 }, // Units/Case
  { wch: 16 }, // Shelf Life
  { wch: 10 }, // Stock
  { wch: 12 }, // Batch No
  { wch: 14 }, // Mfg Date
  { wch: 14 }, // Expiry Date
];

XLSX.utils.book_append_sheet(wb, ws, "Inventory");

// Output paths
const outDir = new URL("../public/samples/", import.meta.url).pathname;
mkdirSync(outDir, { recursive: true });

const xlsxPath = outDir + "tally-export-tamil.xlsx";
const csvPath  = outDir + "tally-export-tamil.csv";

// Write xlsx
XLSX.writeFile(wb, xlsxPath);
console.log(`[OK] Excel written: ${xlsxPath}`);

// Write CSV
XLSX.writeFile(wb, csvPath, { bookType: "csv" });
console.log(`[OK] CSV written:   ${csvPath}`);

// Summary
console.log(`\nRows: ${rows.length} (expected 50)`);
console.log(`Columns: ${headers.length}`);
