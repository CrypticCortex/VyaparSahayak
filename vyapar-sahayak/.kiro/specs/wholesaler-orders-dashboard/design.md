## Overview

The wholesaler orders dashboard adds two new pages (/demo/orders and /demo/orders/batches) backed by five CRUD API routes that operate directly on the Order, DispatchBatch, DispatchBatchOrder, and AgentSuggestion Prisma models introduced in the data-model-expansion spec. The pages use a server-component-first approach for initial data fetching with client components handling interactivity (confirm/reject actions, batch creation, expand/collapse). No LLM or agent loop is involved -- these are straightforward database reads and writes through Prisma, with cached distributor context from the existing cache layer.

## Architecture

```
+--------------------------------------------------+
|  Browser (React 19)                              |
|                                                  |
|  /demo/orders (OrderDashboard - server)          |
|    +-- SuggestionCard[] (client)                 |
|    +-- SummaryBar (server)                       |
|    +-- ZoneOrderGroup[] (client)                 |
|         +-- OrderCard[] (client)                 |
|              +-- Confirm / Reject buttons        |
|         +-- "Create Dispatch Batch" button       |
|                                                  |
|  /demo/orders/batches (BatchList - server)       |
|    +-- BatchCard[] (client)                      |
|         +-- Expandable order list                |
|         +-- Mark Dispatched / Delivered buttons  |
|                                                  |
|  BottomNav (updated with Orders tab + badge)     |
+--------------------------------------------------+
        |
        | fetch calls
        v
+--------------------------------------------------+
|  API Routes (Next.js Route Handlers)             |
|                                                  |
|  GET  /api/orders          -> grouped by zone    |
|  PATCH /api/orders/[id]    -> status update      |
|  POST  /api/orders/batch   -> create batch       |
|  GET  /api/orders/batches  -> grouped by status  |
|  PATCH /api/orders/batch/[id] -> batch status    |
+--------------------------------------------------+
        |
        v
+--------------------------------------------------+
|  Prisma + SQLite                                 |
|  Order, OrderItem, DispatchBatch,                |
|  DispatchBatchOrder, AgentSuggestion             |
|  (from data-model-expansion spec)                |
+--------------------------------------------------+
```

## Components and Interfaces

### 1. OrderDashboard (server component)

**File:** `src/app/demo/orders/page.tsx`

