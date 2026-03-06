## Overview

The proactive suggestion system runs server-side analyzer functions that query distributor data for actionable signals across three categories (order intelligence, stock rebalancing, campaign performance), creates AgentSuggestion records in the database, and surfaces them via API routes consumed by both the dashboard UI (SuggestionCard components) and the Strands agent (generate_proactive_suggestions tool). Each suggestion carries an actionType and JSON payload that the UI maps to a specific user action -- navigating to a page, calling an API, or opening a WhatsApp link.

## Architecture

```
+------------------------------------------------------+
|  Browser                                             |
|                                                      |
|  /demo (Dashboard)        /demo/orders               |
|    +-- <SuggestionCard /> +-- <SuggestionCard />     |
|    |   (max 5, priority-sorted)                      |
|    |                                                 |
|    +-- on load: GET /api/suggestions                 |
|    +-- dismiss: PATCH /api/suggestions/[id]          |
|    +-- action:  navigate or API call per actionType  |
+----------------------------|-------------------------+
                             |
                             v
+------------------------------------------------------+
|  API Routes                                          |
|                                                      |
|  POST /api/suggestions/generate                      |
|    1. Get distributorId                              |
|    2. Run all analyzers in parallel                  |
|    3. Deduplicate against existing pending            |
|    4. Create AgentSuggestion records                 |
|    5. Return new suggestions                         |
|                                                      |
|  GET /api/suggestions                                |
|    - Query pending suggestions, <24h old             |
|    - Order by priority (high > medium > low)         |
|                                                      |
|  PATCH /api/suggestions/[id]                         |
|    - Update status to acted/dismissed                |
|    - Set actedAt timestamp                           |
+----------------------------|-------------------------+
                             |
                             v
+------------------------------------------------------+
|  Analyzer Functions (src/lib/suggestions/)           |
|                                                      |
|  order-intelligence.ts                               |
|    - analyzeRetailerActivity(distributorId)           |
|    - analyzeZoneOrderClusters(distributorId)          |
|    - analyzeLargeOrders(distributorId)                |
|    - analyzeStockVsOrders(distributorId)              |
|                                                      |
|  stock-rebalancing.ts                                |
|    - analyzeIdleVsActive(distributorId)               |
|    - analyzeExpiryUrgency(distributorId)              |
|    - analyzePostOrderDepletion(distributorId)         |
|                                                      |
|  campaign-performance.ts                             |
|    - analyzeCampaignConversion(distributorId)          |
|    - analyzeZoneConversion(distributorId)              |
|    - analyzePosterPerformance(distributorId)           |
+----------------------------|-------------------------+
                             |
                             v
+------------------------------------------------------+
|  Prisma / SQLite                                     |
|  - AgentSuggestion (from data-model-expansion spec)  |
|  - Order, OrderItem, Inventory, Campaign, Retailer   |
+------------------------------------------------------+

Strands Agent Integration:
  generate_proactive_suggestions tool
    -> calls POST /api/suggestions/generate internally
    -> returns suggestions for conversational presentation
```

## Components and Interfaces

### 1. Order Intelligence Analyzer

**File:** `src/lib/suggestions/order-intelligence.ts`

**Responsibility:** Detect actionable patterns in order data -- inactive retailers, zone order clusters, unusually large orders, and orders exceeding zone stock.

**Exported functions:**
- `analyzeRetailerActivity(distributorId: string)`: Queries all retailers and their orders. For each retailer with 2+ historical orders, computes average order frequency. If days since last order exceeds 1.5x the average frequency, generates a "send_checkin" suggestion.
- `analyzeZoneOrderClusters(distributorId: string)`: Groups pending orders by zoneCode. For zones with 3+ pending orders, computes total value and generates a "create_batch" suggestion.
- `analyzeLargeOrders(distributorId: string)`: For each pending order, compares totalAmount against the retailer's historical average. If 3x or more, generates a "confirm_stock" suggestion.
- `analyzeStockVsOrders(distributorId: string)`: Aggregates pending order quantities per product per zone. Compares against zone inventory. If orders exceed stock, generates a "transfer_stock" suggestion identifying a source zone with surplus.

