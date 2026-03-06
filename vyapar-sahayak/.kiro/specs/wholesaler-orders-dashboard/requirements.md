## Feature Summary

Add an order management dashboard to VyaparSahayak that lets wholesalers/distributors view, confirm, reject, and dispatch retailer orders grouped by zone. The feature includes two pages -- a main orders dashboard at /demo/orders with smart zone-grouped views, agent suggestion cards, and per-order actions, and a dispatch batches page at /demo/orders/batches for tracking planned, dispatched, and delivered batches. Five CRUD API routes power the dashboard without any agent/LLM involvement. Navigation updates add an Orders tab to the bottom nav with a pending count badge, plus a hero card and quick action on the main dashboard.

## User Stories

- As a distributor, I want to see all pending orders grouped by zone so that I can quickly assess demand across my territory.
- As a distributor, I want to confirm or reject individual orders so that I can manage my fulfillment pipeline.
- As a distributor, I want to create a dispatch batch from orders in a zone so that I can plan vehicle loading and deliveries efficiently.
- As a distributor, I want to see a summary bar with total pending orders, today's order value, and orders by zone so that I get an instant snapshot of my order pipeline.
- As a distributor, I want to see AI-generated suggestion cards on the orders page so that I get proactive order intelligence without having to ask.
- As a distributor, I want to dismiss or act on suggestion cards so that I can keep my dashboard focused on what matters.
- As a distributor, I want to view dispatch batches grouped by status (planned, dispatched, delivered) so that I can track fulfillment progress.
- As a distributor, I want to mark a batch as dispatched or delivered so that order statuses update automatically across all orders in the batch.
- As a distributor, I want to expand a batch to see the individual orders inside it so that I can verify what was shipped.
- As a distributor, I want an Orders tab in the bottom navigation with a pending count badge so that I can jump to orders from any page and know at a glance if orders need attention.

## Acceptance Criteria

### Orders Dashboard Page (/demo/orders)

- WHEN the user navigates to /demo/orders THEN the system SHALL display a summary bar at the top showing total pending orders, today's order value, and an orders-by-zone mini chart.
- WHEN the page loads THEN the system SHALL fetch orders grouped by zone from GET /api/orders and render a ZoneOrderGroup component for each zone.
- WHEN orders are grouped by zone THEN each zone header SHALL display the zone name, order count, and total value for that zone.
- WHEN a zone group is rendered THEN the first 2 zones SHALL be expanded by default and the rest collapsed.
- WHEN an individual order is displayed THEN it SHALL show the retailer name, product name, quantity, amount, time ago, and a status badge.
- WHEN an order has status "pending" THEN the system SHALL show Confirm and Reject action buttons on that order card.
- WHEN the user taps Confirm on a pending order THEN the system SHALL call PATCH /api/orders/[id] with status "confirmed" and update the UI optimistically.
- WHEN the user taps Reject on a pending order THEN the system SHALL call PATCH /api/orders/[id] with status "rejected" and update the UI optimistically.
- WHEN the page loads THEN the system SHALL fetch agent suggestions of type "order_intelligence" and display them as suggestion cards at the top of the page.
- WHEN a suggestion card is displayed THEN it SHALL show a title, description, an action button labeled "Do it", and a dismiss button labeled "X".
- WHEN the user taps "Do it" on a suggestion card THEN the system SHALL call the appropriate API based on the suggestion's actionType.
- WHEN the user taps "X" on a suggestion card THEN the system SHALL call PATCH /api/suggestions/[id] to mark it as dismissed and remove it from the UI.

### Zone Dispatch Batch Creation

- WHEN the user taps "Create Dispatch Batch" at the bottom of a zone group THEN the system SHALL call POST /api/orders/batch with the zoneCode and all confirmed order IDs in that zone.
- WHEN a dispatch batch is created THEN the system SHALL update the included orders' status to "dispatched" and reflect the change in the UI.

### Dispatch Batches Page (/demo/orders/batches)

- WHEN the user navigates to /demo/orders/batches THEN the system SHALL fetch batches from GET /api/orders/batches and group them by status: planned, dispatched, delivered.
- WHEN a batch card is displayed THEN it SHALL show the zone name, order count, total value, vehicle info, and planned date.
- WHEN the user taps a batch card THEN it SHALL expand to show the individual orders in that batch.
- WHEN a batch has status "planned" THEN the system SHALL show a "Mark Dispatched" button.
- WHEN a batch has status "dispatched" THEN the system SHALL show a "Mark Delivered" button.
- WHEN the user taps "Mark Dispatched" THEN the system SHALL call PATCH /api/orders/batch/[id] with status "dispatched" and update both the batch and its orders' statuses.
- WHEN the user taps "Mark Delivered" THEN the system SHALL call PATCH /api/orders/batch/[id] with status "delivered" and update both the batch and its orders' statuses.

### API Routes

- WHEN GET /api/orders is called with a distributorId THEN it SHALL return orders grouped by zoneCode, each group containing zoneName, orders array, totalValue, and orderCount.
- WHEN GET /api/orders is called with an optional status filter THEN it SHALL return only orders matching that status.
- WHEN PATCH /api/orders/[id] is called with a valid status THEN it SHALL update the order status and set the appropriate timestamp (confirmedAt, dispatchedAt, or deliveredAt).
- WHEN POST /api/orders/batch is called THEN it SHALL create a DispatchBatch record and DispatchBatchOrder join records for each order ID, and update those orders' status to "dispatched".
- WHEN GET /api/orders/batches is called THEN it SHALL return all batches with their orders grouped by batch status.
- WHEN PATCH /api/orders/batch/[id] is called with status "dispatched" THEN it SHALL update the batch status and set dispatchedAt on all orders in that batch.
- WHEN PATCH /api/orders/batch/[id] is called with status "delivered" THEN it SHALL update the batch status and set deliveredAt on all orders in that batch.

### Navigation Updates

- WHEN the demo layout renders THEN the BottomNav SHALL include an "Orders" tab with an icon.
- WHEN there are pending orders THEN the Orders tab SHALL display a badge showing the pending order count.
- WHEN the user navigates to the main dashboard (/demo) THEN it SHALL include a "Pending Orders" hero card showing the count and total value of pending orders.
- WHEN the user views dashboard quick actions THEN "View Orders" SHALL be listed as an available action.

## Edge Cases

- No orders exist for the distributor -- show an empty state with a message like "No orders yet" instead of blank groups.
- All orders in a zone are already confirmed/dispatched -- hide Confirm/Reject buttons; "Create Dispatch Batch" should only include confirmed orders.
- User taps Confirm/Reject while offline or API fails -- revert the optimistic update and show an error toast.
- Dispatch batch creation with zero eligible orders -- disable the "Create Dispatch Batch" button when no confirmed orders exist in the zone.
- Order status is updated concurrently by another tab -- the next page load fetches fresh data; no real-time sync needed.
- Agent suggestions list is empty -- hide the suggestion cards section entirely rather than showing an empty container.
- Batch already marked as delivered -- hide further status action buttons.
- PATCH called with an invalid status transition (e.g., "pending" -> "delivered" skipping confirmed/dispatched) -- return 400 with a descriptive error.

## Out of Scope

- Order creation/placement by retailers (this feature is distributor-side management only).
- Real-time order notifications or push updates.
- Payment collection or invoice generation.
- Route optimization or delivery tracking.
- Order editing after creation (quantity changes, product swaps).
- Bulk order import from CSV or external systems.
- Multi-distributor views or cross-distributor order routing.
- Print/export of dispatch batch manifests.
