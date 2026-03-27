// Date parsing -- handle Indian formats (DD/MM/YYYY is the standard)
export function parseDate(val: string, format?: string): Date | null {
  if (!val || !val.trim()) return null;

  const s = val.trim();

  // If an explicit format hint is given, try that first
  if (format === "date_iso" || format === "iso") {
    const d = new Date(s);
    if (!isNaN(d.getTime())) return d;
  }

  // DD/MM/YYYY or DD-MM-YYYY (Indian standard)
  const dmySlash = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (dmySlash) {
    const [, day, month, year] = dmySlash;
    const d = new Date(Number(year), Number(month) - 1, Number(day));
    if (!isNaN(d.getTime())) return d;
  }

  // YYYY-MM-DD (ISO)
  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) {
    const [, year, month, day] = iso;
    const d = new Date(Number(year), Number(month) - 1, Number(day));
    if (!isNaN(d.getTime())) return d;
  }

  // DD-MMM-YYYY (e.g. "15-Jan-2024", "03-Mar-2025")
  const dmmmy = s.match(/^(\d{1,2})-(\w{3})-(\d{4})$/);
  if (dmmmy) {
    const d = new Date(s);
    if (!isNaN(d.getTime())) return d;
  }

  // MM/DD/YYYY fallback (only if format hint says so)
  if (format === "date_mdy" || format === "mdy") {
    const mdySlash = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
    if (mdySlash) {
      const [, month, day, year] = mdySlash;
      const d = new Date(Number(year), Number(month) - 1, Number(day));
      if (!isNaN(d.getTime())) return d;
    }
  }

  // Last resort: let Date.parse try
  const fallback = new Date(s);
  if (!isNaN(fallback.getTime())) return fallback;

  return null;
}


// Currency -- handle Indian format with lakh separators
// "Rs. 1,23,456.00" -> 123456, "Rs.150" -> 150, "1,50,000" -> 150000
export function parseCurrency(val: string): number | null {
  if (!val || !val.trim()) return null;

  // Strip currency symbols, Rs., INR, whitespace around them
  let s = val.trim();
  s = s.replace(/^(Rs\.?|INR|₹)\s*/i, "");
  s = s.replace(/\s*(Rs\.?|INR|₹)$/i, "");

  // Remove all commas (handles 1,23,456 Indian and 123,456 Western)
  s = s.replace(/,/g, "");

  // Remove trailing dash or minus used as "nil" in Tally
  s = s.replace(/^-$/, "0");

  const num = parseFloat(s);
  if (isNaN(num)) return null;
  return num;
}


// Phone normalization -- Indian numbers
// "9876543210" -> "+919876543210"
// "098765 43210" -> "+919876543210"
// "+91-9876543210" -> "+919876543210"
export function normalizePhone(val: string): string {
  if (!val || !val.trim()) return "";

  // Strip everything except digits and leading +
  let digits = val.replace(/[^0-9+]/g, "");

  // Remove leading + for processing
  const hasPlus = digits.startsWith("+");
  if (hasPlus) digits = digits.slice(1);

  // Remove leading 91 country code if present
  if (digits.startsWith("91") && digits.length > 10) {
    digits = digits.slice(2);
  }

  // Remove leading 0 (trunk prefix)
  if (digits.startsWith("0") && digits.length > 10) {
    digits = digits.slice(1);
  }

  // Take last 10 digits
  if (digits.length > 10) {
    digits = digits.slice(-10);
  }

  if (digits.length !== 10) return val.trim();

  return "+91" + digits;
}


// SKU generation from product info
// "Parle-G 200g", "Parle", "Biscuits" -> "BIS-PAR-200G"
export function generateSKU(name: string, brand: string, category: string): string {
  const catCode = category.replace(/[^a-zA-Z]/g, "").slice(0, 3).toUpperCase() || "GEN";
  const brandCode = brand.replace(/[^a-zA-Z]/g, "").slice(0, 3).toUpperCase() || "UNK";

  // Extract size/weight from product name (e.g. "200g", "1kg", "500ml", "1L")
  const sizeMatch = name.match(/(\d+\s*(?:g|kg|ml|l|gm|ltr|pcs|pc|pack))\b/i);
  const sizeCode = sizeMatch
    ? sizeMatch[1].replace(/\s/g, "").toUpperCase()
    : "STD";

  return `${catCode}-${brandCode}-${sizeCode}`;
}


// Apply a transform to a value based on transform type
export function applyTransform(val: string, transform: string): unknown {
  switch (transform) {
    case "date_dmy":
      return parseDate(val, "date_dmy");
    case "date_mdy":
      return parseDate(val, "date_mdy");
    case "date_iso":
      return parseDate(val, "date_iso");
    case "currency_strip":
      return parseCurrency(val);
    case "phone_normalize":
      return normalizePhone(val);
    case "none":
    default:
      return val;
  }
}
