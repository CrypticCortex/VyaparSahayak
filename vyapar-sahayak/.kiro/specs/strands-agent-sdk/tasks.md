## Implementation Tasks

- [ ] 1. Install Dependencies and Set Up Module Structure
  - [ ] 1.1 Install @strands-agents/sdk and zod packages
    - Run `npm install @strands-agents/sdk zod`
    - Verify both packages appear in `package.json` dependencies
    - Verify TypeScript can resolve imports: `import { Agent, tool, BedrockModel } from '@strands-agents/sdk'` and `import { z } from 'zod'`
    - _Refs: R-sdk-migration_
  - [ ] 1.2 Create the `src/lib/strands/` directory structure
    - Create `src/lib/strands/model.ts` -- exports the configured BedrockModel instance
    - Create `src/lib/strands/tools.ts` -- will hold all 18 tool definitions (placeholder exports for now)
    - Create `src/lib/strands/autonomy.ts` -- exports the auto-execute vs needs-approval classification sets
    - _Refs: R-sdk-migration_

- [ ] 2. Configure the Bedrock Model
  - [ ] 2.1 Implement `src/lib/strands/model.ts`
    - Import `BedrockModel` from `@strands-agents/sdk`
    - Export `bedrockModel` configured with `modelId` from `process.env.BEDROCK_TEXT_MODEL` (default `us.anthropic.claude-sonnet-4-20250514-v1:0`) and `region` from `process.env.AWS_REGION` (default `us-east-1`)
    - _Refs: R-sdk-migration, R-model-config_

- [ ] 3. Rewrite Existing 11 Tools with Zod Schemas
  - [ ] 3.1 Rewrite `get_dashboard_summary` tool
    - Define with `tool({ name, description, inputSchema: z.object({}), callback })` in `src/lib/strands/tools.ts`
    - Move the callback logic from `getDashboardSummary()` in `src/lib/agent-tools.ts` (lines 204-229)
    - Keep the same return shape: `{ distributorName, ownerName, deadStockValue, deadStockValueFormatted, atRiskSkus, highRiskSkus, pendingRecommendations, activeCampaigns, totalZones }`
    - _Refs: R-tool-rewrite, R-backward-compat_
  - [ ] 3.2 Rewrite `scan_inventory` tool
    - Move callback logic from `scanInventory()` in `src/lib/agent-tools.ts` (lines 232-274)
    - Keep the same return shape with scan results and formatted values
    - _Refs: R-tool-rewrite, R-backward-compat_
  - [ ] 3.3 Rewrite `get_alerts` tool
    - Move callback logic from `getAlerts()` in `src/lib/agent-tools.ts` (lines 277-296)
    - _Refs: R-tool-rewrite, R-backward-compat_
  - [ ] 3.4 Rewrite `get_alert_detail` tool
    - Input schema: `z.object({ alert_id: z.string().describe('The alert ID to look up') })`
    - Move callback logic from `getAlertDetail()` in `src/lib/agent-tools.ts` (lines 299-322)
    - _Refs: R-tool-rewrite, R-backward-compat_
  - [ ] 3.5 Rewrite `generate_recommendation` tool
    - Input schema: `z.object({ alert_id: z.string().describe('The alert ID to generate a recommendation for') })`
    - Move callback logic from `generateRecommendationForAlert()` in `src/lib/agent-tools.ts` (lines 325-340)
    - _Refs: R-tool-rewrite, R-backward-compat_
  - [ ] 3.6 Rewrite `get_campaigns` tool
    - Move callback logic from `getCampaigns()` in `src/lib/agent-tools.ts` (lines 343-360)
    - _Refs: R-tool-rewrite, R-backward-compat_
  - [ ] 3.7 Rewrite `get_campaign_detail` tool
    - Input schema: `z.object({ campaign_id: z.string().describe('The campaign ID') })`
    - Move callback logic from `getCampaignDetail()` in `src/lib/agent-tools.ts` (lines 363-378)
    - _Refs: R-tool-rewrite, R-backward-compat_
  - [ ] 3.8 Rewrite `send_campaign` tool (needs-approval)
    - Input schema: `z.object({ campaign_id: z.string(), zone_codes: z.array(z.string()).optional() })`
    - For the callback: return a suggestion card object `{ type: "suggestion", action: "send_campaign", details: { campaignId, productName, targetGroups } }` instead of executing the send
    - Keep the actual send logic available for when the user approves
    - Move underlying logic from `sendCampaign()` in `src/lib/agent-tools.ts` (lines 381-444)
    - _Refs: R-tool-rewrite, R-two-tier-autonomy_
  - [ ] 3.9 Rewrite `get_whatsapp_groups` tool
    - Move callback logic from `getWhatsAppGroups()` in `src/lib/agent-tools.ts` (lines 447-472)
    - _Refs: R-tool-rewrite, R-backward-compat_
  - [ ] 3.10 Rewrite `auto_handle_dead_stock` tool
    - Input schema: `z.object({ max_items: z.number().optional().describe('Max number of top-risk items to process (default 3)'), auto_send: z.boolean().optional().describe('If true, auto-send campaigns after creating them') })`
    - Move callback logic from `autoHandleDeadStock()` in `src/lib/agent-tools.ts` (lines 475-532)
    - _Refs: R-tool-rewrite, R-backward-compat_
  - [ ] 3.11 Rewrite `get_network_overview` tool
    - Move callback logic from `getNetworkOverview()` in `src/lib/agent-tools.ts` (lines 535-561)
    - _Refs: R-tool-rewrite, R-backward-compat_

