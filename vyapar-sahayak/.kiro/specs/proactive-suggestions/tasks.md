## Implementation Tasks

- [x] 1. Order Intelligence Analyzer
  - [x] 1.1 Create `src/lib/suggestions/order-intelligence.ts` with `analyzeRetailerActivity`
    - Query all retailers for the distributor with their orders (include createdAt)
    - For retailers with 2+ orders, compute average days between orders
    - If days since last order > 1.5x average frequency, produce a suggestion: type "order_intelligence", actionType "send_checkin", priority "high", payload `{ retailerId, retailerName }`
    - Title format: "Retailer X hasn't ordered in Y days -- they usually order weekly. Check in?"
    - Skip retailers with fewer than 2 orders (insufficient data)
    - _Refs: R-retailer-activity, R-order-intelligence_
  - [x] 1.2 Add `analyzeZoneOrderClusters` to order-intelligence.ts
    - Query pending orders grouped by zoneCode
    - For zones with 3+ pending orders, compute total value (sum of totalAmount)
    - Produce a suggestion: type "order_intelligence", actionType "create_batch", priority "medium", payload `{ zoneCode }`
    - Title format: "N orders from zone Z today worth Rs.XK -- create a dispatch batch?"
    - _Refs: R-zone-clusters, R-order-intelligence_
  - [x] 1.3 Add `analyzeLargeOrders` to order-intelligence.ts
    - Query pending orders with their retailer's historical orders
    - For each pending order, compute the retailer's average totalAmount across past orders
    - If pending order totalAmount >= 3x average, produce a suggestion: type "order_intelligence", actionType "confirm_stock", priority "high", payload `{ orderId }`
    - Title format: "Large order from Retailer X -- Rs.YK vs Rs.ZK average. Confirm stock availability?"
    - Skip retailers with no prior orders (cannot compute average)
    - _Refs: R-large-orders, R-order-intelligence_
  - [x] 1.4 Add `analyzeStockVsOrders` to order-intelligence.ts
    - Aggregate pending order quantities per product per zone (sum OrderItem quantities)
    - Query zone inventory for each product-zone combination
    - If pending quantity exceeds zone inventory, find another zone with surplus stock
    - Produce a suggestion: type "order_intelligence", actionType "transfer_stock", priority "high", payload `{ productId, fromZone, toZone, quantity }`
    - Title format: "N retailers ordered Product X but zone Y has only Z cases left. Transfer from another zone?"
    - Skip if no source zone has surplus
    - _Refs: R-stock-vs-orders, R-order-intelligence_

- [x] 2. Stock Rebalancing Analyzer
  - [x] 2.1 Create `src/lib/suggestions/stock-rebalancing.ts` with `analyzeIdleVsActive`
    - For each product, query SalesLineItem grouped by zone over the last 14 days
    - Identify products with zero sales in one zone but active sales (1+ transactions) in another
    - Check that the idle zone actually has inventory (cases > 0)
    - Produce a suggestion: type "stock_rebalance", actionType "transfer_stock", priority "medium", payload `{ productId, fromZone, toZone, quantity }`
    - Title format: "Product X: N cases idle in zone A, but zone B sold M cases last week. Move stock?"
    - _Refs: R-idle-vs-active, R-stock-rebalancing_
  - [x] 2.2 Add `analyzeExpiryUrgency` to stock-rebalancing.ts
    - Query inventory items where expiryDate is within 30 days of today and currentStock > 0
    - Reuse expiry calculation patterns from existing ML scoring logic in `src/lib/ml/scoring.ts`
    - Produce a suggestion: type "stock_rebalance", actionType "flash_sale", priority "high", payload `{ productId, zoneCode }`
    - Title format: "Product X expires in N days -- M cases left. Push a flash sale?"
    - _Refs: R-expiry-urgency, R-stock-rebalancing_
  - [x] 2.3 Add `analyzePostOrderDepletion` to stock-rebalancing.ts
    - For each zone-product, compute: current inventory minus sum of pending order quantities
    - If projected stock < 20% of current stock and current stock > 0, flag for restock
    - Produce a suggestion: type "stock_rebalance", actionType "transfer_stock", priority "medium", payload `{ productId, fromZone, toZone, quantity }`
    - Title format: "After today's orders, zone X will have only N cases of Product Y left. Restock?"
    - Find a source zone with surplus for the toZone and quantity fields
    - _Refs: R-post-order-depletion, R-stock-rebalancing_