**Return type:** `SuggestionInput[]` (see Data Models below).

### 2. Stock Rebalancing Analyzer

**File:** `src/lib/suggestions/stock-rebalancing.ts`

**Responsibility:** Detect inventory imbalances -- idle stock in one zone while another sells, approaching expiry, and post-order depletion risks.

**Exported functions:**
- `analyzeIdleVsActive(distributorId: string)`: For each product, queries sales by zone over the last 14 days. If a product has zero sales in one zone but active sales in another, and the idle zone has stock, generates a "transfer_stock" suggestion.
- `analyzeExpiryUrgency(distributorId: string)`: Queries inventory items expiring within 30 days that still have remaining cases. Reuses expiry logic patterns from the existing ML scoring module. Generates a "flash_sale" suggestion with the product and zone.
- `analyzePostOrderDepletion(distributorId: string)`: For each zone-product combination, subtracts pending order quantities from current inventory. If remaining stock would fall below 20% of current level, generates a "transfer_stock" suggestion.

**Return type:** `SuggestionInput[]`

### 3. Campaign Performance Analyzer

**File:** `src/lib/suggestions/campaign-performance.ts`

**Responsibility:** Analyze sent campaign results -- conversion rates, zone-level response, and poster variant performance.

**Exported functions:**
- `analyzeCampaignConversion(distributorId: string)`: For each sent campaign, counts orders received vs retailers targeted. If some but not all retailers have ordered, generates a "send_reminder" suggestion with the conversion percentage and non-responder count.
- `analyzeZoneConversion(distributorId: string)`: Breaks down campaign response by zone. For zones with zero orders from a sent campaign, generates a "flash_sale" suggestion to try a different approach.
- `analyzePosterPerformance(distributorId: string)`: Compares order counts linked to different poster variants of the same campaign. If one variant has significantly more orders (2x+), generates a "view_campaign" suggestion recommending the better poster. This is simulated with seed data.

**Return type:** `SuggestionInput[]`

### 4. Suggestion Generator Orchestrator

**File:** `src/lib/suggestions/index.ts`

**Responsibility:** Coordinates all analyzers, deduplicates results against existing pending suggestions, and persists new AgentSuggestion records.

**Exported function:**
- `generateSuggestions(distributorId: string)`: Runs all analyzer functions in parallel via `Promise.all`. Collects all `SuggestionInput[]` results. For each input, checks if a pending suggestion with the same type and actionType targeting the same entity (derived from actionPayload) already exists. If not, creates the AgentSuggestion record. Returns the array of newly created suggestions.

### 5. API Route -- Generate Suggestions

**File:** `src/app/api/suggestions/generate/route.ts`

**Responsibility:** POST endpoint that triggers suggestion generation. Gets the distributor ID from the cached distributor (same pattern as other API routes), calls `generateSuggestions`, and returns the results.

**Request:** POST with empty body (distributor context comes from the single-distributor demo setup).
**Response:** `{ suggestions: AgentSuggestion[] }`

### 6. API Route -- List Suggestions

**File:** `src/app/api/suggestions/route.ts`

**Responsibility:** GET endpoint that returns pending suggestions for the distributor. Filters to status "pending" and createdAt within the last 24 hours. Orders by priority (high > medium > low) then by createdAt descending.

**Response:** `{ suggestions: AgentSuggestion[] }`

### 7. API Route -- Update Suggestion

**File:** `src/app/api/suggestions/[id]/route.ts`

**Responsibility:** PATCH endpoint to update a suggestion's status. Accepts `{ status: "acted" | "dismissed" }` in the body. Sets actedAt to current timestamp.

**Request:** `{ status: "acted" | "dismissed" }`
**Response:** `{ suggestion: AgentSuggestion }`

### 8. SuggestionCard Component

**File:** `src/components/dashboard/suggestion-card.tsx`

**Responsibility:** Renders a single suggestion as a card with title, description, action button, and dismiss button. Maps actionType to the appropriate behavior:
- "send_checkin": opens WhatsApp link with a pre-filled check-in message
- "create_batch": navigates to /demo/orders with zone filter
- "send_reminder": calls a re-send endpoint for the campaign
- "transfer_stock": displays transfer details (manual action, no automation)
- "flash_sale": navigates to campaign creation with pre-filled product
- "view_campaign": navigates to campaign detail page
- "confirm_stock": navigates to the order detail

