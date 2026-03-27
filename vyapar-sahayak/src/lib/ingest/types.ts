export interface ParsedFile {
  headers: string[];
  rows: Record<string, string>[];
  totalRows: number;
  sampleRows: Record<string, string>[];
  metadata: {
    fileName: string;
    fileType: "excel" | "csv" | "pdf";
    sheetName?: string;
    sheets?: string[];
  };
}

export interface ColumnMapping {
  sourceColumn: string;
  targetField: string | null;
  targetEntity: "product" | "retailer" | "inventory" | "salesTransaction" | "salesLineItem";
  confidence: number;
  reasoning: string;
  transform?: "date_dmy" | "date_mdy" | "date_iso" | "currency_strip" | "phone_normalize" | "none";
}

export interface MappingResult {
  entityType: "products" | "retailers" | "inventory" | "sales" | "mixed";
  detectedLanguage: "english" | "hindi" | "tamil" | "mixed";
  mappings: ColumnMapping[];
  unmappedColumns: string[];
  warnings: string[];
  dateFormat?: string;
  currencyFormat?: string;
}

export interface ValidationIssue {
  field: string;
  type: "required" | "type_mismatch" | "possible_duplicate" | "out_of_range" | "invalid_format";
  message: string;
  existingId?: string;
  similarity?: number;
}

export interface PreviewRow {
  rowIndex: number;
  mapped: Record<string, unknown>;
  status: "valid" | "warning" | "error";
  issues: ValidationIssue[];
}

export interface DuplicateMatch {
  incomingName: string;
  existingName: string;
  existingId: string;
  similarity: number;
  suggestedAction: "merge" | "create_new" | "skip";
}

export interface IngestStats {
  productsCreated: number;
  productsUpdated: number;
  retailersCreated: number;
  inventoryCreated: number;
  salesTransactions: number;
  errorsSkipped: number;
  deadStockAlerts: number;
}
