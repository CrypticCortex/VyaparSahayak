## Overview

The agentic chatbot adds a floating chat interface to the VyaparSahayak demo dashboard that lets distributors ask questions and perform actions through natural language. A single Next.js API route (`/api/chat`) implements an agent loop using AWS Bedrock's Converse API with tool-use -- the server sends user messages plus tool definitions to Nova Lite, executes any tool calls Bedrock requests by reusing existing Prisma queries and API logic in-process, feeds results back, and repeats until Bedrock returns a final text response. All chat history lives in client-side React state; no new database tables are needed.

## Architecture

```
+--------------------------------------------------+
|  Browser (React 19)                              |
|                                                  |
|  DemoLayout                                      |
|    +-- page content (existing)                   |
|    +-- <ChatBubble />          (floating button)  |
|         +-- <ChatPanel />      (slide-up sheet)   |
|              +-- message list  (client state)     |
|              +-- input bar                        |
|                                                  |
|  POST /api/chat  { messages: ChatMessage[] }     |
+---------------------|----------------------------+
                      | fetch (streaming optional, v1 non-streaming)
                      v
+--------------------------------------------------+
|  /api/chat/route.ts  (Next.js Route Handler)     |
|                                                  |
|  1. Receive messages array                       |
|  2. Build Converse API request with toolConfig   |
|  3. Send to Bedrock (ConverseCommand)            |
|  4. If response has toolUse blocks:              |
|     a. Execute each tool via tool-executor.ts    |
|     b. Append toolResult to messages             |
|     c. Loop back to step 3                       |
|  5. Return final assistant text + any tool       |
|     results that contain renderable data         |
+--------------------------------------------------+
        |                          |
        v                          v
+----------------+    +-------------------------+
| tool-executor  |    | Bedrock Converse API    |
| (server-side)  |    | amazon.nova-lite-v1:0   |
|                |    | with toolConfig         |
| Dispatches to: |    +-------------------------+
| - Prisma/cache |
| - detect logic |
| - recommend    |
|   logic        |
+----------------+
```

The agent loop runs entirely server-side. The client sends the full conversation history on each request (since there is no server-side session), and the API route runs the loop until Bedrock produces a final text response or hits a max-iterations guard.

## Components and Interfaces

### 1. ChatBubble (client component)

**File:** `src/components/dashboard/chat-bubble.tsx`

**Responsibility:** Floating action button in the bottom-right corner of the demo layout. Toggles the ChatPanel open/closed. Shows an unread indicator dot when there are new assistant messages.

**Inputs:** None (self-contained state).
**Outputs:** Renders a fixed-position button. Controls ChatPanel visibility via local state.

**Placement:** Rendered inside `src/app/demo/layout.tsx`, positioned above the BottomNav (bottom-right, `bottom-24 right-4` to clear the nav bar).

### 2. ChatPanel (client component)

**File:** `src/components/dashboard/chat-panel.tsx`

**Responsibility:** The chat interface itself -- message list, input bar, loading state, error display. Manages the conversation state array and handles the fetch call to `/api/chat`.

**Inputs:**
- `isOpen: boolean` -- controls visibility
- `onClose: () => void` -- callback to close the panel

**Outputs:** Renders a slide-up panel (using the existing Sheet component from `src/components/ui/sheet.tsx` or a custom div with framer-motion). Sends POST requests to `/api/chat`.

**Key behaviors:**
- Maintains `messages: ChatMessage[]` in React useState
- On submit: appends user message, calls `/api/chat` with full history, appends assistant response
- Renders tool-result cards inline (alert cards, campaign previews, scan summaries) using existing components like `ProductCard`, `RiskBadge`, `CampaignPreview`
- Shows a typing indicator while waiting for the API response
- Auto-scrolls to bottom on new messages
- Input is disabled while a request is in-flight

### 3. Chat API Route

**File:** `src/app/api/chat/route.ts`

**Responsibility:** The agent loop. Receives conversation history, runs the Bedrock Converse loop with tool execution, returns the final response.

**Input (request body):**
```typescript
{
  messages: ChatMessage[]  // full conversation history from client
}
```

**Output (response body):**
```typescript
{
  reply: string            // final assistant text
  toolResults?: {          // structured data from tools, for rich rendering
    toolName: string
    data: unknown
  }[]
}
```