- [ ] 4. Implement 7 New Tools
  - [ ] 4.1 Implement `get_pending_orders` tool
    - Input schema: `z.object({ zone_code: z.string().optional().describe('Filter by zone code') })`
    - Query orders with status "pending", group by zone, return counts and total values
    - Return shape: `{ zones: PendingOrderSummary[] }` with per-zone order counts and values
    - _Refs: R-new-tools, R-order-management_
  - [ ] 4.2 Implement `confirm_order` tool (needs-approval)
    - Input schema: `z.object({ order_id: z.string().describe('The order ID to confirm') })`
    - Return a suggestion card: `{ type: "suggestion", action: "confirm_order", details: { orderId, retailerName, value } }`
    - Implement the actual confirmation logic (update order status) for post-approval execution
    - Handle "order not found" with an error object
    - _Refs: R-new-tools, R-two-tier-autonomy_
  - [ ] 4.3 Implement `reject_order` tool (needs-approval)
    - Input schema: `z.object({ order_id: z.string(), reason: z.string().describe('Reason for rejection') })`
    - Return a suggestion card with order details and rejection reason
    - Implement the actual rejection logic for post-approval execution
    - _Refs: R-new-tools, R-two-tier-autonomy_
  - [ ] 4.4 Implement `suggest_dispatch_batch` tool
    - Input schema: `z.object({ zone_code: z.string().optional().describe('Suggest batches for a specific zone') })`
    - Analyze confirmed orders grouped by zone, suggest optimal groupings based on order count and value thresholds
    - Return suggested batches with zone, order IDs, and estimated delivery metrics
    - Handle zero confirmed orders gracefully with an empty result
    - _Refs: R-new-tools, R-dispatch-batching_
  - [ ] 4.5 Implement `create_dispatch_batch` tool (needs-approval)
    - Input schema: `z.object({ zone_code: z.string(), order_ids: z.array(z.string()).describe('Order IDs to include in the batch') })`
    - Return a suggestion card with batch details (zone, order count, total value)
    - Implement the actual batch creation for post-approval execution
    - _Refs: R-new-tools, R-two-tier-autonomy, R-dispatch-batching_
  - [ ] 4.6 Implement `check_retailer_activity` tool
    - Input schema: `z.object({ inactive_days: z.number().optional().describe('Days of inactivity to flag (default 14)') })`
    - Query retailers, compare last order date to their usual ordering frequency
    - Return flagged retailers with `{ retailerId, retailerName, zoneName, daysSinceLastOrder, usualFrequencyDays, status }`
    - Return an empty list with a message when no retailers match
    - _Refs: R-new-tools, R-retailer-monitoring_
  - [ ] 4.7 Implement `get_campaign_performance` tool
    - Input schema: `z.object({ campaign_id: z.string().optional().describe('Specific campaign ID, or omit for all campaigns') })`
    - Calculate conversion rate: orders placed / retailers reached, with per-zone breakdown
    - Return `{ campaignId, productName, totalReached, totalOrdered, conversionRate, zones: [...] }`
    - _Refs: R-new-tools, R-campaign-analytics_
  - [ ] 4.8 Implement `send_campaign_reminder` tool
    - Input schema: `z.object({ campaign_id: z.string().describe('Campaign ID to send reminders for') })`
    - Verify the campaign has been sent at least once (return error if not)
    - Identify retailers who have not ordered since the campaign was sent
    - Re-send the campaign to those retailers only
    - Return summary: `{ campaignId, remindersSent, retailersTargeted }`
    - _Refs: R-new-tools, R-campaign-follow-up_

