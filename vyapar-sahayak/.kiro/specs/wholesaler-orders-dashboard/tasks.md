## Implementation Tasks

- [ ] 1. Orders API Routes
  - [ ] 1.1 Create GET /api/orders route in `src/app/api/orders/route.ts`
    - Accept distributorId from getCachedDistributor() and optional status query param
    - Query Order with included OrderItem, Retailer, and Product relations via Prisma
    - Group orders by zoneCode, compute totalValue and orderCount per zone
    - Return array of { zoneCode, zoneName, orders, totalValue, orderCount }
    - _Refs: R-orders-api, R-zone-grouped-response_
  - [ ] 1.2 Create PATCH /api/orders/[id] route in `src/app/api/orders/[id]/route.ts`
    - Accept { status } in request body, validate allowed values: confirmed, rejected, dispatched, delivered
    - Validate status transitions (pending->confirmed, pending->rejected, confirmed->dispatched, dispatched->delivered)
    - Set confirmedAt/dispatchedAt/deliveredAt timestamp based on new status
    - Return updated order
    - _Refs: R-order-status-update, R-invalid-status-transition_
  - [ ] 1.3 Create POST /api/orders/batch route in `src/app/api/orders/batch/route.ts`
    - Accept { zoneCode, orderIds, vehicleInfo?, plannedDate }
    - Validate orderIds is non-empty array
    - Create DispatchBatch record with distributorId from cache
    - Create DispatchBatchOrder join records for each orderId
    - Update all included orders' status to "dispatched" and set dispatchedAt
    - Return created batch with orders
    - _Refs: R-batch-creation, R-batch-order-status_
  - [ ] 1.4 Create GET /api/orders/batches route in `src/app/api/orders/batches/route.ts`
    - Fetch all DispatchBatch records for the distributor with related orders via DispatchBatchOrder joins
    - Include order details (retailerName, totalAmount, status) in each batch
    - Group batches by status: planned, dispatched, delivered
    - Return grouped batches with orderCount and totalValue computed per batch
    - _Refs: R-batch-list, R-batch-grouped-by-status_
  - [ ] 1.5 Create PATCH /api/orders/batch/[id] route in `src/app/api/orders/batch/[id]/route.ts`
    - Accept { status } in body, validate: dispatched or delivered
    - Update batch status
    - If status is "dispatched": set dispatchedAt on all orders in the batch
    - If status is "delivered": set deliveredAt on all orders in the batch
    - Return updated batch
    - _Refs: R-batch-status-cascade_
  - [ ] 1.6 Add cache helpers in `src/lib/cache.ts`
    - Add getCachedOrders(distributorId, status?) function
    - Add getCachedBatches(distributorId) function
    - Follow existing caching patterns (unstable_cache or simple Prisma queries)
    - _Refs: R-cache-helpers_
  - [ ] 1.7 Write tests for orders API routes
    - Create `src/app/api/orders/__tests__/route.test.ts`
    - Test GET returns zone-grouped orders with correct counts
    - Test PATCH updates status and timestamp fields
    - Test POST /batch creates batch and updates order statuses
    - Test GET /batches returns status-grouped batches
    - Test PATCH /batch/[id] cascades status to orders
    - Test 400 for invalid status transitions and empty orderIds
    - _Refs: R-orders-api, R-batch-creation_

- [ ] 2. Orders Dashboard Page and Components
  - [ ] 2.1 Create OrderDashboard server component at `src/app/demo/orders/page.tsx`
    - Fetch orders grouped by zone using getCachedDistributor() + Prisma query
    - Fetch agent suggestions of type "order_intelligence"
    - Render summary bar: total pending count, today's order value, zone mini chart
    - Render SuggestionCard components for each suggestion
    - Render ZoneOrderGroup components, first 2 expanded by default
    - _Refs: R-orders-dashboard, R-summary-bar, R-suggestion-cards_
  - [ ] 2.2 Create ZoneOrderGroup client component at `src/components/dashboard/zone-order-group.tsx`
    - Props: zoneName, zoneCode, orders[], totalValue, defaultExpanded
    - Zone header with name, order count, total value, chevron toggle
    - Render OrderCard for each order
    - "Create Dispatch Batch" button at bottom, disabled when no confirmed orders
    - On batch creation: call POST /api/orders/batch, update local state
    - Collapsible animation using CSS transitions or framer-motion
    - _Refs: R-zone-group, R-batch-creation_
  - [ ] 2.3 Create OrderCard client component at `src/components/dashboard/order-card.tsx`
    - Props: order data + onStatusChange callback
    - Display retailer name, product, quantity, amount, relative time, status badge
    - Status badge colors: pending=amber, confirmed=blue, dispatched=indigo, delivered=green, rejected=red
    - Confirm/Reject buttons visible only when status is "pending"
    - Optimistic update: call PATCH /api/orders/[id], revert on failure
    - _Refs: R-order-card, R-optimistic-update_
  - [ ] 2.4 Create SuggestionCard client component at `src/components/dashboard/suggestion-card.tsx`
    - Props: suggestion data (id, title, description, actionType, actionPayload, priority)
    - Priority dot indicator: high=red, medium=amber, low=gray
    - "Do it" action button that calls the appropriate API based on actionType
    - "X" dismiss button that calls PATCH /api/suggestions/[id] with status "dismissed"
    - Card animates out on dismiss
    - _Refs: R-suggestion-cards, R-dismiss-suggestion_
  - [ ] 2.5 Write tests for orders dashboard components
    - Test ZoneOrderGroup renders orders, toggles collapse, disables batch button when no confirmed orders
    - Test OrderCard shows correct buttons per status, fires onStatusChange
    - Test SuggestionCard fires action and dismiss callbacks
    - _Refs: R-zone-group, R-order-card, R-suggestion-cards_