**Agent loop pseudocode:**
```
converseMessages = convertToBedrockFormat(messages)
iterations = 0

while iterations < MAX_ITERATIONS (5):
    response = bedrock.send(ConverseCommand({ messages, toolConfig, system }))

    if response.stopReason === "tool_use":
        for each toolUse block in response.output.message.content:
            result = await executeTool(toolUse.name, toolUse.input)
            append toolResult to converseMessages
        iterations++
        continue

    if response.stopReason === "end_turn":
        extract text from response.output.message.content
        return { reply: text, toolResults }

return { reply: "Sorry, I could not complete that action." }
```

### 4. Tool Definitions Module

**File:** `src/lib/chat/tool-definitions.ts`

**Responsibility:** Exports the `toolConfig` object for the Bedrock Converse API. Each tool has a name, description, and JSON Schema for its `inputSchema`.

**Output:** A `ToolConfiguration` object matching the Bedrock Converse API shape:
```typescript
{
  tools: [
    {
      toolSpec: {
        name: "scan_inventory",
        description: "...",
        inputSchema: { json: { type: "object", properties: {}, required: [] } }
      }
    },
    // ... 8 more tools
  ]
}
```

### 5. Tool Executor Module

**File:** `src/lib/chat/tool-executor.ts`

**Responsibility:** Maps tool names to implementations. Each tool function calls existing Prisma queries / cache functions / in-process logic -- NOT HTTP fetches to the app's own API routes (avoids the overhead and potential issues of self-calling).

**Input:** `toolName: string`, `toolInput: Record<string, unknown>`
**Output:** `Promise<{ success: boolean; data: unknown; error?: string }>`

**Tool implementation mapping:**

| Tool Name | Calls | Returns |
|---|---|---|
| `scan_inventory` | Reuses logic from `src/app/api/detect/route.ts` (extract features, score, save alerts) | Scan summary: counts, value, top alerts |
| `get_alerts` | `getCachedAlerts()` + `getCachedProducts()` from `src/lib/cache.ts` | Alert list with product names |
| `get_alert_detail` | `getCachedAlert(id)` + `getCachedProduct(productId)` | Single alert with product info |
| `generate_recommendation` | Reuses logic from `src/app/api/recommend/[id]/route.ts` | Recommendation + campaign ID |
| `get_campaigns` | `prisma.campaign.findMany()` via cache | Campaign list |
| `get_campaign_detail` | `getCachedCampaign(id)` | Campaign with poster URL, WhatsApp message |
| `send_campaign` | Reuses logic from `src/app/api/campaign/send/route.ts` | Send confirmation |
| `get_network_overview` | `getCachedNetworkData()` | Zone stats, retailer counts |
| `get_dashboard_summary` | `getCachedDashboardData()` | Aggregate metrics |

### 6. System Prompt Module

**File:** `src/lib/chat/system-prompt.ts`

**Responsibility:** Builds the system prompt for the Converse API. Tells the model who it is, what tools are available, the distributor context, and how to format responses.

**Key content of the system prompt:**
- You are VyaparSahayak AI assistant for an Indian FMCG distributor
- You help with inventory management, dead stock detection, campaign creation
- Respond concisely; this is a mobile chat interface
- Use tools proactively -- if the user asks about dead stock, call get_alerts
- When showing lists, summarize the top items rather than dumping everything
- Always confirm before executing destructive/send actions
- If tools return data the user might want to see, include key numbers in your text response

### 7. Demo Mode Handler

**File:** Inline within `src/lib/chat/tool-executor.ts`

**Responsibility:** When `isDemoMode` is true (no AWS credentials), the chat API route skips the Bedrock call entirely and uses a simple keyword-matching fallback that returns canned responses with real data from the database. This mirrors the existing `isDemoMode` pattern in `src/lib/bedrock.ts`.

**Approach:** The tool executor always works (it calls Prisma directly). Only the LLM call needs a demo fallback. The demo handler:
1. Runs keyword matching on the latest user message
2. Calls relevant tools directly to get real data
3. Returns a templated response string

## Data Models

### ChatMessage (client-side, TypeScript interface)

