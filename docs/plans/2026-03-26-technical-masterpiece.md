# Technical Masterpiece Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform Vyapar Sahayak into a technical masterpiece with universal data ingestion as the centerpiece, plus SSE streaming, RAG, RBAC, WhatsApp, and observability.

**Architecture:** Single Next.js service on EC2 with RDS Postgres + pgvector. Strands Agent SDK with 20 tools (19 existing + 1 RAG). Optional Baileys WhatsApp sidecar. Langfuse cloud for observability. Claude Opus via Bedrock for Tamil/Hindi column mapping in the ingestion engine.

**Tech Stack:** Next.js 16, Prisma (Postgres), AWS Bedrock (Nova Lite + Titan Embeddings + Claude Opus for mapping), pgvector, xlsx (SheetJS), pdf-parse, NextAuth, Baileys, Langfuse, OpenTelemetry

**Key Decision:** The data ingestion LLM call uses **Claude Opus** (`anthropic.claude-opus-4-20250514`) via Bedrock -- NOT Nova Lite. Tamil/Hindi column mapping is a hard NLU task that needs the best model.

---

## Phase 0: Bug Fixes

### Task 0.1: Fix silent demo mode failure in chat route

The `get_campaigns`, `get_alerts`, and `get_whatsapp_groups` tools return `{items: [...]}` but demo mode checks `Array.isArray(result)` which always fails since `result` is an object.

**Files:**
- Modify: `vyapar-sahayak/src/app/api/chat/route.ts`

**Step 1: Fix `get_whatsapp_groups` handler (line ~206-208)**

Change:
```typescript
const result = await executeTool("get_whatsapp_groups", {});
const groups = result as any[];
if (!Array.isArray(groups) || groups.length === 0) {
```

To:
```typescript
const result = await executeTool("get_whatsapp_groups", {}) as any;
const groups = result?.items || (Array.isArray(result) ? result : []);
if (groups.length === 0) {
```

**Step 2: Fix `get_campaigns` handler for "send it" flow (line ~226-227)**

Change:
```typescript
const campaigns = (await executeTool("get_campaigns", {})) as any[];
if (!Array.isArray(campaigns) || campaigns.length === 0) {
```

To:
```typescript
const rawCampaigns = await executeTool("get_campaigns", {}) as any;
const campaigns = rawCampaigns?.items || (Array.isArray(rawCampaigns) ? rawCampaigns : []);
if (campaigns.length === 0) {
```

**Step 3: Fix `get_alerts` handler (line ~270-271)**

Change:
```typescript
const result = await executeTool("get_alerts", {});
const alerts = result as any[];
if (!Array.isArray(alerts) || alerts.length === 0) {
```

To:
```typescript
const result = await executeTool("get_alerts", {}) as any;
const alerts = result?.items || (Array.isArray(result) ? result : []);
if (alerts.length === 0) {
```

**Step 4: Fix `get_campaigns` handler for "campaign" intent (line ~334-336)**

Change:
```typescript
const result = await executeTool("get_campaigns", {});
const campaigns = result as any[];
if (!Array.isArray(campaigns) || campaigns.length === 0) {
```

To:
```typescript
const rawResult = await executeTool("get_campaigns", {}) as any;
const campaigns = rawResult?.items || (Array.isArray(rawResult) ? rawResult : []);
if (campaigns.length === 0) {
```

**Step 5: Fix `get_alerts` in "recommend" handler (line ~351-352)**

Change:
```typescript
const alerts = (await executeTool("get_alerts", {})) as any[];
if (!Array.isArray(alerts) || alerts.length === 0) {
```

To:
```typescript
const rawAlerts = await executeTool("get_alerts", {}) as any;
const alerts = rawAlerts?.items || (Array.isArray(rawAlerts) ? rawAlerts : []);
if (alerts.length === 0) {
```

**Step 6: Verify fix**

Run: `cd vyapar-sahayak && SHELL=/bin/sh npx tsc --noEmit`
Expected: No TypeScript errors

