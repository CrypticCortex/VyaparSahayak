## Overview

This feature replaces the hand-rolled Bedrock Converse API agent loop in `src/app/api/chat/route.ts` with a Strands Agent from `@strands-agents/sdk`. The manual `while (stopReason === "tool_use" && turns < MAX_TURNS)` loop, raw JSON Schema tool definitions, and untyped tool dispatch switch statement are all replaced by a single `Agent` instance configured with a `BedrockModel`, a system prompt, and 18 Zod-typed `tool()` definitions. The Agent class handles the conversation loop internally -- the route handler just calls `agent.invoke(userMessage)` and reads the result. Tool callback logic stays the same (Prisma queries, cache calls, ML functions); only the definition format and dispatch mechanism change.

## Architecture

```
+--------------------------------------------------+
|  Browser (React 19)                              |
|  ChatPanel -> POST /api/chat { messages }        |
+---------------------|----------------------------+
                      | fetch
                      v
+--------------------------------------------------+
|  /api/chat/route.ts  (Next.js Route Handler)     |
|                                                  |
|  if (!isDemoMode):                               |
|    const agent = new Agent({                     |
|      model: BedrockModel({ modelId, region }),   |
|      systemPrompt: SYSTEM_PROMPT,                |
|      tools: [...all18Tools],                     |
|    })                                            |
|    const result = await agent.invoke(message)    |
|    return { reply: result.message, campaigns }   |
|                                                  |
|  else:                                           |
|    return handleDemoMode(messages)  // unchanged |
+--------------------------------------------------+
        |                          |
        v                          v
+---------------------+   +------------------------+
| src/lib/strands/    |   | @strands-agents/sdk    |
|   tools.ts (18)     |   |   Agent class          |
|   model.ts          |   |   BedrockModel         |
|   autonomy.ts       |   |   tool() factory       |
+---------------------+   +------------------------+
        |
        v
+---------------------+
| Existing data layer |
| - src/lib/cache.ts  |
| - src/lib/db.ts     |
| - src/lib/ml/*      |
| - prisma client     |
+---------------------+
```

The key change is that the route handler no longer manages the tool-use loop. The Strands Agent takes the user message, calls the model, detects tool-use blocks, executes the matching tool callbacks, feeds results back, and repeats until the model produces a final text response. The route handler just awaits the result.

## Components and Interfaces

### 1. Strands Tool Definitions

**File:** `src/lib/strands/tools.ts`

**Responsibility:** Exports all 18 tools as Zod-typed `tool()` definitions. Each tool reuses the existing callback logic from `src/lib/agent-tools.ts` (the function bodies) but wraps them in the Strands `tool()` factory with a Zod input schema instead of raw JSON Schema.

**Structure:**
```typescript
import { tool } from '@strands-agents/sdk'
import { z } from 'zod'

export const getDashboardSummaryTool = tool({
  name: 'get_dashboard_summary',
  description: '...',
  inputSchema: z.object({}),
  callback: async () => {
    // same logic as current getDashboardSummary() in agent-tools.ts
  }
})

// ... 17 more tools

export const allTools = [
  getDashboardSummaryTool,
  scanInventoryTool,
  // ...all 18
]
```

**Existing 11 tools (rewritten with Zod, same logic):**
- `get_dashboard_summary` -- no input params
- `scan_inventory` -- no input params
- `get_alerts` -- no input params
- `get_alert_detail` -- `{ alert_id: z.string() }`
- `generate_recommendation` -- `{ alert_id: z.string() }`
- `get_campaigns` -- no input params
- `get_campaign_detail` -- `{ campaign_id: z.string() }`
- `send_campaign` -- `{ campaign_id: z.string(), zone_codes: z.array(z.string()).optional() }`
- `get_whatsapp_groups` -- no input params
- `auto_handle_dead_stock` -- `{ max_items: z.number().optional(), auto_send: z.boolean().optional() }`
- `get_network_overview` -- no input params

