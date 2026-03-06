## Feature Summary

Replace the manual Bedrock Converse API agent loop in the VyaparSahayak chat backend with the @strands-agents/sdk TypeScript SDK. The current implementation in `src/app/api/chat/route.ts` runs a hand-rolled `while (stopReason === "tool_use")` loop, dispatching 11 tools defined as raw JSON Schema objects in `src/lib/agent-tools.ts`. The new implementation uses the Strands Agent class to manage the conversation loop automatically, rewrites all 11 existing tools as Zod-typed `tool()` definitions, and adds 7 new tools covering order management, dispatch batching, retailer activity monitoring, and campaign performance analytics -- bringing the total to 18 tools. Demo mode (intent-matching fallback) is preserved for environments where Bedrock is not enabled.

## User Stories

- As a distributor, I want to ask the chatbot about pending orders so that I can see order counts and values grouped by zone without opening a separate page.
- As a distributor, I want to confirm or reject orders through the chat so that I can manage order flow conversationally.
- As a distributor, I want the chatbot to suggest optimal dispatch batches so that I can group confirmed orders for efficient delivery.
- As a distributor, I want to create dispatch batches through the chat so that I can act on the suggestions without switching to another interface.
- As a distributor, I want the chatbot to flag inactive retailers so that I can follow up with retailers who have gone quiet relative to their usual ordering frequency.
- As a distributor, I want to check campaign performance (conversion rates, per-zone breakdown) so that I can see which campaigns are driving orders.
- As a distributor, I want the chatbot to re-send campaigns to retailers who have not ordered yet so that I can improve conversion without manually tracking who responded.
- As a distributor, I want the chatbot to handle multi-step tool calls automatically (without a visible loop or manual iteration) so that responses feel instant and natural.
- As a distributor, I want the existing 11 tools to keep working exactly as before so that nothing breaks when the underlying SDK changes.

## Acceptance Criteria

### SDK Migration

- WHEN the chat API route receives a user message with CHAT_USE_BEDROCK=true THEN the system SHALL use a Strands Agent instance (not a manual while loop) to process the message and return the final response.
- WHEN the Strands Agent is constructed THEN the system SHALL configure it with a BedrockModel pointing to the model ID from BEDROCK_TEXT_MODEL env var (defaulting to `us.anthropic.claude-sonnet-4-20250514-v1:0`) and the region from AWS_REGION (defaulting to `us-east-1`).
- WHEN the Agent is invoked THEN the system SHALL pass all 18 tools and the system prompt, and the SDK SHALL manage the tool-use loop internally.
- WHEN the Agent returns a result THEN the system SHALL extract the final text from `result.message` and return it in the existing `{ reply, campaigns, suggestions }` response shape.

### Tool Rewrite (Existing 11)

- WHEN any of the 11 existing tools is called by the agent THEN the system SHALL execute the same underlying logic (Prisma queries, cache calls, ML scoring, recommendation generation) as the current implementation.
- WHEN a tool is defined THEN the system SHALL use the Zod schema format (`tool({ name, description, inputSchema: z.object(...), callback })`) instead of raw JSON Schema `toolSpec` objects.
- WHEN tool input is received THEN the system SHALL have fully typed parameters via Zod inference -- no `as unknown` casts on input.

### New Tools (7)

- WHEN the agent calls `get_pending_orders` THEN the system SHALL return orders grouped by zone with counts and total values.
- WHEN the agent calls `confirm_order` with an order ID THEN the system SHALL update the order status to confirmed and return the updated order.
- WHEN the agent calls `reject_order` with an order ID and a reason THEN the system SHALL update the order status to rejected with the given reason.
- WHEN the agent calls `suggest_dispatch_batch` THEN the system SHALL analyze pending confirmed orders and logistics data, returning suggested groupings by zone with estimated delivery metrics.
- WHEN the agent calls `create_dispatch_batch` with a zone code and order IDs THEN the system SHALL group those orders into a named batch and return the batch summary.
- WHEN the agent calls `check_retailer_activity` THEN the system SHALL identify retailers with no orders in X days relative to their usual ordering frequency and return a flagged list.
- WHEN the agent calls `get_campaign_performance` THEN the system SHALL return conversion rates (orders divided by retailers reached) with a per-zone breakdown.
- WHEN the agent calls `send_campaign_reminder` with a campaign ID THEN the system SHALL re-send the campaign to retailers who have not placed an order since the campaign was first sent.

### Two-Tier Autonomy

- WHEN the agent invokes a read-only tool (any `get_*` tool, `generate_recommendation`, `send_campaign_reminder`, `check_retailer_activity`) THEN the system SHALL auto-execute it silently without user confirmation.
- WHEN the agent invokes a mutating tool (`send_campaign`, `create_dispatch_batch`, `confirm_order`, `reject_order`) THEN the system SHALL return a suggestion card in the response instead of executing immediately, letting the user approve or reject.

### Demo Mode

- WHEN CHAT_USE_BEDROCK is not "true" THEN the system SHALL use the existing intent-matching demo handler and SHALL NOT instantiate a Strands Agent.
- WHEN in demo mode THEN the system SHALL support the same keywords and response patterns as the current `handleDemoMode` function.

### Backward Compatibility

- WHEN the chat API returns a response THEN the system SHALL maintain the existing response shape: `{ reply: string, campaigns?: CampaignCard[], suggestions?: SuggestionCard[], openWhatsApp?: string[] }`.
- WHEN campaign IDs appear in tool results THEN the system SHALL still collect them and attach campaign cards to the response, matching current behavior.

## Edge Cases

- Agent invokes a tool that throws an unhandled exception -- the Strands SDK should surface the error; the route handler catches it and returns a user-friendly error message without crashing.
- Agent loop exceeds a reasonable turn count -- configure the Agent's max turns (or rely on SDK defaults) to prevent runaway loops; return a fallback message if exceeded.
- A new tool (e.g., `confirm_order`) is called with an order ID that does not exist -- return `{ error: "Order not found" }` as the tool result so the agent can relay it conversationally.
- `suggest_dispatch_batch` is called when there are zero confirmed orders -- return an empty suggestions array with a message, not an error.
- `send_campaign_reminder` is called for a campaign that was never sent -- return an error explaining the campaign must be sent first before reminders can go out.
- `check_retailer_activity` is called when no retailers exist -- return an empty list with a message, not a crash.
- Zod validation fails on tool input (e.g., missing required field) -- Strands SDK handles this by returning a validation error to the model, which can re-try or explain the issue.
- The @strands-agents/sdk package is not installed or fails to import -- the build fails at compile time (caught during development, not at runtime).
- Two mutating tools are suggested in the same turn -- both should appear as separate suggestion cards; the user can approve them independently.

## Out of Scope

- Streaming responses from the Strands Agent (v1 returns the full response at once).
- Migrating the demo mode handler to use Strands (demo mode stays as keyword matching).
- Adding new database tables or Prisma schema changes for orders and dispatch batches (use existing models or mock data for the 7 new tools in the demo).
- UI changes to the chat panel itself (this spec covers only the backend/agent layer).
- Custom retry logic or circuit breakers around the Bedrock model calls.
- Multi-agent orchestration or agent-to-agent delegation.
- Removing the old @aws-sdk/client-bedrock-runtime dependency (bedrock.ts still uses it for image/text generation outside the chat).