- [x] 3. Campaign Performance Analyzer
  - [x] 3.1 Create `src/lib/suggestions/campaign-performance.ts` with `analyzeCampaignConversion`
    - Query campaigns with status "sent" and their related orders
    - Count distinct retailers who placed orders vs total retailers targeted (from campaign metadata or WhatsApp group)
    - If conversion > 0% but < 100%, produce a suggestion: type "campaign_performance", actionType "send_reminder", priority "medium", payload `{ campaignId }`
    - Title format: "Product X campaign: N retailers reached, M orders (X% conversion). Send reminder to the other Y?"
    - _Refs: R-campaign-conversion, R-campaign-performance_
  - [x] 3.2 Add `analyzeZoneConversion` to campaign-performance.ts
    - For each sent campaign, break down orders by zone
    - Identify zones with zero orders from the campaign
    - Produce a suggestion: type "campaign_performance", actionType "flash_sale", priority "medium", payload `{ productId, zoneCode }`
    - Title format: "Zone X had zero orders from last campaign. Try a bigger discount or different product?"
    - Also check for high-conversion campaigns (highest conversion rate ever for this distributor)
    - If a campaign is the best-ever, produce: actionType "view_campaign", priority "low"
    - Title format: "Product X campaign: Y% conversion -- your best ever. Run similar for Product Z?"
    - _Refs: R-zone-conversion, R-high-conversion, R-campaign-performance_
  - [x] 3.3 Add `analyzePosterPerformance` to campaign-performance.ts
    - Compare orders linked to campaigns that have different poster variants (posterUrl fields)
    - This is simulated: check if campaigns for the same product have different poster URLs and different order counts
    - If one variant has 2x+ more orders, produce a suggestion: type "campaign_performance", actionType "view_campaign", priority "low", payload `{ campaignId }`
    - Title format: "Gemini poster got Nx more orders than AWS poster for Product X. Use Gemini style going forward?"
    - _Refs: R-poster-performance, R-campaign-performance_

- [x] 4. Suggestion Orchestrator and Deduplication
  - [x] 4.1 Create `src/lib/suggestions/index.ts` with `generateSuggestions`
    - Import all analyzer functions from the three modules
    - Run all analyzers in parallel via `Promise.all`, wrapping each in try/catch
    - Collect all SuggestionInput arrays and flatten
    - For each input, derive a deduplication key: `${type}:${actionType}:${primaryEntityId}` where primaryEntityId comes from the payload (retailerId, zoneCode, campaignId, orderId, or productId depending on actionType)
    - Query existing pending AgentSuggestion records for this distributor
    - Skip inputs whose dedup key matches an existing pending suggestion
    - Batch-create new AgentSuggestion records via Prisma, serializing actionPayload to JSON string
    - Return the newly created suggestions
    - _Refs: R-deduplication, R-orchestration_
  - [x] 4.2 Add error collection and partial failure handling
    - If an analyzer throws, log the error and include it in a `warnings` array on the response
    - Continue with results from other analyzers
    - Return `{ suggestions, warnings }` from the orchestrator
    - _Refs: R-partial-failure, R-error-handling_

- [x] 5. API Routes
  - [x] 5.1 Create `src/app/api/suggestions/generate/route.ts`
    - POST handler: get distributorId from cached distributor (same pattern as existing routes)
    - Call `generateSuggestions(distributorId)`
    - Return 200 with `{ suggestions }` array
    - Handle errors: return 500 with `{ error: "Failed to generate suggestions" }`
    - _Refs: R-generate-api_
  - [x] 5.2 Create `src/app/api/suggestions/route.ts`
    - GET handler: query AgentSuggestion where distributorId matches, status is "pending", and createdAt is within last 24 hours
    - Order by: priority mapped to sort order (high=0, medium=1, low=2), then createdAt desc
    - Prisma `orderBy` cannot do custom priority ordering natively -- use `findMany` then sort in JS, or use raw query
    - Return 200 with `{ suggestions }` array
    - _Refs: R-list-api, R-staleness_
  - [x] 5.3 Create `src/app/api/suggestions/[id]/route.ts`
    - PATCH handler: accept `{ status: "acted" | "dismissed" }` in body
    - Validate status value, return 400 if invalid
    - Update the AgentSuggestion record: set status and actedAt to `new Date()`
    - Return 200 with the updated suggestion
    - Return 404 if suggestion ID not found
    - _Refs: R-update-api, R-dismiss, R-act_