**7 new tools:**
- `get_pending_orders` -- `{ zone_code: z.string().optional() }`
- `confirm_order` -- `{ order_id: z.string() }`
- `reject_order` -- `{ order_id: z.string(), reason: z.string() }`
- `suggest_dispatch_batch` -- `{ zone_code: z.string().optional() }`
- `create_dispatch_batch` -- `{ zone_code: z.string(), order_ids: z.array(z.string()) }`
- `check_retailer_activity` -- `{ inactive_days: z.number().optional() }`
- `get_campaign_performance` -- `{ campaign_id: z.string().optional() }`
- `send_campaign_reminder` -- `{ campaign_id: z.string() }`

### 2. Strands Model Configuration

**File:** `src/lib/strands/model.ts`

**Responsibility:** Exports a configured `BedrockModel` instance that reads model ID and region from environment variables.

```typescript
import { BedrockModel } from '@strands-agents/sdk'

export const bedrockModel = new BedrockModel({
  modelId: process.env.BEDROCK_TEXT_MODEL || 'us.anthropic.claude-sonnet-4-20250514-v1:0',
  region: process.env.AWS_REGION || 'us-east-1',
})
```

### 3. Autonomy Classification

**File:** `src/lib/strands/autonomy.ts`

**Responsibility:** Defines which tools are auto-execute (read-only, run silently) and which need user approval (mutating, return a suggestion card). The route handler checks tool results against this classification to decide whether to include suggestion cards in the response.

**Auto-execute tools (agent runs silently):**
- All `get_*` tools (reads)
- `generate_recommendation`
- `send_campaign_reminder`
- `check_retailer_activity`
- `scan_inventory`
- `auto_handle_dead_stock`

**Needs-approval tools (return suggestion card):**
- `send_campaign`
- `create_dispatch_batch`
- `confirm_order`
- `reject_order`

**Implementation approach:** The tool callback itself always executes. For needs-approval tools, the callback returns a structured `{ type: "suggestion", action: "...", details: {...} }` object instead of performing the mutation. The route handler detects these suggestion objects and includes them as `suggestions` in the API response. When the user approves, a follow-up message triggers the actual execution.

### 4. Updated Chat API Route

**File:** `src/app/api/chat/route.ts`

**Responsibility:** Simplified route handler. The agent loop is gone -- replaced by a single `agent.invoke()` call. Demo mode handling stays unchanged.

**Changes from current implementation:**
- Remove: `BedrockRuntimeClient`, `ConverseCommand`, `Tool` imports from `@aws-sdk/client-bedrock-runtime`
- Remove: `TOOL_DEFINITIONS`, `executeTool` imports from `@/lib/agent-tools`
- Remove: The entire `while (response.stopReason === "tool_use" && turns < MAX_TURNS)` loop
- Remove: Manual `bedrockMessages` array construction and management
- Add: Import `Agent` from `@strands-agents/sdk`
- Add: Import `bedrockModel` from `@/lib/strands/model`
- Add: Import `allTools` from `@/lib/strands/tools`
- Add: Create Agent instance, invoke with user message, extract result
- Keep: `isDemoMode` check and `handleDemoMode()` function (unchanged)
- Keep: `getCampaignCards()` helper and `collectCampaignIds()` helper
- Keep: `CampaignCard` interface and response shape

**Updated Bedrock mode flow:**
```typescript
const agent = new Agent({
  model: bedrockModel,
  systemPrompt: SYSTEM_PROMPT,
  tools: allTools,
})

const result = await agent.invoke(lastUserMessage)
const reply = result.message
const campaigns = await getCampaignCards([...seenCampaignIds])
return NextResponse.json({ reply, campaigns, suggestions })
```

### 5. Legacy Agent Tools (retained, deprecated)

**File:** `src/lib/agent-tools.ts`