---

### Task 0.2: Remove unused danfojs-node dependency

**Files:**
- Modify: `vyapar-sahayak/package.json`

**Step 1: Remove danfojs-node from dependencies**

Remove this line from `dependencies`:
```
"danfojs-node": "^1.2.0",
```

**Step 2: Verify no imports exist**

Run: `grep -r "danfojs" vyapar-sahayak/src/`
Expected: No results

**Step 3: Reinstall**

Run: `cd vyapar-sahayak && SHELL=/bin/sh npm install`
Expected: Success, ~50MB smaller node_modules

---

### Task 0.3: Fix k-means segment mapping

The cluster-to-segment mapping uses total centroid magnitude (sum of all features) which is arbitrary. Should use `avgOrderValue` dimension specifically (index 1 in the feature vector).

**Files:**
- Modify: `vyapar-sahayak/src/lib/ml/clustering.ts`

**Step 1: Fix centroid ranking**

Change:
```typescript
const centroidMagnitudes = result.centroids.map((c, i) => ({
  idx: i,
  magnitude: c.reduce((s, v) => s + v, 0),
}));
centroidMagnitudes.sort((a, b) => b.magnitude - a.magnitude);
```

To:
```typescript
// Rank clusters by avgOrderValue dimension (index 1) -- the most meaningful business signal
const centroidRanking = result.centroids.map((c, i) => ({
  idx: i,
  avgOrderValue: c[1], // feature index 1 = avgOrderValue / 1000
}));
centroidRanking.sort((a, b) => b.avgOrderValue - a.avgOrderValue);
```

And update the reference:
```typescript
centroidRanking.forEach((c, rank) => {
  clusterToSegment[c.idx] = SEGMENT_LABELS[rank] || "silver";
});
```

**Step 2: Verify TypeScript compiles**

Run: `cd vyapar-sahayak && SHELL=/bin/sh npx tsc --noEmit`
Expected: No errors

---

## Phase 1: Database Migration (Turso -> RDS Postgres + pgvector)

### Task 1.1: Create RDS Postgres instance

**Prerequisites:** AWS CLI configured with ap-south-1 access.

**Step 1: Create RDS instance via AWS CLI**

```bash
aws rds create-db-instance \
  --db-instance-identifier vyapar-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 16.4 \
  --master-username vyapar_admin \
  --master-user-password <GENERATE_SECURE_PASSWORD> \
  --allocated-storage 20 \
  --vpc-security-group-ids <SG_ID_SAME_AS_EC2> \
  --availability-zone ap-south-1a \
  --publicly-accessible \
  --region ap-south-1
```

**Step 2: Wait for instance to be available**

```bash
aws rds wait db-instance-available --db-instance-identifier vyapar-db --region ap-south-1
```

**Step 3: Get the endpoint**

```bash
aws rds describe-db-instances --db-instance-identifier vyapar-db --region ap-south-1 \
  --query 'DBInstances[0].Endpoint.Address' --output text
```

**Step 4: Enable pgvector extension**

```bash
psql "postgresql://vyapar_admin:<PASSWORD>@<ENDPOINT>:5432/postgres" \
  -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

**Step 5: Create application database**

```bash
psql "postgresql://vyapar_admin:<PASSWORD>@<ENDPOINT>:5432/postgres" \
  -c "CREATE DATABASE vyapar;"
psql "postgresql://vyapar_admin:<PASSWORD>@<ENDPOINT>:5432/vyapar" \
  -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

---

### Task 1.2: Update Prisma schema for Postgres

**Files:**
- Modify: `vyapar-sahayak/prisma/schema.prisma`

**Step 1: Change datasource to postgresql**

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

**Step 2: Fix Campaign -> Order relation (documented tech debt)**

In Campaign model, add:
```prisma
orders Order[]
```

In Order model, change `campaignId` field:
```prisma
campaignId    String?
campaign      Campaign? @relation(fields: [campaignId], references: [id])
```

