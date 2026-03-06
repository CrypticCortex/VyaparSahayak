## Feature Summary

Expand the VyaparSahayak distribution management system's data layer by adding five new Prisma models (Order, OrderItem, DispatchBatch, DispatchBatchOrder, AgentSuggestion), extending the existing Campaign model with an orderLink field, and updating the seed script to populate demo data for orders, dispatch batches, and AI-generated agent suggestions. This lays the groundwork for order management, dispatch planning, and proactive intelligence features in the distributor dashboard.

## User Stories

- As a distributor, I want to see demo orders from retailers across my zones so that I can understand how the order management flow works before going live.
- As a distributor, I want orders linked to campaigns so that I can track which promotions are driving purchases.
- As a distributor, I want to see dispatch batches grouping orders by zone so that I can plan vehicle loading and delivery routes.
- As a distributor, I want AI-generated suggestions (order intelligence, stock rebalancing, campaign performance) so that I get proactive guidance without asking.
- As a retailer, I want each campaign to have an order link with a unique token so that I can place orders directly from a WhatsApp message.
- As a developer, I want the seed script to create realistic demo data for all new models so that the full workflow is demonstrable without manual setup.

## Acceptance Criteria

### Prisma Schema -- Order and OrderItem

- WHEN the schema is migrated THEN the system SHALL have an Order model with fields: id (cuid), token (unique, URL-safe string), retailerId, distributorId, status (one of pending/confirmed/dispatched/delivered/cancelled), totalAmount, notes (optional), campaignId (optional), zoneCode, createdAt (auto-now), confirmedAt (optional), dispatchedAt (optional), deliveredAt (optional).
- WHEN the schema is migrated THEN the system SHALL have an OrderItem model with fields: id (cuid), orderId, productId, quantity (Int), unitPrice (Float), discount (Float, default 0), total (Float).
- WHEN an Order is created THEN it SHALL have a relation to Retailer via retailerId, to Distributor via distributorId, and optionally to Campaign via campaignId.
- WHEN an Order is created THEN it SHALL have a one-to-many relation to OrderItem[].
- WHEN an OrderItem is created THEN it SHALL have relations to both Order (via orderId) and Product (via productId).

### Prisma Schema -- DispatchBatch and DispatchBatchOrder

- WHEN the schema is migrated THEN the system SHALL have a DispatchBatch model with fields: id (cuid), distributorId, zoneCode, status (one of planned/dispatched/delivered), vehicleInfo (optional), plannedDate (DateTime), dispatchedAt (optional), notes (optional), createdAt (auto-now).
- WHEN the schema is migrated THEN the system SHALL have a DispatchBatchOrder join model with fields: id (cuid), batchId, orderId.
- WHEN a DispatchBatch is created THEN it SHALL relate to Distributor via distributorId and to Order[] through the DispatchBatchOrder many-to-many join table.

### Prisma Schema -- AgentSuggestion

- WHEN the schema is migrated THEN the system SHALL have an AgentSuggestion model with fields: id (cuid), distributorId, type (one of order_intelligence/stock_rebalance/campaign_performance), title, description, actionType, actionPayload (JSON stored as String), priority (one of high/medium/low), status (one of pending/acted/dismissed), createdAt (auto-now), actedAt (optional).
- WHEN an AgentSuggestion is created THEN it SHALL relate to Distributor via distributorId.

### Prisma Schema -- Campaign Extension

- WHEN the schema is migrated THEN the Campaign model SHALL have a new optional field orderLink (String).

### Seed Script -- Deletion Order

- WHEN the seed runs THEN it SHALL delete data in dependency-safe order: OrderItem, DispatchBatchOrder, DispatchBatch, Order, AgentSuggestion, Campaign, Recommendation, DeadStockAlert, Inventory, SalesLineItem, SalesTransaction, Retailer, Zone, WhatsAppGroup, Product, Distributor.

### Seed Script -- Order Token and Link Generation

- WHEN the seed generates campaigns THEN it SHALL also generate a unique URL-safe token and an orderLink for each campaign record.

### Seed Script -- Demo Orders

- WHEN the seed completes base data generation THEN it SHALL create 8-12 demo orders from various retailers across multiple zones.
- WHEN demo orders are seeded THEN 6 SHALL have status "pending", 3 SHALL have status "confirmed", and 2 SHALL have status "dispatched".
- WHEN demo orders are seeded THEN each order SHALL have 1-4 OrderItem records referencing real products with accurate pricing.

### Seed Script -- Dispatch Batch

- WHEN the seed completes order generation THEN it SHALL create 1 DispatchBatch for zone TN-URB containing the 2 dispatched orders via DispatchBatchOrder join records.

### Seed Script -- Agent Suggestions

- WHEN the seed completes THEN it SHALL create 3-4 AgentSuggestion records with varied types (order_intelligence, stock_rebalance, campaign_performance), priorities, and realistic titles/descriptions.

## Edge Cases

- Token uniqueness collision during seed -- use a deterministic token generation strategy (e.g., based on campaign ID or index) to avoid random collisions in the same seed run.
- Seed script re-run on an existing database -- the clean-slate deletion must handle the new tables without foreign key constraint violations.
- OrderItem references a product that was deleted -- the seed must create orders only after products are seeded and use valid product IDs.
- DispatchBatchOrder references an order that does not have status "dispatched" -- the seed must only link dispatched orders to the batch.
- AgentSuggestion actionPayload contains invalid JSON -- seed data must use valid JSON strings, and future consumers should parse defensively.

## Out of Scope

- Order placement API endpoints (this feature is data layer and seed only).
- Dispatch routing or vehicle assignment logic.
- Agent suggestion generation engine (only static seed data is created here).
- Retailer-facing order form UI.
- Real-time order status webhooks or push notifications.
- Payment processing or credit management.
- Migration tooling for production databases (this is a demo/dev feature).