**Responsibility:** The existing file is kept but no longer imported by the chat route. The tool callback functions are migrated into `src/lib/strands/tools.ts`. The old file can be removed in a follow-up cleanup, but is preserved during the migration to avoid breaking anything that might import it.

## Data Models

### SuggestionCard (new, TypeScript interface)

```typescript
interface SuggestionCard {
  id: string              // unique ID for this suggestion
  toolName: string        // which tool generated it
  action: string          // human-readable action description
  details: Record<string, unknown>  // tool-specific payload (order info, batch details, etc.)
  status: "pending" | "approved" | "rejected"
}
```

This is returned in the API response under `suggestions` when a needs-approval tool is invoked. The frontend renders it as an actionable card. No database storage -- it lives in the response payload only.

### PendingOrderSummary (new, tool result shape)

```typescript
interface PendingOrderSummary {
  zoneCode: string
  zoneName: string
  orderCount: number
  totalValue: number
  totalValueFormatted: string
  orders: { id: string; retailerName: string; value: number; createdAt: string }[]
}
```

### DispatchBatch (new, tool result shape)

```typescript
interface DispatchBatch {
  id: string
  zoneCode: string
  orderIds: string[]
  orderCount: number
  totalValue: number
  totalValueFormatted: string
  createdAt: string
}
```

### RetailerActivityFlag (new, tool result shape)

```typescript
interface RetailerActivityFlag {
  retailerId: string
  retailerName: string
  zoneName: string
  lastOrderDate: string | null
  daysSinceLastOrder: number
  usualFrequencyDays: number
  status: "inactive" | "declining"
}
```

### CampaignPerformance (new, tool result shape)

```typescript
interface CampaignPerformance {
  campaignId: string
  productName: string
  totalReached: number
  totalOrdered: number
  conversionRate: number
  zones: { zoneCode: string; reached: number; ordered: number; rate: number }[]
}
```

## Key Decisions

### Decision: Strands SDK instead of manual Converse loop

- **Context:** The current agent loop is ~60 lines of manual loop management, message array construction, tool dispatch, and error wrapping. It works but is boilerplate that the Strands SDK eliminates.
- **Options:** (a) Keep the manual loop and just add new tools; (b) Migrate to Strands SDK which handles the loop internally.
- **Choice:** Strands SDK. It reduces the route handler to a single `agent.invoke()` call, gives us typed tool definitions via Zod (eliminating `as unknown` casts), and is the direction AWS is pushing for Bedrock agent development. The SDK also handles edge cases like max turn limits and error propagation that we currently manage by hand.

### Decision: Zod for tool input schemas

- **Context:** Current tools use raw JSON Schema objects (`{ type: "object", properties: { ... } }`). These provide no TypeScript type inference -- tool inputs are cast with `as string` and `as number`.
- **Options:** (a) Keep JSON Schema; (b) Use Zod schemas with the Strands `tool()` factory.
- **Choice:** Zod. The `tool()` factory infers TypeScript types from the Zod schema, so `callback: async (input) => { ... }` has fully typed `input`. This eliminates the `input.alert_id as string` pattern and catches type errors at compile time. Zod is a standard dependency that also validates at runtime.

### Decision: Two-tier autonomy via tool callback return shape

- **Context:** Some tools are safe to auto-execute (reads), others need user approval (mutations like sending campaigns or confirming orders).
- **Options:** (a) Pre-filter tools before passing to the Agent based on context; (b) Let all tools execute but have mutating tools return a suggestion instead of performing the action; (c) Use Strands SDK hooks or middleware to intercept.
- **Choice:** Option (b) -- suggestion-based. Mutating tool callbacks return a `{ type: "suggestion", ... }` object. The Agent sees this as a successful tool result and can tell the user "I suggest doing X -- shall I proceed?" The route handler collects these suggestion objects and includes them in the API response as `suggestions[]`. This is the simplest approach that does not require SDK-level hooks and keeps the autonomy logic in our code.

### Decision: New tools file location