```typescript
interface ChatMessage {
  id: string            // crypto.randomUUID()
  role: "user" | "assistant"
  content: string       // text content
  toolResults?: {       // attached structured data for rich rendering
    toolName: string
    data: unknown       // tool-specific shape, used by renderer
  }[]
  timestamp: number     // Date.now()
}
```

**Validation:** `content` must be a non-empty string after trim. `role` must be one of the two allowed values. Max message length: 500 characters (enforced client-side).

### ConverseMessage (internal, for Bedrock API)

```typescript
// Built from ChatMessage[] before sending to Bedrock
interface ConverseMessage {
  role: "user" | "assistant"
  content: ContentBlock[]  // text, toolUse, or toolResult blocks
}
```

This is the native Bedrock Converse API shape from `@aws-sdk/client-bedrock-runtime`. Not a custom type -- we use the SDK types directly.

### ChatApiRequest

```typescript
interface ChatApiRequest {
  messages: ChatMessage[]  // max 50 messages, validated server-side
}
```

**Validation rules:**
- `messages` must be an array with 1-50 items
- Last message must have `role: "user"`
- Messages must alternate user/assistant (after filtering toolResults)
- Total content length across all messages must be under 50,000 characters

### ChatApiResponse

```typescript
interface ChatApiResponse {
  reply: string
  toolResults?: {
    toolName: string
    data: unknown
  }[]
  error?: string
}
```

### ToolResult (internal)

```typescript
interface ToolResult {
  success: boolean
  data: unknown      // JSON-serializable, tool-specific
  error?: string     // present when success is false
}
```

## Key Decisions

### Decision: Converse API instead of InvokeModel

- **Context:** The existing `src/lib/bedrock.ts` uses `InvokeModelCommand` with raw JSON payloads. Tool-use requires multi-turn message management with toolUse/toolResult content blocks.
- **Options:** (a) Build tool-use protocol manually with InvokeModelCommand; (b) Use the Converse API which has native tool-use support.
- **Choice:** Converse API. It handles the tool-use content block protocol natively, works across model families without payload format differences, and the SDK types (`ConverseCommand`, `ToolConfiguration`) give us type safety. The existing `InvokeModelCommand` code in bedrock.ts stays untouched -- the chat feature uses a separate code path.

### Decision: In-process tool execution, not HTTP self-calls

- **Context:** Tools need to call the same logic as `/api/detect`, `/api/recommend/[id]`, and `/api/campaign/send`.
- **Options:** (a) Have the server fetch its own API routes via HTTP; (b) Extract shared logic into importable functions and call them directly.
- **Choice:** In-process calls. Self-fetching adds latency, complicates error handling, and can cause issues with Next.js middleware/auth. The detect and recommend routes contain inline logic that we can extract into shared functions (or import the core logic from `src/lib/ml/*` and `src/lib/cache.ts` directly). For `scan_inventory`, we import `extractFeatures`, `scoreDeadStock`, and `generateRecommendation` from `src/lib/ml/*` and run the same Prisma operations. For `send_campaign`, the logic is just a Prisma update -- trivial to inline.

### Decision: Client-side chat history, no persistence

- **Context:** The constraint says "no new database tables" and "chat state is client-side only."
- **Options:** (a) Store chat in a new DB table; (b) Use localStorage; (c) Keep it in React state only.
- **Choice:** React state only. Chat resets on page refresh. This is fine for a demo. We send the full history array to the API on each request so the LLM has context. A future version could add localStorage persistence if needed, but that is out of scope here.

### Decision: Max 5 agent loop iterations

- **Context:** The agent loop calls Bedrock repeatedly when tools are invoked. A runaway loop could burn API credits and hang the request.
- **Options:** Various limits from 3 to 10.
- **Choice:** 5 iterations. Most realistic flows need at most 2-3 tool calls (e.g., get_alerts -> get_alert_detail -> generate_recommendation). 5 gives headroom for complex multi-step requests without risking runaway behavior. If the limit is hit, the API returns the last text response or a fallback message.

### Decision: Floating bubble + slide-up panel, not a full page

- **Context:** Mobile-first constraint. The chat should be accessible from any page without navigation.
- **Options:** (a) Dedicated /demo/chat page; (b) Side drawer; (c) Floating bubble with slide-up sheet.
- **Choice:** Floating bubble. It follows mobile chat patterns (WhatsApp, Intercom), works on every demo page without routing changes, and the existing `Sheet` component from `src/components/ui/sheet.tsx` or framer-motion (already a dependency) handles the slide animation. The bubble sits at `bottom-24 right-4` to avoid overlapping the `BottomNav` which is fixed at `bottom-0`.