- [ ] 5. Implement Autonomy Classification
  - [ ] 5.1 Create `src/lib/strands/autonomy.ts`
    - Export `AUTO_EXECUTE_TOOLS: Set<string>` containing: `get_dashboard_summary`, `scan_inventory`, `get_alerts`, `get_alert_detail`, `generate_recommendation`, `get_campaigns`, `get_campaign_detail`, `get_whatsapp_groups`, `auto_handle_dead_stock`, `get_network_overview`, `get_pending_orders`, `suggest_dispatch_batch`, `check_retailer_activity`, `get_campaign_performance`, `send_campaign_reminder`
    - Export `NEEDS_APPROVAL_TOOLS: Set<string>` containing: `send_campaign`, `create_dispatch_batch`, `confirm_order`, `reject_order`
    - Export a helper `isSuggestionResult(result: unknown): boolean` that checks for the `{ type: "suggestion" }` shape
    - _Refs: R-two-tier-autonomy_

- [ ] 6. Update the Chat API Route
  - [ ] 6.1 Refactor `src/app/api/chat/route.ts` for Strands Agent
    - Remove imports: `BedrockRuntimeClient`, `ConverseCommand`, `Tool` from `@aws-sdk/client-bedrock-runtime`
    - Remove imports: `TOOL_DEFINITIONS`, `executeTool` from `@/lib/agent-tools`
    - Remove: the `client` constant (BedrockRuntimeClient instance)
    - Remove: the entire while loop (lines 111-160 approximately) and manual message array construction
    - Add import: `Agent` from `@strands-agents/sdk`
    - Add import: `bedrockModel` from `@/lib/strands/model`
    - Add import: `allTools` from `@/lib/strands/tools`
    - Add import: `isSuggestionResult` from `@/lib/strands/autonomy`
    - _Refs: R-sdk-migration_
  - [ ] 6.2 Implement the new Bedrock mode handler
    - Create the Agent instance with `bedrockModel`, `SYSTEM_PROMPT`, and `allTools`
    - Extract the last user message from the messages array
    - Call `await agent.invoke(lastUserMessage)`
    - Extract `result.message` as the reply text
    - Collect campaign IDs from the result (adapt `collectCampaignIds` to work with Agent results)
    - Collect any suggestion cards from tool results using `isSuggestionResult`
    - Return `{ reply, campaigns, suggestions }` in the existing response shape
    - _Refs: R-sdk-migration, R-backward-compat_
  - [ ] 6.3 Update the system prompt for 18 tools
    - Expand the SYSTEM_PROMPT to describe the 7 new capabilities: order management, dispatch batching, retailer monitoring, campaign performance
    - Add instructions for the two-tier autonomy: "For mutating actions (sending campaigns, confirming orders, creating dispatch batches), present the suggestion to the user and wait for approval before executing."
    - Keep existing instructions about tone, Tamil/English mix, and conciseness
    - _Refs: R-system-prompt, R-two-tier-autonomy_
  - [ ] 6.4 Preserve demo mode and campaign card collection
    - Verify `isDemoMode` check and `handleDemoMode()` function are untouched
    - Verify `getCampaignCards()` still works for attaching poster data
    - Verify response shape `{ reply, campaigns?, openWhatsApp? }` is maintained, with new optional `suggestions?` field
    - _Refs: R-demo-mode, R-backward-compat_

