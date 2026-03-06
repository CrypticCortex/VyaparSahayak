## Implementation Tasks

- [ ] 1. Prisma Schema -- New Models
  - [ ] 1.1 Add Order model to `prisma/schema.prisma`
    - Fields: id (String, @id @default(cuid())), token (String, @unique), retailerId (String), distributorId (String), status (String, @default("pending")), totalAmount (Float), notes (String?), campaignId (String?), zoneCode (String), createdAt (DateTime, @default(now())), confirmedAt (DateTime?), dispatchedAt (DateTime?), deliveredAt (DateTime?)
    - Relations: retailer -> Retailer, distributor -> Distributor, campaign -> Campaign (optional), items -> OrderItem[], batchLinks -> DispatchBatchOrder[]
    - _Refs: R-order-model, R-order-relations_
  - [ ] 1.2 Add OrderItem model to `prisma/schema.prisma`
    - Fields: id (String, @id @default(cuid())), orderId (String), productId (String), quantity (Int), unitPrice (Float), discount (Float, @default(0)), total (Float)
    - Relations: order -> Order, product -> Product
    - _Refs: R-orderitem-model_
  - [ ] 1.3 Add DispatchBatch model to `prisma/schema.prisma`
    - Fields: id (String, @id @default(cuid())), distributorId (String), zoneCode (String), status (String, @default("planned")), vehicleInfo (String?), plannedDate (DateTime), dispatchedAt (DateTime?), notes (String?), createdAt (DateTime, @default(now()))
    - Relations: distributor -> Distributor, orders -> DispatchBatchOrder[]
    - _Refs: R-dispatchbatch-model_
  - [ ] 1.4 Add DispatchBatchOrder join model to `prisma/schema.prisma`
    - Fields: id (String, @id @default(cuid())), batchId (String), orderId (String)
    - Relations: batch -> DispatchBatch, order -> Order
    - _Refs: R-dispatchbatchorder-join_
  - [ ] 1.5 Add AgentSuggestion model to `prisma/schema.prisma`
    - Fields: id (String, @id @default(cuid())), distributorId (String), type (String), title (String), description (String), actionType (String), actionPayload (String), priority (String, @default("medium")), status (String, @default("pending")), createdAt (DateTime, @default(now())), actedAt (DateTime?)
    - Relations: distributor -> Distributor
    - _Refs: R-agentsuggestion-model_
  - [ ] 1.6 Update existing models with new reverse relations
    - Distributor: add orders (Order[]), dispatchBatches (DispatchBatch[]), suggestions (AgentSuggestion[])
    - Campaign: add orderLink (String?) field and orders (Order[]) relation
    - Retailer: add orders (Order[]) relation
    - Product: add orderItems (OrderItem[]) relation
    - Order: ensure batchLinks (DispatchBatchOrder[]) is declared
    - _Refs: R-campaign-orderlink, R-existing-model-updates_
  - [ ] 1.7 Run `npx prisma validate` and `npx prisma db push` to verify schema
    - Confirm no validation errors
    - Confirm SQLite database is updated with new tables
    - Regenerate Prisma client with `npx prisma generate`
    - _Refs: R-schema-migration_

- [ ] 2. Seed Script -- Updated Deletion Order
  - [ ] 2.1 Update the deletion block in `src/app/api/seed/route.ts`
    - Add deleteMany calls for new tables before existing ones
    - Full order: orderItem, dispatchBatchOrder, dispatchBatch, order, agentSuggestion, campaign, recommendation, deadStockAlert, inventory, salesLineItem, salesTransaction, retailer, zone, whatsAppGroup, product, distributor
    - Remove the mid-script `whatsAppGroup.deleteMany()` call (move to the top block)
    - _Refs: R-seed-deletion-order_
  - [ ] 2.2 Verify re-running seed on a populated database succeeds without FK errors
    - Run POST /api/seed twice in sequence
    - Confirm second run completes without constraint violations
    - _Refs: R-seed-idempotent_

- [ ] 3. Seed Script -- Order Token and Campaign Link Generation
  - [ ] 3.1 Add a `generateOrderToken(index: number)` helper function
    - Generate a URL-safe token like `ord_<8-char-alphanumeric>` using a deterministic approach (e.g., base36 encoding of index + salt)
    - Place in `src/lib/seed/data.ts` or inline in the seed route
    - _Refs: R-order-token-generation_
  - [ ] 3.2 After campaign creation in the seed route, update each campaign with an orderLink
    - Query all campaigns created during the seed
    - For each, generate a token and set orderLink to a URL pattern like `/order/<token>`
    - Use `prisma.campaign.update()` to patch the orderLink field
    - _Refs: R-campaign-orderlink-seed_