**Responsibility:** Top-level page for /demo/orders. Fetches orders grouped by zone and agent suggestions server-side, then renders SuggestionCard components and ZoneOrderGroup components. Also renders the summary bar (total pending, today's value, zone mini chart).

**Data fetching:** Calls `getCachedDistributor()` to get the distributor ID, then fetches orders via the internal `getOrdersGroupedByZone(distributorId)` helper and suggestions via `getAgentSuggestions(distributorId, "order_intelligence")`.

### 2. ZoneOrderGroup (client component)

**File:** `src/components/dashboard/zone-order-group.tsx`

**Responsibility:** Renders a collapsible group of orders for a single zone. Shows a zone header with name, order count, and total value. Lists OrderCard components for each order. Includes a "Create Dispatch Batch" button at the bottom that calls POST /api/orders/batch.

**Props:**
- `zoneName: string`
- `zoneCode: string`
- `orders: OrderWithDetails[]`
- `totalValue: number`
- `defaultExpanded: boolean`

**Key behaviors:**
- Collapsible with chevron toggle, first 2 zones expanded by default
- "Create Dispatch Batch" button enabled only when confirmed orders exist in the zone
- On batch creation: calls API, removes dispatched orders from the local list via state update

### 3. OrderCard (client component)

**File:** `src/components/dashboard/order-card.tsx`

**Responsibility:** Displays a single order with retailer name, product name, quantity, amount, time-ago string, and status badge. Shows Confirm and Reject buttons when status is "pending".

**Props:**
- `order: { id, retailerName, productName, quantity, totalAmount, status, createdAt }`
- `onStatusChange: (id: string, status: string) => void`

**Key behaviors:**
- Optimistic UI update on confirm/reject -- updates local state immediately, reverts on API failure
- Time-ago display computed from createdAt using a simple relative time formatter
- Status badge color: pending=amber, confirmed=blue, dispatched=indigo, delivered=green, rejected=red

### 4. SuggestionCard (client component)

**File:** `src/components/dashboard/suggestion-card.tsx`

**Responsibility:** Displays an agent suggestion with title, description, priority indicator, "Do it" action button, and "X" dismiss button.

**Props:**
- `suggestion: { id, title, description, actionType, actionPayload, priority }`
- `onAction: (suggestion) => void`
- `onDismiss: (id: string) => void`

**Key behaviors:**
- "Do it" button calls the appropriate API endpoint based on actionType (parsed from actionPayload)
- "X" dismiss button calls PATCH /api/suggestions/[id] with status "dismissed"
- Priority indicator: high=red dot, medium=amber dot, low=gray dot

### 5. BatchList (server component)

**File:** `src/app/demo/orders/batches/page.tsx`

**Responsibility:** Top-level page for /demo/orders/batches. Fetches all dispatch batches grouped by status (planned, dispatched, delivered) and renders BatchCard components under status section headers.

### 6. BatchCard (client component)

**File:** `src/components/dashboard/batch-card.tsx`

**Responsibility:** Displays a dispatch batch with zone name, order count, total value, vehicle info, and planned date. Expandable to show the individual orders within the batch. Shows status-appropriate action buttons.

**Props:**
- `batch: { id, zoneCode, zoneName, status, orderCount, totalValue, vehicleInfo, plannedDate, orders: OrderSummary[] }`
- `onStatusChange: (batchId: string, status: string) => void`

**Key behaviors:**
- Tap to expand/collapse order list
- "Mark Dispatched" shown when status is "planned"
- "Mark Delivered" shown when status is "dispatched"
- No action buttons when status is "delivered"

## Data Models

All database models (Order, OrderItem, DispatchBatch, DispatchBatchOrder, AgentSuggestion) are defined in the data-model-expansion spec. This feature consumes those models through Prisma queries. The key TypeScript interfaces used in components:

```typescript
// Returned by GET /api/orders
interface ZoneOrderGroup {
  zoneCode: string
  zoneName: string
  orders: OrderWithDetails[]
  totalValue: number
  orderCount: number
}

interface OrderWithDetails {
  id: string
  retailerName: string
  productName: string
  quantity: number
  totalAmount: number
  status: string
  createdAt: string
}

// Returned by GET /api/orders/batches
interface BatchWithOrders {
  id: string
  zoneCode: string
  zoneName: string
  status: string
  orderCount: number
  totalValue: number
  vehicleInfo: string | null
  plannedDate: string
  orders: OrderSummary[]
}

interface OrderSummary {
  id: string
  retailerName: string
  totalAmount: number
  status: string
}
```

## Key Decisions

### Decision: Direct CRUD API routes, no agent loop

- **Context:** The chatbot feature uses a Bedrock Converse agent loop for natural language interaction. The orders dashboard is a structured UI with known actions.
- **Options:** (a) Route order actions through the chatbot agent; (b) Build direct CRUD API routes.
- **Choice:** Direct CRUD routes. Order management is a well-defined workflow with explicit buttons -- there is no ambiguity that requires LLM interpretation. Direct routes are faster, simpler to test, and do not consume Bedrock API credits. The agent can still reference order data via its existing tools.

### Decision: Server components for page-level data fetching

- **Context:** Both /demo/orders and /demo/orders/batches need to load data on initial render.
- **Options:** (a) Client-side fetching with useEffect; (b) Server components with direct Prisma access.
- **Choice:** Server components. This matches the existing pattern in the VyaparSahayak dashboard where pages are server components that fetch data and pass it to client components for interactivity. Avoids loading spinners on initial page load and keeps data fetching on the server close to the database.

### Decision: Zone-grouped response from GET /api/orders

- **Context:** Orders could be returned as a flat list and grouped client-side, or grouped server-side.
- **Options:** (a) Flat list, client groups; (b) Pre-grouped by zone in the API response.
- **Choice:** Pre-grouped by zone. The primary view is always zone-grouped, so doing the grouping in the API avoids redundant client-side logic. The API uses a Prisma query with groupBy or manual grouping after fetch. If a flat list is ever needed, a separate endpoint or query param can handle it.

### Decision: Optimistic UI for order status changes

- **Context:** When a distributor confirms or rejects an order, the UI should feel responsive.
- **Options:** (a) Wait for API response before updating UI; (b) Optimistic update with rollback on failure.
- **Choice:** Optimistic update. Confirm/reject are high-frequency actions when processing a batch of orders. Waiting for each round-trip would feel sluggish. The client updates the status badge and hides action buttons immediately, then reverts if the PATCH call fails.

### Decision: Cached distributor lookup for API routes

- **Context:** API routes need the distributorId to scope queries.
- **Options:** (a) Pass distributorId as a query param; (b) Use getCachedDistributor() from src/lib/cache.ts.
- **Choice:** getCachedDistributor() from cache, matching the existing pattern used by other API routes like /api/detect. The demo always has exactly one distributor, so the cache lookup is simple and consistent.

## Error Handling

### API route errors

All five API routes follow the existing error pattern: try/catch around Prisma operations, returning JSON error responses with appropriate HTTP status codes (400 for bad input, 404 for not found, 500 for unexpected errors). Each error response includes a `{ error: string }` body.

### Invalid status transitions

PATCH /api/orders/[id] and PATCH /api/orders/batch/[id] validate that the requested status transition is valid (e.g., cannot go from "pending" to "delivered" directly). Invalid transitions return 400 with a descriptive error message.

### Empty data states

When no orders or batches exist, pages render an empty state component with a helpful message instead of blank space. The API routes return empty arrays (not errors) when no data matches the query.

### Optimistic update rollback

If a PATCH call fails after an optimistic UI update, the component reverts to the previous state and shows a toast or inline error message. The error is caught in the onClick handler's try/catch block.

### Batch creation with no eligible orders

The "Create Dispatch Batch" button is disabled when no confirmed orders exist in the zone. If somehow POST /api/orders/batch receives an empty orderIds array, it returns 400.

## Testing Strategy

### API route tests

Test each of the 5 API routes against the seeded SQLite database:
- GET /api/orders returns correctly grouped zones with accurate counts and totals
- PATCH /api/orders/[id] updates status and sets the right timestamp field
- POST /api/orders/batch creates batch, join records, and updates order statuses
- GET /api/orders/batches returns batches grouped by status with nested orders
- PATCH /api/orders/batch/[id] cascades status to all orders in the batch
- Verify 400 responses for invalid inputs and status transitions

### Component tests

- ZoneOrderGroup: renders order list, collapse/expand toggle works, batch button disabled state
- OrderCard: shows correct status badge, Confirm/Reject buttons visible only for pending orders
- SuggestionCard: action and dismiss callbacks fire with correct arguments
- BatchCard: expand to show orders, correct action buttons per status

### Manual smoke tests

1. Navigate to /demo/orders -- verify zones render with correct order counts
2. Confirm an order -- verify badge updates and buttons disappear
3. Create a dispatch batch from a zone -- verify orders move to dispatched
4. Navigate to /demo/orders/batches -- verify batch appears under correct status
5. Mark batch as delivered -- verify all orders in batch show as delivered
6. Check bottom nav badge updates after confirming/dispatching orders
7. Test on 375px viewport -- verify layout does not break