- [ ] 7. Testing
  - [ ] 7.1 Write unit tests for Zod tool schemas
    - Create `src/lib/strands/__tests__/tools.test.ts`
    - Test each tool's Zod schema accepts valid input and rejects invalid input
    - Test that `allTools` has exactly 18 entries with unique names
    - Test that all tool names and descriptions are non-empty
    - _Refs: R-tool-rewrite_
  - [ ] 7.2 Write unit tests for tool callbacks
    - Test each of the 11 rewritten tools produces the same output shape as the original
    - Test needs-approval tools return suggestion objects
    - Test new tools with missing data return error objects (not throws)
    - _Refs: R-tool-rewrite, R-new-tools, R-two-tier-autonomy_
  - [ ] 7.3 Write integration tests for the updated chat route
    - Test Bedrock mode: mock Agent.invoke(), verify response shape
    - Test demo mode: verify keyword matching returns expected responses
    - Test that suggestion cards appear in response when mutating tools are invoked
    - Test error handling: Agent.invoke() throws, verify 500 response with user-friendly error
    - _Refs: R-sdk-migration, R-backward-compat_

- [ ] 8. Cleanup
  - [ ] 8.1 Mark `src/lib/agent-tools.ts` as deprecated
    - Add a comment at the top of `src/lib/agent-tools.ts`: "DEPRECATED: Tool definitions and execution have moved to src/lib/strands/tools.ts. This file is retained for reference only."
    - Verify no other files import from `@/lib/agent-tools` (the chat route should now import from `@/lib/strands/*`)
    - _Refs: R-sdk-migration_
  - [ ] 8.2 Verify the build compiles cleanly
    - Run `npm run build` and confirm no TypeScript errors
    - Confirm no unused import warnings from the migration
    - _Refs: R-sdk-migration_

## Sequencing Rationale

Tasks are ordered dependency-first:

1. **Dependencies and structure first** (Task 1) because nothing else can start without the packages installed and the directory created.

2. **Model configuration second** (Task 2) because the Agent needs a model instance. This is a one-liner but must exist before the Agent can be constructed.

3. **Existing 11 tools third** (Task 3) because these are the known-good baseline. Rewriting them with Zod while keeping the same callback logic lets us verify the migration works before adding new complexity. Each subtask is independent -- they can be done in any order within the group.

4. **New 7 tools fourth** (Task 4) because they build on the same patterns established in Task 3. These can also be done in any order within the group. They depend on the Zod/tool() pattern being established but not on the route being updated.

5. **Autonomy classification fifth** (Task 5) because it depends on knowing the full tool list (Tasks 3 + 4). It is a simple classification module with no external dependencies.

6. **Route update sixth** (Task 6) because it is the integration point that brings everything together. It depends on the model (Task 2), all tools (Tasks 3-4), and the autonomy module (Task 5). This is where the manual loop gets replaced.

7. **Testing seventh** (Task 7) because tests validate the completed implementation. Some tests could be written alongside earlier tasks (TDD style), but they are grouped here for clarity. Schema tests can run as soon as Task 3 is done.

8. **Cleanup last** (Task 8) because it is safe only after everything is working and tested.

## Definition of Done

- [ ] @strands-agents/sdk and zod are in package.json and the project builds without errors
- [ ] All 18 tools are defined with Zod schemas and typed callbacks in `src/lib/strands/tools.ts`
- [ ] The 11 existing tools produce identical output shapes to the current implementation
- [ ] The 7 new tools return correct data structures (or suggestion cards for mutating tools)
- [ ] `src/app/api/chat/route.ts` uses `Agent.invoke()` instead of a manual while loop
- [ ] BedrockModel is configured from environment variables with sensible defaults
- [ ] Two-tier autonomy: read tools auto-execute, mutating tools return suggestion cards
- [ ] Demo mode is unchanged and works without Bedrock credentials
- [ ] API response shape is backward compatible: `{ reply, campaigns?, suggestions?, openWhatsApp? }`
- [ ] Campaign card collection from tool results still works
- [ ] System prompt is updated to describe all 18 tools and autonomy rules
- [ ] Unit tests pass for Zod schemas, tool callbacks, and route handler
- [ ] No TypeScript compilation errors
- [ ] `src/lib/agent-tools.ts` is marked deprecated and no longer imported by the chat route