- [ ] 4. Seed Script -- Demo Orders
  - [ ] 4.1 Define demo order configurations
    - Create an array of 11 order specs: { retailerZone, retailerIndex, status, productSkus (1-4 items), dayOffset (for createdAt) }
    - Distribute across zones: 4 from TN-URB, 3 from TN-TWN, 2 from TN-NAN, 1 from TN-AMB, 1 from TN-CHE
    - Status distribution: 6 pending, 3 confirmed, 2 dispatched
    - _Refs: R-seed-demo-orders_
  - [ ] 4.2 Implement order creation loop in the seed route
    - After campaign link generation, iterate over order specs
    - For each order: pick a retailer from retailerMap by zone and index, generate a token, calculate totalAmount from items, set timestamp fields based on status (confirmedAt for confirmed/dispatched, dispatchedAt for dispatched)
    - Create order with nested OrderItem creation using `prisma.order.create({ data: { ..., items: { create: [...] } } })`
    - Track created order IDs by status for the dispatch batch step
    - _Refs: R-seed-demo-orders, R-orderitem-seeding_
  - [ ] 4.3 Optionally link some orders to campaigns
    - For 3-4 of the orders, set campaignId to an existing campaign's ID
    - This demonstrates the campaign-to-order tracking feature
    - _Refs: R-order-campaign-link_

- [ ] 5. Seed Script -- Dispatch Batch
  - [ ] 5.1 Create 1 DispatchBatch for TN-URB zone
    - Set distributorId, zoneCode "TN-URB", status "dispatched", plannedDate to 1 day ago, dispatchedAt to today, vehicleInfo to a sample vehicle number (e.g., "TN-72-AB-1234")
    - _Refs: R-seed-dispatch-batch_
  - [ ] 5.2 Create DispatchBatchOrder records linking the 2 dispatched orders
    - Use the dispatched order IDs tracked in step 4.2
    - Create 2 DispatchBatchOrder records with batchId and orderId
    - _Refs: R-seed-dispatch-batch-orders_

- [ ] 6. Seed Script -- Agent Suggestions
  - [ ] 6.1 Define 4 agent suggestion records with varied types and priorities
    - Suggestion 1: type "order_intelligence", high priority -- "Reorder Alert: Biscuits running low in TN-URB", actionType "create_order", actionPayload with suggested product SKUs and quantities
    - Suggestion 2: type "stock_rebalance", medium priority -- "Move slow Complan stock from TN-NAN to TN-URB", actionType "rebalance", actionPayload with source/destination zones and quantities
    - Suggestion 3: type "campaign_performance", medium priority -- "Boost underperforming Horlicks campaign", actionType "boost_campaign", actionPayload with campaign reference
    - Suggestion 4: type "order_intelligence", low priority -- "Weekend demand spike expected in TN-TWN", actionType "pre_stock", actionPayload with zone and product recommendations
    - _Refs: R-seed-agent-suggestions_
  - [ ] 6.2 Insert suggestions using `prisma.agentSuggestion.createMany()` or individual creates
    - Set distributorId from the seeded distributor
    - All suggestions start with status "pending"
    - Validate that actionPayload values are valid JSON strings
    - _Refs: R-seed-agent-suggestions_

- [ ] 7. Seed Script -- Updated Stats Response
  - [ ] 7.1 Update the stats object returned by the seed endpoint
    - Add counts for: orders, orderItems, dispatchBatches, agentSuggestions
    - Include status breakdown for orders (pending/confirmed/dispatched)
    - _Refs: R-seed-stats_

## Sequencing Rationale

Tasks are ordered by dependency chain:

1. **Schema first** (Task 1) because everything else depends on the new models existing. Prisma client must be regenerated before any seed code can reference the new tables.

2. **Deletion order second** (Task 2) because the seed script will fail on re-runs if it tries to delete data in the wrong order. This must be fixed before adding any creation logic for new tables.

3. **Token and campaign links third** (Task 3) because demo orders may reference campaigns with orderLinks, and the token generation helper is reused by order creation.

4. **Demo orders fourth** (Task 4) because dispatch batches depend on existing orders -- specifically the dispatched ones. Orders also reference retailers, products, and optionally campaigns, all of which must exist first.

5. **Dispatch batch fifth** (Task 5) because it depends on dispatched order IDs from Task 4.

6. **Agent suggestions sixth** (Task 6) because they are independent of orders and batches but should be seeded last since their content may reference the state of orders/campaigns.

7. **Stats update last** (Task 7) because it is cosmetic and depends on all prior creation steps being complete.

## Definition of Done

- [ ] `npx prisma validate` passes with zero errors on the updated schema
- [ ] `npx prisma db push` creates all five new tables and the new Campaign.orderLink column in SQLite
- [ ] Prisma client is regenerated and TypeScript compiles without type errors
- [ ] POST /api/seed succeeds on a fresh database and returns updated stats
- [ ] POST /api/seed succeeds on a previously seeded database (re-run without FK errors)
- [ ] Database contains 11 orders: 6 pending, 3 confirmed, 2 dispatched
- [ ] Each order has 1-4 OrderItems with valid product and pricing references
- [ ] 1 DispatchBatch exists for TN-URB with status "dispatched" and 2 linked orders
- [ ] 3-4 AgentSuggestion records exist with varied types, priorities, and valid JSON payloads
- [ ] All Campaign records have a non-null orderLink value after seeding
- [ ] No existing seed functionality is broken -- distributor, zones, retailers, products, sales, inventory, alerts, recommendations, campaigns, and WhatsApp groups still seed correctly