**Step 3: Add IngestionJob model**

```prisma
model IngestionJob {
  id             String    @id @default(cuid())
  distributorId  String
  fileName       String
  fileType       String
  entityType     String
  status         String    @default("uploaded")
  rowCount       Int       @default(0)
  successCount   Int       @default(0)
  errorCount     Int       @default(0)
  mappingJson    String?
  errorsJson     String?
  createdAt      DateTime  @default(now())
  completedAt    DateTime?
  distributor    Distributor @relation(fields: [distributorId], references: [id])
}
```

Add `ingestionJobs IngestionJob[]` to Distributor model.

**Step 4: Add Embedding model for RAG**

```prisma
model Embedding {
  id         String   @id @default(cuid())
  sourceType String
  sourceId   String
  content    String
  vector     Unsupported("vector(1024)")
  metadata   Json?
  createdAt  DateTime @default(now())

  @@index([sourceType, sourceId])
}
```

---

### Task 1.3: Simplify db.ts and update dependencies

**Files:**
- Modify: `vyapar-sahayak/src/lib/db.ts`
- Modify: `vyapar-sahayak/package.json`

**Step 1: Simplify db.ts**

Replace entire file with:
```typescript
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

**Step 2: Remove LibSQL dependencies from package.json**

Remove from `dependencies`:
```
"@prisma/adapter-libsql": "^7.4.2",
"@libsql/client": "^0.17.0",
```

**Step 3: Update .env with new DATABASE_URL**

```
DATABASE_URL=postgresql://vyapar_admin:<PASSWORD>@<ENDPOINT>:5432/vyapar
```

**Step 4: Run migration**

```bash
cd vyapar-sahayak && SHELL=/bin/sh npx prisma migrate dev --name init_postgres
```
Expected: Migration succeeds, creates all tables

**Step 5: Generate client**

```bash
cd vyapar-sahayak && SHELL=/bin/sh npx prisma generate
```

**Step 6: Verify TypeScript compiles**

```bash
cd vyapar-sahayak && SHELL=/bin/sh npx tsc --noEmit
```

**Step 7: Seed the database**

```bash
cd vyapar-sahayak && SHELL=/bin/sh npm run dev
# In another terminal:
curl http://localhost:3000/api/seed
```
Expected: Seed succeeds, dashboard loads with data

---

## Phase 2: Universal Data Ingestion Engine (THE CENTERPIECE)

### Task 2.1: Install parsing dependencies

**Files:**
- Modify: `vyapar-sahayak/package.json`

**Step 1: Install xlsx and pdf-parse**

```bash
cd vyapar-sahayak && SHELL=/bin/sh npm install xlsx pdf-parse
cd vyapar-sahayak && SHELL=/bin/sh npm install -D @types/pdf-parse
```

---

### Task 2.2: Create ingestion types and session cache

**Files:**
- Create: `vyapar-sahayak/src/lib/ingest/types.ts`
- Create: `vyapar-sahayak/src/lib/ingest/session-cache.ts`

**Step 1: Create types.ts**

All shared interfaces: `ParsedFile`, `ColumnMapping`, `MappingResult`, `ValidationIssue`, `PreviewRow`, `IngestStats`.

**Step 2: Create session-cache.ts**

In-memory `Map<string, { data: ParsedFile; mappedData?: any; expiresAt: number }>` with 30-minute TTL. Sweep expired entries on each access. Keyed by IngestionJob ID.

---

### Task 2.3: Build file parsers

**Files:**
- Create: `vyapar-sahayak/src/lib/ingest/parsers.ts`

**Step 1: Implement Excel parser using xlsx (SheetJS)**

Read `.xlsx`/`.xls` files, extract headers + rows from first sheet. Handle multiple sheets (return sheet names for user selection).

**Step 2: Implement CSV parser**

Use xlsx's CSV auto-detection or csv-parse for streaming.

**Step 3: Implement PDF parser (digital PDFs)**

Use pdf-parse to extract text. If text is tabular, parse into rows. If not, send to LLM for table extraction.

---

### Task 2.4: Build AI column mapper (THE CRITICAL PIECE)

**Files:**
- Create: `vyapar-sahayak/src/lib/ingest/mapper.ts`
- Modify: `vyapar-sahayak/src/lib/bedrock.ts` -- add `generateTextWithModel()` function

**Step 1: Add model-specific generation to bedrock.ts**

Add a new function `generateTextWithModel(prompt, modelId)` that takes a specific model ID. The column mapper will call this with `anthropic.claude-opus-4-20250514` instead of the default Nova Lite.

```typescript
export async function generateTextWithModel(prompt: string, modelId: string): Promise<string> {
  if (isDemoMode) return generateMockText(prompt);

  const isClaude = modelId.startsWith("anthropic.");
  // ... same logic as generateText but with explicit modelId
}
```

**Step 2: Create mapper.ts with the LLM prompt**

The prompt includes:
- Full target schema (Product, Retailer, Inventory, Sales entities with all fields)
- Common aliases in English, Hindi (with Devanagari), Tamil (with Tamil script)
- Tally-specific terms (Particulars, Voucher No, Godown, Under)
- Busy-specific terms (Ledger Name, Bill Amount, Party Name)
- Instructions to analyze both headers AND sample data values
- Output: JSON with mappings, confidence scores, detected language, transforms, warnings

**The LLM call uses Claude Opus:**
```typescript
const MAPPING_MODEL = "anthropic.claude-opus-4-20250514";

