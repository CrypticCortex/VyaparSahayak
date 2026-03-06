## Overview

This feature expands the Prisma schema with five new models (Order, OrderItem, DispatchBatch, DispatchBatchOrder, AgentSuggestion) and one field addition to Campaign, then updates the seed script to populate realistic demo data through the full order-dispatch-suggestion lifecycle. All changes target the existing SQLite database and the single-distributor demo architecture -- no new API routes or UI components are introduced here.

## Architecture

```
prisma/schema.prisma
  |
  +-- Distributor (existing)
  |     |-- orders: Order[]              <-- NEW relation
  |     |-- dispatchBatches: DispatchBatch[]  <-- NEW relation
  |     |-- suggestions: AgentSuggestion[]    <-- NEW relation
  |     |-- (existing: zones, inventory, alerts, campaigns, whatsappGroups)
  |
  +-- Campaign (existing)
  |     |-- orderLink: String?           <-- NEW field
  |     |-- orders: Order[]              <-- NEW relation
  |
  +-- Retailer (existing)
  |     |-- orders: Order[]              <-- NEW relation
  |
  +-- Product (existing)
  |     |-- orderItems: OrderItem[]      <-- NEW relation
  |
  +-- Order ---------------------- NEW
  |     |-- items: OrderItem[]
  |     |-- batchLinks: DispatchBatchOrder[]
  |
  +-- OrderItem ------------------ NEW
  |
  +-- DispatchBatch -------------- NEW
  |     |-- orders: DispatchBatchOrder[]
  |
  +-- DispatchBatchOrder --------- NEW (join table)
  |
  +-- AgentSuggestion ------------ NEW

src/app/api/seed/route.ts
  |-- Updated deletion order (new tables first)
  |-- After existing seed logic:
  |     +-- Generate order tokens + campaign orderLinks
  |     +-- Create 11 demo orders with OrderItems
  |     +-- Create 1 DispatchBatch with 2 DispatchBatchOrders
  |     +-- Create 4 AgentSuggestions
```

## Components and Interfaces

### 1. Prisma Schema Expansion

**File:** `prisma/schema.prisma`

**Responsibility:** Define the five new models and update existing models with new relations. Each model uses cuid() for IDs, DateTime defaults for timestamps, and explicit relation fields for foreign keys.

### 2. Seed Data Constants

**File:** `src/lib/seed/data.ts`

**Responsibility:** Export new constants or helper data for order generation. This may include a `generateOrderToken()` function and demo order templates. Alternatively, the order seed logic can live entirely in the seed route if the data is procedurally generated.

### 3. Seed Route Expansion

**File:** `src/app/api/seed/route.ts`

**Responsibility:** Extended seed logic that runs after the existing base data + detection + campaign generation. Handles: (a) generating order tokens and patching campaign orderLinks, (b) creating demo orders with items, (c) creating a dispatch batch, (d) creating agent suggestions. The deletion block at the top is updated to include new tables in the correct order.

## Data Models

### Order

| Field | Type | Constraints | Notes |
|---|---|---|---|
| id | String | @id @default(cuid()) | Primary key |
| token | String | @unique | URL-safe token for retailer-facing links |
| retailerId | String | FK -> Retailer | Who placed the order |
| distributorId | String | FK -> Distributor | Who fulfills the order |
| status | String | One of: pending, confirmed, dispatched, delivered, cancelled | Default "pending" |
| totalAmount | Float | | Sum of all OrderItem totals |
| notes | String? | Optional | Free-text notes |
| campaignId | String? | Optional FK -> Campaign | Which campaign drove this order |
| zoneCode | String | | Denormalized zone for quick filtering |
| createdAt | DateTime | @default(now()) | |
| confirmedAt | DateTime? | Optional | Set when status moves to confirmed |
| dispatchedAt | DateTime? | Optional | Set when status moves to dispatched |
| deliveredAt | DateTime? | Optional | Set when status moves to delivered |

**Relations:** retailer (Retailer), distributor (Distributor), campaign (Campaign, optional), items (OrderItem[]), batchLinks (DispatchBatchOrder[])

**Validation:** token must be unique across all orders. totalAmount should equal the sum of item totals (enforced at application level, not DB constraint). status must be one of the five allowed values.

### OrderItem

| Field | Type | Constraints | Notes |
|---|---|---|---|
| id | String | @id @default(cuid()) | |
| orderId | String | FK -> Order | |
| productId | String | FK -> Product | |
| quantity | Int | | Must be >= 1 |
| unitPrice | Float | | Price per unit at time of order |
| discount | Float | @default(0) | Discount amount per unit |
| total | Float | | quantity * (unitPrice - discount) |

**Relations:** order (Order), product (Product)

### DispatchBatch

| Field | Type | Constraints | Notes |
|---|---|---|---|
| id | String | @id @default(cuid()) | |
| distributorId | String | FK -> Distributor | |
| zoneCode | String | | Target delivery zone |
| status | String | One of: planned, dispatched, delivered | Default "planned" |
| vehicleInfo | String? | Optional | Vehicle number or description |
| plannedDate | DateTime | | Scheduled dispatch date |
| dispatchedAt | DateTime? | Optional | Actual dispatch timestamp |
| notes | String? | Optional | |
| createdAt | DateTime | @default(now()) | |

**Relations:** distributor (Distributor), orders (DispatchBatchOrder[])

### DispatchBatchOrder