- **Context:** Current tools live in `src/lib/agent-tools.ts` (569 lines, flat file with definitions + implementations).
- **Options:** (a) Edit agent-tools.ts in place; (b) Create a new `src/lib/strands/` directory with separate files.
- **Choice:** New directory `src/lib/strands/`. The old file stays for backward compatibility during migration. The new structure separates concerns: `tools.ts` for definitions, `model.ts` for model config, `autonomy.ts` for the approval classification. This is cleaner than cramming 18 Zod tool definitions + callbacks into the existing 569-line file.

### Decision: Keep demo mode unchanged

- **Context:** Demo mode uses keyword matching and direct tool execution -- no LLM involved. Migrating it to Strands provides no benefit since there is no model call to manage.
- **Options:** (a) Migrate demo mode to use a mock Strands Agent; (b) Keep demo mode as-is.
- **Choice:** Keep as-is. Demo mode is simple, works well, and does not involve the Converse loop that Strands replaces. Changing it adds risk for zero benefit.

### Decision: Model upgrade to Claude Sonnet

- **Context:** The current implementation defaults to `amazon.nova-lite-v1:0`. The Strands SDK works best with models that have strong tool-use capabilities.
- **Options:** (a) Keep Nova Lite; (b) Switch to Claude Sonnet via Bedrock cross-region inference (`us.anthropic.claude-sonnet-4-20250514-v1:0`).
- **Choice:** Claude Sonnet as the new default. Nova Lite's tool-use support is limited and produces inconsistent tool calls with 18 tools. Claude Sonnet handles complex multi-tool scenarios reliably. The model ID is still configurable via BEDROCK_TEXT_MODEL env var, so Nova can be used if preferred.

## Error Handling

### Strands Agent errors

The `agent.invoke()` call is wrapped in try/catch. If the SDK throws (model errors, network failures, authentication issues), the route returns `{ error: "Something went wrong" }` with a 500 status. The error is logged server-side with the full stack trace.

### Tool callback errors

Each tool callback is wrapped in try/catch. On failure, the callback returns `{ error: "description" }`. The Strands SDK passes this back to the model as the tool result, letting the model explain the failure conversationally. This matches the current error handling pattern.

### Zod validation errors

If the model sends input that does not match the Zod schema (e.g., missing a required field), the Strands SDK catches the validation error and sends it back to the model as a tool error. The model typically retries with corrected input. No special handling needed on our side.

### Needs-approval tool errors

If a mutating tool's suggestion card is approved but the subsequent execution fails, the error is returned as a normal tool error. The model explains what went wrong and the user can retry.

### Max turns

The Strands Agent has a configurable max turns setting. We set it to 8 (matching the current MAX_TURNS constant) to prevent runaway loops. If exceeded, the Agent returns whatever text it has accumulated.

## Testing Strategy

### Unit tests -- Zod tool definitions

Validate each of the 18 tool definitions:
- Zod schema parses valid input without errors
- Zod schema rejects invalid input (missing required fields, wrong types)
- Tool name and description are non-empty strings
- No duplicate tool names across the allTools array

### Unit tests -- tool callbacks

Test each tool callback in isolation (same as current agent-tools tests):
- Call with valid input, verify return shape
- Call with invalid references (bad IDs), verify error object returned
- For needs-approval tools, verify the callback returns a suggestion object instead of performing the mutation

### Integration test -- Agent invocation

Test the route handler with a mock Strands Agent:
- Mock `agent.invoke()` to return a known result
- Verify the response shape includes `reply`, `campaigns`, and `suggestions`
- Verify campaign ID collection still works
- Verify demo mode bypasses the Agent entirely

### Smoke tests

- In Bedrock mode: send "show me my dashboard" and verify the Agent calls `get_dashboard_summary` and returns a natural language response
- Send "confirm order X" and verify a suggestion card is returned instead of immediate execution
- In demo mode: verify existing keyword matching still works identically