### Decision: Nova Lite model for chat

- **Context:** The app already uses `amazon.nova-lite-v1:0` for text generation via InvokeModelCommand.
- **Options:** (a) Nova Lite (cheapest, fast); (b) Nova Pro (more capable, more expensive); (c) Claude via Bedrock.
- **Choice:** Nova Lite, matching the existing model choice. It supports tool-use via the Converse API, is cost-effective for a demo, and keeps the AWS dependency consistent. The model ID is read from `BEDROCK_TEXT_MODEL` env var so it can be swapped without code changes.

## Error Handling

### Bedrock API failures

The Converse API call is wrapped in try/catch. On failure (throttling, model errors, network issues), the API route returns a `ChatApiResponse` with `error` set and `reply` containing a user-friendly message like "I'm having trouble connecting right now. Please try again." The client displays this as an assistant message with an error style. No retry logic in v1 -- keep it simple.

### Tool execution failures

Each tool call in `tool-executor.ts` is wrapped in try/catch. On failure, the executor returns `{ success: false, error: "description" }`. This result is sent back to Bedrock as a `toolResult` with `status: "error"`, letting the model explain the failure to the user naturally (e.g., "I tried to scan your inventory but encountered an error. You can try again or scan manually from the Alerts page.").

### Max iterations exceeded

If the agent loop hits 5 iterations without a final text response, the route returns whatever text Bedrock last produced, or a fallback: "I performed several actions but could not complete the full request. Check the dashboard for any changes."

### Invalid request payload

The API route validates the request body (message count, content length, role alternation). Returns 400 with a JSON error for malformed requests.

### Demo mode

When `isDemoMode` is true (detected the same way as `src/lib/bedrock.ts` -- checking `AWS_ACCESS_KEY_ID`), the Bedrock Converse call is replaced with the keyword-matching demo handler. Tool execution still works normally since it hits the local SQLite database. This means the chat always returns real data from the seeded DB, just with templated response text instead of LLM-generated text.

### Empty database

If no distributor exists (unseeded DB), tools that need a distributor ID return an error result telling the model to instruct the user to visit the dashboard first or run the seed. Mirrors the guard in `src/app/api/detect/route.ts`.

## Testing Strategy

### Unit tests -- tool executor

Test each of the 9 tool functions in `tool-executor.ts` individually:
- Call with valid inputs, verify the return shape matches expectations
- Call with invalid inputs (bad alert ID, missing campaign ID), verify `{ success: false }` with descriptive error
- Use the seeded SQLite database for test data

These are the highest-value tests because the tool executor is the bridge between the LLM and the data layer.

### Unit tests -- tool definitions

Validate the `toolConfig` object:
- Every tool has a name, description, and valid JSON Schema
- Tool names in definitions match the keys in the executor's dispatch map
- No duplicate tool names

### Integration test -- agent loop

Test the `/api/chat` route handler directly (not over HTTP):
- Send a messages array with a user message like "How many dead stock alerts do I have?"
- In demo mode, verify the response contains real alert count data
- Verify the response shape matches `ChatApiResponse`
- Test the max-iterations guard by mocking Bedrock to always return toolUse

### Component tests -- ChatPanel

- Renders message list correctly for a given messages array
- Input is disabled during loading state
- User message appears immediately on submit (optimistic update)
- Error messages render with distinct styling
- Tool result cards render for known tool names (scan summary, alert list, campaign)

### Manual smoke tests

These cover the end-to-end flow since mocking the full Bedrock Converse cycle in automated tests is complex:
1. Open demo dashboard, click chat bubble, ask "scan my inventory" -- verify scan runs and results appear
2. Ask "show my alerts" -- verify alert list renders
3. Ask "tell me about the first alert" -- verify detail card renders
4. Ask "generate a campaign for it" -- verify recommendation + campaign creation
5. Ask "send the campaign" -- verify confirmation prompt and send execution
6. Test on mobile viewport (375px) -- verify panel sizing, input keyboard behavior, scroll