- [x] 6. SuggestionCard and SuggestionList UI Components
  - [x] 6.1 Create `src/components/dashboard/suggestion-card.tsx`
    - Client component ("use client")
    - Props: suggestion (AgentSuggestion shape), onDismiss callback, onAction callback
    - Parse actionPayload from JSON string with try/catch, fallback to empty object
    - Render: card with left color accent based on priority (high: red/saffron, medium: amber, low: blue)
    - Display type badge (Order Intelligence / Stock Rebalance / Campaign Performance)
    - Display title and description text
    - Action button: label varies by actionType ("Check in", "Create batch", "Send reminder", "Transfer stock", "Flash sale", "View campaign", "Confirm stock")
    - Dismiss button: X icon in top-right corner
    - Use Tailwind classes consistent with existing dashboard theme
    - _Refs: R-suggestion-card, R-action-types_
  - [x] 6.2 Create `src/components/dashboard/suggestion-list.tsx`
    - Client component ("use client")
    - On mount, call GET /api/suggestions and store in local state
    - Render up to maxVisible (default 5) SuggestionCard components
    - If more than maxVisible, show "Show N more suggestions" button
    - On dismiss: call PATCH /api/suggestions/[id] with status "dismissed", optimistically remove from list
    - On action: execute the action based on actionType and payload (use Next.js router.push for navigation actions, fetch for API actions), then call PATCH with status "acted"
    - Show loading skeleton while fetching suggestions
    - Show nothing (no empty state card) when there are zero suggestions
    - _Refs: R-suggestion-list, R-max-five, R-dismiss_
  - [x] 6.3 Integrate SuggestionList into dashboard pages
    - Edit `src/app/demo/page.tsx`: import and render `<SuggestionList />` above the main dashboard content
    - Edit `src/app/demo/orders/page.tsx` (or create if needed): import and render `<SuggestionList />` at the top
    - Ensure the component does not break the page layout when there are zero suggestions
    - _Refs: R-dashboard-integration, R-orders-integration_

- [ ] 7. Strands Agent Integration (deferred -- SDK not on this branch, to be added post-merge)
  - [ ] 7.1 Add `generate_proactive_suggestions` tool to the Strands agent tool definitions
    - Add tool schema: name "generate_proactive_suggestions", description "Analyze distributor data and generate proactive suggestions for order intelligence, stock rebalancing, and campaign performance", no required inputs
    - In the tool executor, call POST /api/suggestions/generate (or import generateSuggestions directly)
    - Format the response for conversational output: list suggestion titles with brief descriptions
    - _Refs: R-agent-tool_
  - [ ] 7.2 Update system prompt to mention proactive suggestions
    - Add to the agent system prompt: "You can generate proactive suggestions for the distributor. When the user asks 'any suggestions?', 'what should I do?', or similar, invoke the generate_proactive_suggestions tool and present the results conversationally."
    - _Refs: R-agent-prompt_

- [ ] 8. Tests (verified via API-level testing, formal unit tests not yet written)
  - [ ] 8.1 Write unit tests for order intelligence analyzers
  - [ ] 8.2 Write unit tests for stock rebalancing analyzers
  - [ ] 8.3 Write unit tests for campaign performance analyzers
  - [ ] 8.4 Write unit tests for the orchestrator
  - [ ] 8.5 Write API route tests

## Sequencing Rationale

Tasks are ordered from the data layer outward to the UI and agent integration:

1. **Order intelligence analyzer first** (Task 1) because it is the most complex category with four distinct analyzer functions, and the patterns established here (query structure, return type, threshold logic) are reused by the other two analyzers.

2. **Stock rebalancing analyzer second** (Task 2) because it shares the same return type and follows similar query patterns. It also reuses expiry logic from the existing ML module, so building it second lets us validate that reuse pattern.

3. **Campaign performance analyzer third** (Task 3) because it depends on understanding how campaigns and orders are linked, which is clarified by building the order intelligence analyzers first.

4. **Orchestrator fourth** (Task 4) because it depends on all three analyzer modules being defined. The deduplication and error handling logic wraps around the analyzers.

5. **API routes fifth** (Task 5) because they are thin wrappers around the orchestrator and Prisma queries. Building them after the orchestrator means the core logic is already tested.

6. **UI components sixth** (Task 6) because they consume the API routes. The SuggestionCard and SuggestionList only need the API shape to be defined, which Task 5 establishes.

7. **Strands agent integration seventh** (Task 7) because it is an additive feature on top of the working suggestion system. The tool just calls the same generate endpoint.

8. **Tests last in the list** (Task 8) but developed alongside each task. Tests are grouped here for clarity but should be written as part of each task's implementation (test-driven where possible).

## Definition of Done

- [x] All 10 analyzer functions implemented and returning correct SuggestionInput shapes
- [x] Orchestrator deduplicates suggestions and handles partial analyzer failures
- [x] POST /api/suggestions/generate creates AgentSuggestion records in the database
- [x] GET /api/suggestions returns priority-sorted, staleness-filtered pending suggestions
- [x] PATCH /api/suggestions/[id] updates status to acted or dismissed with timestamp
- [x] SuggestionCard renders with priority-based styling, action button, and dismiss button
- [x] SuggestionList shows max 5 cards with "Show more" for overflow
- [x] SuggestionList integrated on /demo and /demo/orders pages
- [ ] Strands agent can invoke generate_proactive_suggestions and present results in chat
- [x] No new Prisma schema changes -- uses AgentSuggestion model from data-model-expansion spec
- [x] Stale suggestions (>24h) excluded from API results
- [x] Duplicate suggestions not created on repeated generate calls
- [ ] Unit tests pass for all analyzer functions, orchestrator, and API routes
- [x] Analyzer failures do not crash the generate endpoint -- partial results returned with warnings