**Props:**
- `suggestion: AgentSuggestion`
- `onDismiss: (id: string) => void`
- `onAction: (suggestion: AgentSuggestion) => void`

### 9. SuggestionList Component

**File:** `src/components/dashboard/suggestion-list.tsx`

**Responsibility:** Renders a list of SuggestionCard components. Handles the "max 5 shown" logic with a "Show more" button. Fetches suggestions on mount via GET /api/suggestions. Manages local state for optimistic dismiss updates.

**Props:**
- `maxVisible?: number` (default 5)

### 10. Strands Agent Tool

**File:** Updated in the existing agent tools module (e.g., `src/lib/agent-tools.ts` or Strands tool definition file).

**Responsibility:** Adds a `generate_proactive_suggestions` tool that the Strands agent can invoke. Internally calls POST /api/suggestions/generate (or imports `generateSuggestions` directly). Returns suggestion summaries formatted for conversational presentation.

## Data Models

### SuggestionInput (internal type)

```typescript
interface SuggestionInput {
  type: "order_intelligence" | "stock_rebalance" | "campaign_performance"
  title: string
  description: string
  actionType: "send_checkin" | "create_batch" | "send_reminder" | "transfer_stock" | "flash_sale" | "view_campaign" | "confirm_stock"
  actionPayload: Record<string, unknown>
  priority: "high" | "medium" | "low"
}
```

This is the shape returned by each analyzer function. The orchestrator converts it to an AgentSuggestion Prisma create input by adding distributorId, serializing actionPayload to a JSON string, and defaulting status to "pending".

### AgentSuggestion (Prisma model -- defined in data-model-expansion spec)

The AgentSuggestion model is already defined in the data-model-expansion spec with fields: id, distributorId, type, title, description, actionType, actionPayload (JSON as String), priority, status, createdAt, actedAt. This feature consumes and creates records of this model -- it does not modify the schema.

### Action Payload Shapes

Each actionType has a specific payload structure:

| actionType | Payload Shape |
|---|---|
| send_checkin | `{ retailerId: string, retailerName: string }` |
| create_batch | `{ zoneCode: string }` |
| send_reminder | `{ campaignId: string }` |
| transfer_stock | `{ productId: string, fromZone: string, toZone: string, quantity: number }` |
| flash_sale | `{ productId: string, zoneCode: string }` |
| view_campaign | `{ campaignId: string }` |
| confirm_stock | `{ orderId: string }` |

## Key Decisions

### Decision: Run analyzers on-demand, not on a schedule

- **Context:** Suggestions need to reflect current data. Options include background cron jobs, real-time event triggers, or on-demand generation.
- **Options:** (a) Background job that runs every N minutes; (b) Event-driven triggers on order creation, stock changes; (c) On-demand API call triggered by dashboard load or chat request.
- **Choice:** On-demand via POST /api/suggestions/generate. The demo has no background job infrastructure, and event-driven triggers add complexity. Calling generate on dashboard load or from the chat gives fresh suggestions without extra infrastructure. Stale suggestions (>24h) are filtered out on read.

### Decision: Deduplication by type + actionType + entity key

- **Context:** If generate is called multiple times without the underlying data changing, we should not create duplicate suggestions for the same signal.
- **Options:** (a) Delete all pending suggestions before regenerating; (b) Check for existing pending suggestions before creating; (c) Use upsert with a composite key.
- **Choice:** Check for existing pending suggestions before creating. The orchestrator derives a deduplication key from type + actionType + a primary entity identifier from the payload (e.g., retailerId for send_checkin, zoneCode for create_batch). If a pending suggestion with the same key exists, it is skipped. This preserves suggestions the user hasn't acted on yet without creating duplicates.

### Decision: Analyzers return raw inputs, orchestrator handles persistence