- [ ] 3. Dispatch Batches Page and Components
  - [ ] 3.1 Create BatchList server component at `src/app/demo/orders/batches/page.tsx`
    - Fetch batches from getCachedBatches(distributorId)
    - Group by status: planned, dispatched, delivered
    - Render section headers per status group
    - Render BatchCard for each batch
    - Show empty state when no batches exist
    - _Refs: R-batch-list, R-batch-grouped-by-status_
  - [ ] 3.2 Create BatchCard client component at `src/components/dashboard/batch-card.tsx`
    - Props: batch data + onStatusChange callback
    - Display zone name, order count, total value, vehicle info, planned date
    - Expandable: tap to show/hide individual orders in the batch
    - "Mark Dispatched" button when status is "planned"
    - "Mark Delivered" button when status is "dispatched"
    - No action buttons when status is "delivered"
    - On status change: call PATCH /api/orders/batch/[id], update local state
    - _Refs: R-batch-card, R-batch-status-cascade_
  - [ ] 3.3 Write tests for batch components
    - Test BatchCard renders batch details, expands to show orders
    - Test correct action buttons per status
    - Test status change callback fires with correct args
    - _Refs: R-batch-card_

- [ ] 4. Navigation and Dashboard Integration
  - [ ] 4.1 Add Orders tab to BottomNav in `src/components/dashboard/bottom-nav.tsx`
    - Add "Orders" tab with an appropriate icon (e.g., ClipboardList from lucide-react)
    - Link to /demo/orders
    - Show badge with pending order count (fetched via a lightweight query or passed as prop)
    - _Refs: R-nav-orders-tab, R-pending-badge_
  - [ ] 4.2 Update demo layout in `src/app/demo/layout.tsx`
    - Pass pending order count to BottomNav for badge display
    - Ensure Orders tab is properly wired in the navigation array
    - _Refs: R-nav-orders-tab_
  - [ ] 4.3 Add orders hero card and quick action to main dashboard at `src/app/demo/page.tsx`
    - Add "Pending Orders" hero card showing pending count + total pending value
    - Add "View Orders" to the quick actions section, linking to /demo/orders
    - _Refs: R-dashboard-hero-card, R-dashboard-quick-action_
  - [ ] 4.4 End-to-end smoke test
    - Navigate to /demo -- verify Pending Orders hero card shows correct count
    - Tap Orders tab in bottom nav -- verify /demo/orders loads with zone groups
    - Confirm an order, reject an order -- verify UI updates
    - Create a dispatch batch from a zone -- verify batch created
    - Navigate to /demo/orders/batches -- verify batch appears
    - Mark batch as dispatched, then delivered -- verify cascade
    - Check badge count updates after order status changes
    - Test on 375px mobile viewport
    - _Refs: R-orders-dashboard, R-batch-list, R-nav-orders-tab_

## Sequencing Rationale

Tasks are ordered from data layer to UI, matching the dependency chain:

1. **API routes first** (Task 1) because both the orders dashboard and batches page depend on working endpoints. Building the routes first also validates that the Prisma models from the data-model-expansion spec work correctly for the query patterns needed (zone grouping, batch joins, status cascades). Cache helpers are included here since the page components depend on them.

2. **Orders dashboard and components second** (Task 2) because they depend on the GET /api/orders and PATCH /api/orders/[id] routes from Task 1. The ZoneOrderGroup also depends on POST /api/orders/batch. SuggestionCard is independent of orders data but lives on the same page, so it fits naturally in this task group.

3. **Batch page and components third** (Task 3) because they depend on GET /api/orders/batches and PATCH /api/orders/batch/[id] from Task 1, and conceptually follow after orders can be dispatched via Task 2.

4. **Navigation integration last** (Task 4) because it wires completed pages into the existing layout. The bottom nav badge depends on the orders API, and the dashboard hero card depends on cached order data. This is the final glue layer.

Within each task group, subtasks can be developed in sequence (schema/route -> component -> test) but independent components (OrderCard vs SuggestionCard) could be built in parallel.

## Definition of Done

- [ ] GET /api/orders returns orders grouped by zone with correct totals
- [ ] PATCH /api/orders/[id] updates order status with appropriate timestamps
- [ ] POST /api/orders/batch creates batch, join records, and cascades status to orders
- [ ] GET /api/orders/batches returns batches grouped by status with nested orders
- [ ] PATCH /api/orders/batch/[id] cascades status change to all orders in the batch
- [ ] /demo/orders page renders summary bar, suggestion cards, and zone-grouped orders
- [ ] Confirm/Reject buttons work with optimistic UI updates on pending orders
- [ ] "Create Dispatch Batch" creates a batch and updates order statuses in the UI
- [ ] /demo/orders/batches page renders batches grouped by planned/dispatched/delivered
- [ ] BatchCard expands to show individual orders and supports status transitions
- [ ] BottomNav has an Orders tab with pending count badge
- [ ] Main dashboard (/demo) has Pending Orders hero card and View Orders quick action
- [ ] Invalid status transitions return 400 errors
- [ ] Empty states render helpful messages instead of blank space
- [ ] All test files pass: API route tests, component tests
- [ ] Pages are usable on 375px mobile viewport