export async function mapColumns(headers: string[], sampleRows: Record<string, string>[]): Promise<MappingResult> {
  const prompt = buildMappingPrompt(headers, sampleRows);
  const response = await generateTextWithModel(prompt, MAPPING_MODEL);
  return parseMappingResponse(response);
}
```

**Step 3: Add demo mode mock**

Pre-baked mapping response for a sample Tally export. Returns instantly without LLM call when `CHAT_USE_BEDROCK !== "true"`.

---

### Task 2.5: Build data transforms

**Files:**
- Create: `vyapar-sahayak/src/lib/ingest/transforms.ts`

Functions:
- `parseDateDMY(val)` -- DD/MM/YYYY, DD-MM-YYYY
- `parseDateMDY(val)` -- MM/DD/YYYY
- `parseDateISO(val)` -- YYYY-MM-DD
- `stripCurrency(val)` -- "Rs. 1,23,456.00" -> 123456, handle INR comma format (lakhs)
- `normalizePhone(val)` -- "9876543210" -> "+919876543210"
- `generateSKU(name, brand, category, size)` -- "Parle-G 200g" -> "BIS-PAR-200"

---

### Task 2.6: Build fuzzy deduplication

**Files:**
- Create: `vyapar-sahayak/src/lib/ingest/dedup.ts`

Simple Levenshtein distance implementation (~20 lines). Compare incoming product names against existing DB products. Threshold: 0.85 = flag as probable duplicate. Returns list of `{ incomingName, existingName, existingId, similarity, suggestedAction }`.

---

### Task 2.7: Build validator

**Files:**
- Create: `vyapar-sahayak/src/lib/ingest/validator.ts`

Per-entity validation rules:
- Product: name required, mrp positive, costPrice <= mrp
- Inventory: currentStock >= 0, expiryDate > manufacturingDate
- Sales: date required + valid, totalAmount positive, quantity positive
- Retailer: name required, phone format valid

Returns per-row status: `valid | warning | error` with issue details.

---

### Task 2.8: Build database loader

**Files:**
- Create: `vyapar-sahayak/src/lib/ingest/loader.ts`

Prisma transactional write:
1. Create new products (with auto-generated SKUs where missing)
2. Create/update inventory records
3. Create sales transactions + line items
4. Update zone stats (retailerCount, avgOrderValue)
5. Run dead stock detection (call existing `extractFeatures` + `scoreDeadStock`)
6. Invalidate dashboard cache (call existing `invalidateAfterDetection`)
7. Update IngestionJob status to "committed"

Batch inserts in groups of 100 for large datasets.

---

### Task 2.9: Create API routes

**Files:**
- Create: `vyapar-sahayak/src/app/api/ingest/upload/route.ts`
- Create: `vyapar-sahayak/src/app/api/ingest/map/route.ts`
- Create: `vyapar-sahayak/src/app/api/ingest/preview/route.ts`
- Create: `vyapar-sahayak/src/app/api/ingest/commit/route.ts`

**Route 1: POST /api/ingest/upload**
- Accept multipart/form-data
- Parse file with appropriate parser
- Create IngestionJob record
- Store parsed data in session cache
- Return: jobId, headers, sampleRows, totalRows, sheets (if Excel)

**Route 2: POST /api/ingest/map**
- Retrieve from cache by jobId
- Call Opus LLM for column mapping
- Return: mappings with confidence, detected language, warnings

**Route 3: POST /api/ingest/preview**
- Apply confirmed mappings to all rows
- Run transforms (dates, currency, phone)
- Run validator
- Run dedup against existing DB products
- Return: preview rows with status, issues, duplicate list, stats

**Route 4: POST /api/ingest/commit**
- Apply duplicate resolutions
- Skip user-chosen rows
- Load to DB in transaction
- Run dead stock detection
- Return: stats (products created/updated, inventory records, alerts generated)

---

### Task 2.10: Build wizard UI

**Files:**
- Create: `vyapar-sahayak/src/app/demo/ingest/page.tsx`
- Create: `vyapar-sahayak/src/components/ingest/wizard.tsx`
- Create: `vyapar-sahayak/src/components/ingest/upload-step.tsx`
- Create: `vyapar-sahayak/src/components/ingest/mapping-step.tsx`
- Create: `vyapar-sahayak/src/components/ingest/preview-step.tsx`
- Create: `vyapar-sahayak/src/components/ingest/commit-step.tsx`
- Modify: `vyapar-sahayak/src/components/dashboard/sidebar.tsx` -- add "Import Data" nav item

**4-step wizard:**
1. **Upload**: Drag-drop zone, file preview table (first 10 rows), sheet selector for Excel
2. **Map**: Source column -> target field dropdowns, confidence badges (green/yellow/red), detected language badge, transform selector
3. **Preview**: Mapped data table with row status (valid/warning/error), duplicate resolution cards (Merge/Create New/Skip), stats summary
4. **Done**: Success animation, stats (products created, inventory loaded, alerts generated), "Go to Dashboard" button

**Design:** Match existing dashboard theme -- saffron accent (#FF9933), dark sidebar, card-based layout, Framer Motion transitions between steps.

---

### Task 2.11: Create sample demo file

**Files:**
- Create: `vyapar-sahayak/public/samples/tally-export-tamil.xlsx`

A sample Excel file with Tamil column headers that ships with the demo:
- Headers: பொருள் பெயர், நிறுவனம், வகை, எம்.ஆர்.பி, விற்பனை விலை, இருப்பு, தொகை, தேதி
- 50 rows of realistic FMCG data
- Mix of Tamil and English product names
- Indian date format (DD/MM/YYYY)
- Currency with Rs. prefix

Used for demo mode and one-click demo: "Try with sample file" button on upload step.

---

## Phase 3-9: Task Outlines (detailed steps written per-phase when executed)

### Phase 3: SSE Streaming + Reasoning Panel
- Create `src/app/api/chat/stream/route.ts` (ReadableStream + SSE events)
- Wrap existing `executeTool()` calls with event emission
- Modify `chat-widget.tsx`: replace fetch+json with stream reader
- Add reasoning panel component (collapsible, tool badges, timing)
- Update NGINX config: `proxy_buffering off` for `/api/chat/stream`

### Phase 4: RAG via pgvector
- Create `src/lib/rag/embed.ts` (Titan Embeddings v2 via Bedrock)
- Create `src/lib/rag/retrieve.ts` (cosine similarity via `prisma.$queryRaw`)
- Create `src/lib/rag/knowledge.ts` (static FMCG domain knowledge)
- Create `src/lib/rag/ingest.ts` (bulk embed products + knowledge)
- Add `query_knowledge_base` tool (#20) to `tools.ts`
- Hook into post-ingestion: embed new products after commit

### Phase 5: Dashboard Enhancements
- Add signal breakdown bar chart (Recharts) to recommendation page
- Add forecast line (dashed) to trend-chart.tsx using existing `forecastDemand()`
- Add Before/After comparison component to landing page
- Add ROI card to dashboard

### Phase 6: Auth + RBAC
- Install next-auth, create `[...nextauth]/route.ts` with CredentialsProvider
- 3 hardcoded users: kalyan (distributor), ravi (salesman), murugan (kirana)
- Wrap demo layout with session provider
- Add role-based tool filtering to agent
- Different dashboard views per role

### Phase 7: Baileys WhatsApp
- Create `whatsapp-service/` with Baileys + Express
- QR auth + session persistence in Postgres
- POST /send, POST /send-campaign endpoints
- Wire `send_campaign` tool to call WhatsApp service
- Fallback to wa.me deep links if service is down

### Phase 8: Observability
- Sign up for Langfuse cloud free tier
- Create `src/lib/observability.ts` with Langfuse client
- Point existing OpenTelemetry deps at Langfuse
- Wrap Bedrock calls with Langfuse traces
- Show traces in demo: cost, tokens, latency

### Phase 9: Polish
- Fix self-calling HTTP anti-pattern in agent-tools.ts
- Extract intent matching to lookup table
- Add SSL via Let's Encrypt + Certbot
- Optimize page load (<1s)
- Pre-cache demo scenarios

---

## Critical File References

| File | Purpose | Phase |
|------|---------|-------|
| `src/app/api/chat/route.ts` | Demo mode bug fixes (5 locations) | 0 |
| `src/lib/ml/clustering.ts` | Fix centroid ranking | 0 |
| `prisma/schema.prisma` | Postgres migration + new models | 1 |
| `src/lib/db.ts` | Simplify (remove LibSQL adapter) | 1 |
| `src/lib/bedrock.ts` | Add `generateTextWithModel()` for Opus | 2 |
| `src/lib/ingest/mapper.ts` | LLM column mapping with Claude Opus | 2 |
| `src/lib/ingest/parsers.ts` | Excel/CSV/PDF parsing | 2 |
| `src/lib/strands/tools.ts` | Add RAG tool (#20) | 4 |
| `src/components/chat/chat-widget.tsx` | SSE streaming + reasoning panel | 3 |
| `src/components/dashboard/sidebar.tsx` | Add "Import Data" nav | 2 |
| `src/lib/cache.ts` | Reuse invalidation patterns | 2 |
| `src/lib/ml/features.ts` | Post-ingestion dead stock detection | 2 |
| `src/lib/ml/scoring.ts` | Reuse for ingested data scoring | 2 |

---

## Verification Checklist

- [ ] Phase 0: Demo chat returns real campaign/alert data (not fallback)
- [ ] Phase 1: `prisma migrate dev` works. Seed loads. App starts with Postgres.
- [ ] Phase 2: Upload Tamil Excel -> AI maps columns (Opus) -> preview validates -> commit -> dashboard shows data
- [ ] Phase 3: Chat streams reasoning panel with tool badges
- [ ] Phase 4: Agent uses RAG tool, cites knowledge in recommendations
- [ ] Phase 5: Dashboard shows forecast line, signal chart, ROI card
- [ ] Phase 6: Login as 3 different roles, see different data/tools
- [ ] Phase 7: "Send them all" -> real WhatsApp message arrives
- [ ] Phase 8: Langfuse shows LLM trace with cost/tokens
- [ ] Phase 9: All pages <1s, HTTPS working, no anti-patterns