- **Context:** Each analyzer could directly create database records, or return data for centralized persistence.
- **Options:** (a) Each analyzer writes to the database directly; (b) Analyzers return suggestion inputs, orchestrator batch-creates.
- **Choice:** Analyzers return SuggestionInput arrays, orchestrator handles deduplication and persistence. This keeps analyzers as pure query-and-compute functions that are easy to test in isolation. The orchestrator handles the cross-cutting concern of deduplication.

### Decision: 24-hour staleness window

- **Context:** Suggestions lose relevance as data changes. Old suggestions should not clutter the UI.
- **Options:** (a) Manual expiry by the user; (b) Fixed time window; (c) Re-validation on each read.
- **Choice:** 24-hour window. Suggestions older than 24 hours are excluded from GET /api/suggestions results. This is simple, predictable, and appropriate for a daily-use tool. The generate endpoint creates fresh suggestions on each call, and stale ones naturally disappear.

### Decision: SuggestionCard as a shared component on multiple pages

- **Context:** Suggestions are relevant on both the main dashboard and the orders page.
- **Options:** (a) Show suggestions only on a dedicated page; (b) Show suggestions on relevant pages via a shared component.
- **Choice:** Shared SuggestionList component placed on /demo and /demo/orders. Order intelligence suggestions are most relevant on the orders page, while stock and campaign suggestions fit the main dashboard. The component fetches its own data and manages its own state, so placement is a one-line import.

## Error Handling

### Analyzer failures

Each analyzer function is wrapped in try/catch within the orchestrator. If one analyzer fails (e.g., database query error), the orchestrator logs the error and continues with the remaining analyzers. Partial results are better than no results. The error is included in the API response as a warnings array.

### Empty data scenarios

Analyzers check for minimum data requirements before generating suggestions. For example, analyzeRetailerActivity requires a retailer to have at least 2 historical orders to compute frequency. If data is insufficient, the analyzer returns an empty array -- no error, no suggestion.

### Invalid actionPayload on read

The SuggestionCard component parses actionPayload with try/catch. If parsing fails, the card renders with a generic "View details" action that navigates to the relevant section of the dashboard, and the dismiss button still works.

### Concurrent generate calls

If two generate calls happen simultaneously (e.g., dashboard load + chat request), the deduplication check may not catch all duplicates due to race conditions. This is acceptable for a single-user demo. The GET endpoint deduplicates by returning distinct suggestions, and the UI handles duplicates gracefully.

### Missing referenced entities

If a suggestion references a retailer, order, or campaign that has been deleted (e.g., after a re-seed), the action button should handle the 404 gracefully -- show a toast saying the referenced item no longer exists and auto-dismiss the suggestion.

## Testing Strategy

### Unit tests -- analyzer functions

Test each of the 10 analyzer functions individually against seeded test data:
- Verify that known signal patterns produce the expected suggestion inputs (correct type, actionType, priority, payload).
- Verify that edge cases (insufficient data, no matching records) return empty arrays.
- Verify that threshold logic works correctly (e.g., 3x average for large orders, 14-day idle window, 30-day expiry window).

### Unit tests -- orchestrator

Test the generateSuggestions function:
- Mock analyzers to return known inputs and verify AgentSuggestion records are created.
- Verify deduplication: call generate twice with the same data, confirm no duplicates.
- Verify partial failure: mock one analyzer to throw, confirm others still produce results.

### API route tests

Test each of the three routes:
- POST /api/suggestions/generate: verify it returns suggestions and creates DB records.
- GET /api/suggestions: verify priority ordering, 24-hour staleness filter, and status filter.
- PATCH /api/suggestions/[id]: verify status update and actedAt timestamp.

### Component tests -- SuggestionCard

- Renders title, description, action button, and dismiss button.
- Dismiss button calls onDismiss with the correct ID.
- Action button calls onAction with the full suggestion object.
- Priority styling differs between high, medium, and low.

### Component tests -- SuggestionList

- Renders max 5 cards when more suggestions exist, shows "Show more" button.
- "Show more" reveals remaining cards.
- Dismiss removes the card optimistically from the list.

### Integration smoke test

Run the full flow: seed the database, call POST /api/suggestions/generate, verify suggestions are created, call GET /api/suggestions, verify they appear in priority order, dismiss one via PATCH, verify it no longer appears in GET results.
