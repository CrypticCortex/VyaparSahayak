import type { ValidationIssue } from "./types";

export function validateRow(
  row: Record<string, unknown>,
  entityType: string,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  switch (entityType) {
    case "products":
    case "product":
      issues.push(...validateProduct(row));
      break;
    case "inventory":
      issues.push(...validateInventory(row));
      break;
    case "sales":
    case "salesTransaction":
      issues.push(...validateSales(row));
      break;
    case "retailers":
    case "retailer":
      issues.push(...validateRetailer(row));
      break;
    case "mixed":
      // For mixed, run all applicable checks based on which fields exist
      if (row.name || row.productName) issues.push(...validateProduct(row));
      if (row.currentStock !== undefined) issues.push(...validateInventory(row));
      if (row.totalAmount !== undefined) issues.push(...validateSales(row));
      break;
  }

  return issues;
}


function validateProduct(row: Record<string, unknown>): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  const name = row.name ?? row.productName;
  if (!name || String(name).trim() === "") {
    issues.push({
      field: "name",
      type: "required",
      message: "Product name is required",
    });
  }

  const mrp = toNumber(row.mrp);
  if (mrp !== null && mrp <= 0) {
    issues.push({
      field: "mrp",
      type: "out_of_range",
      message: "MRP must be a positive number",
    });
  }

  const costPrice = toNumber(row.costPrice);
  if (mrp !== null && costPrice !== null && costPrice > mrp) {
    issues.push({
      field: "costPrice",
      type: "out_of_range",
      message: `Cost price (${costPrice}) exceeds MRP (${mrp})`,
    });
  }

  return issues;
}


function validateInventory(row: Record<string, unknown>): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  const stock = toNumber(row.currentStock);
  if (stock !== null) {
    if (stock < 0) {
      issues.push({
        field: "currentStock",
        type: "out_of_range",
        message: "Stock cannot be negative",
      });
    }
    if (!Number.isInteger(stock)) {
      issues.push({
        field: "currentStock",
        type: "type_mismatch",
        message: "Stock must be a whole number",
      });
    }
  }

  const expiry = row.expiryDate;
  const mfg = row.manufacturingDate;
  if (expiry instanceof Date && mfg instanceof Date && expiry <= mfg) {
    issues.push({
      field: "expiryDate",
      type: "out_of_range",
      message: "Expiry date must be after manufacturing date",
    });
  }

  return issues;
}


function validateSales(row: Record<string, unknown>): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  const date = row.date;
  if (!date) {
    issues.push({
      field: "date",
      type: "required",
      message: "Transaction date is required",
    });
  } else if (date instanceof Date && isNaN(date.getTime())) {
    issues.push({
      field: "date",
      type: "invalid_format",
      message: "Invalid date value",
    });
  }

  const total = toNumber(row.totalAmount);
  if (total !== null && total <= 0) {
    issues.push({
      field: "totalAmount",
      type: "out_of_range",
      message: "Total amount must be positive",
    });
  }

  const qty = toNumber(row.quantity);
  if (qty !== null) {
    if (qty <= 0) {
      issues.push({
        field: "quantity",
        type: "out_of_range",
        message: "Quantity must be positive",
      });
    }
    if (!Number.isInteger(qty)) {
      issues.push({
        field: "quantity",
        type: "type_mismatch",
        message: "Quantity must be a whole number",
      });
    }
  }

  return issues;
}


function validateRetailer(row: Record<string, unknown>): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  const name = row.name ?? row.retailerName;
  if (!name || String(name).trim() === "") {
    issues.push({
      field: "name",
      type: "required",
      message: "Retailer name is required",
    });
  }

  return issues;
}


function toNumber(val: unknown): number | null {
  if (val === null || val === undefined || val === "") return null;
  const n = Number(val);
  if (isNaN(n)) return null;
  return n;
}


export function classifyRowStatus(issues: ValidationIssue[]): "valid" | "warning" | "error" {
  if (issues.length === 0) return "valid";

  const hasError = issues.some(
    (i) => i.type === "required" || i.type === "type_mismatch"
  );
  if (hasError) return "error";

  const hasWarning = issues.some(
    (i) => i.type === "possible_duplicate" || i.type === "out_of_range"
  );
  if (hasWarning) return "warning";

  return "valid";
}