| Field | Type | Constraints | Notes |
|---|---|---|---|
| id | String | @id @default(cuid()) | |
| batchId | String | FK -> DispatchBatch | |
| orderId | String | FK -> Order | |

**Relations:** batch (DispatchBatch), order (Order)

**Note:** This is a many-to-many join table. An order can appear in multiple batches (e.g., partial shipments in future), and a batch groups multiple orders.

### AgentSuggestion

| Field | Type | Constraints | Notes |
|---|---|---|---|
| id | String | @id @default(cuid()) | |
| distributorId | String | FK -> Distributor | |
| type | String | One of: order_intelligence, stock_rebalance, campaign_performance | Category of suggestion |
| title | String | | Short headline |
| description | String | | Detailed explanation |
| actionType | String | | What action to take (e.g., "create_order", "rebalance", "boost_campaign") |
| actionPayload | String | | JSON string with action parameters |
| priority | String | One of: high, medium, low | |
| status | String | One of: pending, acted, dismissed | Default "pending" |
| createdAt | DateTime | @default(now()) | |
| actedAt | DateTime? | Optional | When the distributor acted on or dismissed this |

**Relations:** distributor (Distributor)

### Campaign (updated)

| Field | Type | Change |
|---|---|---|
| orderLink | String? | NEW optional field -- URL where retailers can place orders for this campaign's product |
| orders | Order[] | NEW relation -- orders placed through this campaign |

## Key Decisions

### Decision: Many-to-many via explicit join table for DispatchBatch-Order

- **Context:** A dispatch batch contains multiple orders, and in the future an order could be split across batches (partial shipments).
- **Options:** (a) Implicit many-to-many via Prisma's `@relation` syntax; (b) Explicit join table (DispatchBatchOrder) with its own ID.
- **Choice:** Explicit join table. It gives us a place to add future fields (e.g., sequence in loading, partial quantity) and is more transparent in SQLite. Prisma's implicit many-to-many creates a hidden join table with no control over naming or extra columns.

### Decision: Store actionPayload as JSON String, not a structured model

- **Context:** AgentSuggestion's actionPayload varies by suggestion type -- order intelligence payloads look different from stock rebalance payloads.
- **Options:** (a) Separate payload tables per type; (b) A generic JSON column; (c) String field containing JSON.
- **Choice:** String field with JSON content. SQLite does not have a native JSON column type, and Prisma on SQLite maps `Json` to a String anyway. Consumers parse the string at read time. This keeps the schema simple and avoids proliferating small tables for each suggestion type.

### Decision: Denormalized zoneCode on Order

- **Context:** Orders need to be filterable by zone for dispatch planning.
- **Options:** (a) Join through Retailer -> Zone to get the zone code; (b) Store zoneCode directly on Order.
- **Choice:** Denormalized zoneCode on Order. Avoids a multi-hop join for the most common query pattern (list orders by zone). The zone code is stable and set at order creation time. Acceptable tradeoff for a demo system.

### Decision: Deterministic token generation in seed

- **Context:** Order tokens must be unique. Random generation during seeding could theoretically collide, and non-deterministic seeds make debugging harder.
- **Options:** (a) Random UUIDs; (b) nanoid; (c) Deterministic tokens based on a seed index or campaign ID.
- **Choice:** Deterministic tokens using a prefix + index pattern (e.g., "ord-" + a short hash). For the seed script this guarantees uniqueness and reproducibility. The production token generator (out of scope) can use nanoid or crypto.randomUUID.

## Error Handling

### Schema migration failures

If `prisma db push` or `prisma migrate dev` fails due to schema conflicts, the developer must delete the SQLite database file and re-run migration + seed. This is acceptable for a demo project with no production data.

### Seed script foreign key ordering

The deletion block must delete in reverse-dependency order: OrderItem and DispatchBatchOrder first (they reference Order), then Order (references Campaign, Retailer, Distributor), then DispatchBatch, then AgentSuggestion, then existing tables in their current order. Getting this wrong causes foreign key constraint errors. The seed route will delete tables in the exact documented order.

### Invalid product references in OrderItems

The seed creates OrderItems using product IDs from the `productMap` built during product seeding. If a SKU is referenced that does not exist in the map, the seed should skip that item rather than crash. A defensive lookup with a fallback prevents partial seed failures.

### Campaign orderLink generation before campaigns exist

The seed must generate campaigns first (via the existing detection + recommendation flow) before adding orderLinks. The seed route already does this -- the new code appends after campaign creation.

## Testing Strategy

### Schema validation

Run `npx prisma validate` after schema changes to confirm the schema is syntactically correct and all relations resolve. Run `npx prisma db push` against a fresh SQLite file to confirm migration succeeds.

### Seed script smoke test

Run the seed endpoint (POST /api/seed) once and verify:
- Response JSON includes updated stats (order count, batch count, suggestion count)
- Database contains 11 orders with varying statuses (6 pending, 3 confirmed, 2 dispatched)
- Each order has 1-4 OrderItems with valid product references
- 1 DispatchBatch exists for TN-URB with 2 linked orders
- 3-4 AgentSuggestions exist with varied types and priorities
- All Campaign records have an orderLink value
- Re-running the seed does not fail (clean-slate deletion works)

### Relation integrity spot checks

Query a few orders and verify `.items`, `.retailer`, `.distributor`, and `.campaign` relations load correctly via Prisma `include`. Query the dispatch batch and verify `.orders` loads with the join table. These are manual Prisma REPL or script-based checks, not a full test suite.
