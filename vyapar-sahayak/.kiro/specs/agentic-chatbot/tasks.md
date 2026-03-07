## Implementation Tasks

- [ ] 1. Agent Tool Definitions and Execution Layer
  - [ ] 1.1 Create tool schema definitions in `src/lib/agent-tools.ts`
    - Define JSON Schema tool specs for Bedrock Converse `toolConfig`: `get_dashboard_summary`, `list_alerts`, `get_alert_detail`, `run_detection_scan`, `get_recommendation`, `list_campaigns`, `get_campaign_detail`, `get_network_overview`
    - Each tool schema needs `name`, `description`, `inputSchema` with JSON Schema properties
    - Export a `TOOL_DEFINITIONS` array compatible with Bedrock Converse `toolConfig.tools`
    - _Refs: R-tools, R-reuse-existing-logic_
  - [ ] 1.2 Implement tool execution functions in `src/lib/agent-tools.ts`
    - Write an `executeTool(toolName: string, toolInput: Record<string, unknown>)` dispatcher
    - `get_dashboard_summary`: call `getCachedDistributor()` then `getCachedDashboardData(distributorId)` from `src/lib/cache.ts`, return formatted summary (alert count, total dead stock value, campaign count)
    - `list_alerts`: call `getCachedAlerts(distributorId)` + `getCachedProducts(productIds)`, return top N alerts with product names
    - `get_alert_detail`: call `getCachedAlert(id)` + `getCachedProduct(productId)`, return full alert with recommendation JSON
    - `run_detection_scan`: call the same logic as `src/app/api/detect/route.ts` POST handler (extract into a shared function or call via internal fetch)
    - `get_recommendation`: call the same logic as `src/app/api/recommend/[id]/route.ts` (reuse the core logic, not the poster generation)
    - `list_campaigns` / `get_campaign_detail`: use `getCachedDashboardData` and `getCachedCampaign`
    - `get_network_overview`: call `getCachedNetworkData(distributorId)`
    - _Refs: R-reuse-existing-logic, R-no-new-db-tables_
  - [ ] 1.3 Add demo mode mock responses for all tools
    - Check `isDemoMode` (same pattern as `src/lib/bedrock.ts` line 12) before calling real data
    - Return realistic static JSON for each tool so the chatbot works without AWS creds or seeded DB
    - _Refs: R-demo-mode_
  - [ ] 1.4 Write tests for agent tools
    - Create `src/lib/__tests__/agent-tools.test.ts`
    - Test `executeTool` dispatches correctly for each tool name
    - Test demo mode returns mock data when `AWS_ACCESS_KEY_ID` is unset
    - Test unknown tool name returns an error object (not a throw)
    - _Refs: R-tools, R-demo-mode_

- [ ] 2. Chat API Route with Bedrock Converse Agent Loop
  - [ ] 2.1 Create `src/app/api/chat/route.ts` with streaming POST endpoint
    - Accept `{ messages: Array<{ role: "user" | "assistant", content: string }> }` in request body
    - Import `BedrockRuntimeClient` and `ConverseCommand` from `@aws-sdk/client-bedrock-runtime` (add ConverseCommand import to existing client in `src/lib/bedrock.ts` or import directly)
    - Build the Converse API request: `modelId` = `amazon.nova-lite-v1:0`, `messages` array, `system` prompt (VyaparSahayak assistant context: you help Indian FMCG distributors manage dead stock, generate campaigns, etc.), `toolConfig` with the tool definitions from task 1.1
    - _Refs: R-bedrock-converse, R-agent-loop_
  - [ ] 2.2 Implement the agentic tool-use loop
    - After each `ConverseCommand` response, check `stopReason`
    - If `stopReason === "tool_use"`: extract tool use blocks from response, call `executeTool` for each, build `toolResult` content blocks, append to messages, call `ConverseCommand` again
    - Loop until `stopReason === "end_turn"` or max iterations (cap at 5 to prevent runaway)
    - Return final assistant text as JSON `{ reply: string, toolCalls: Array<{ tool: string, input: object, output: object }> }`
    - _Refs: R-agent-loop, R-bedrock-converse_
  - [ ] 2.3 Add demo mode for the chat endpoint
    - When `isDemoMode` is true, skip Bedrock calls entirely
    - Pattern-match user message keywords to return canned responses (e.g., "dashboard" -> summary, "alerts" -> alert list, "scan" -> mock detection result)
    - Return in same response shape as real mode
    - _Refs: R-demo-mode_
  - [ ] 2.4 Write tests for chat API route
    - Create `src/app/api/chat/__tests__/route.test.ts`
    - Test that POST with valid messages returns 200 with `{ reply, toolCalls }`
    - Test demo mode returns canned responses
    - Test that invalid body (missing messages) returns 400
    - Test max iteration cap prevents infinite loops (mock Bedrock to always return tool_use)
    - _Refs: R-agent-loop, R-demo-mode_

- [ ] 3. Chat UI Components
  - [ ] 3.1 Create `src/components/chat/chat-messages.tsx`
    - Client component (`"use client"`)
    - Props: `messages: Array<{ id: string, role: "user" | "assistant", content: string, toolCalls?: Array<{ tool: string }> }>`
    - Render message bubbles: user messages right-aligned (saffron/orange bg), assistant left-aligned (white bg with indigo border)
    - Auto-scroll to bottom on new messages using `useRef` + `scrollIntoView`
    - Show a subtle "used N tools" indicator on assistant messages that had tool calls
    - Use Tailwind classes consistent with existing dashboard theme (saffron `#FF6B00`, indigo `#1A237E`)
    - _Refs: R-chat-ui, R-mobile-first, R-tailwind_
  - [ ] 3.2 Create `src/components/chat/chat-input.tsx`
    - Client component
    - Text input with send button, auto-focus on mount
    - Props: `onSend: (message: string) => void`, `disabled: boolean`
    - Handle Enter key to send, Shift+Enter for newline
    - Mobile-friendly: large tap target (min 44px), full-width input
    - Show loading spinner in send button when `disabled` is true
    - _Refs: R-chat-ui, R-mobile-first_
  - [ ] 3.3 Create `src/components/chat/chat-widget.tsx`
    - Client component, manages all chat state (`useState` for messages, open/closed, loading)
    - Floating action button (FAB) in bottom-right corner, above the `BottomNav` (z-50, `bottom-24 right-4`)
    - Click FAB to expand into a chat panel (fixed position, mobile-full-width up to 375px, desktop 380px wide)
    - Panel has header with title "Vyapar Sahayak AI" and close button
    - On send: append user message to state, POST to `/api/chat` with full message history, append assistant reply to state
    - Show typing indicator while waiting for API response
    - Suggested quick-action chips on empty state: "Show dashboard summary", "Run dead stock scan", "List my alerts"
    - All state is client-side only, no persistence
    - _Refs: R-chat-ui, R-client-side-state, R-mobile-first_
  - [ ] 3.4 Write tests for chat components
    - Create `src/components/chat/__tests__/chat-widget.test.tsx`
    - Test FAB renders and toggles panel open/closed
    - Test sending a message appends it to the message list
    - Test quick-action chips trigger onSend with correct text
    - Test loading state disables input while API call is in flight
    - Mock `fetch` for the `/api/chat` call
    - _Refs: R-chat-ui, R-client-side-state_

- [ ] 4. Integration and Layout Wiring
  - [ ] 4.1 Add `ChatWidget` to demo layout
    - Edit `src/app/demo/layout.tsx`
    - Import `ChatWidget` from `@/components/chat/chat-widget`
    - Add `<ChatWidget />` as a sibling after `<BottomNav />` inside the max-width container
    - Ensure z-index layering: demo banner (z-40) < chat widget (z-50)
    - _Refs: R-layout-integration_
  - [ ] 4.2 End-to-end smoke test
    - Manually verify in demo mode: open dashboard, click chat FAB, send "show dashboard summary", confirm a response appears
    - Verify chat panel doesn't overlap or break bottom nav on mobile viewport (375px)
    - Verify chat closes cleanly and FAB reappears
    - Test with and without AWS creds to confirm demo fallback works
    - _Refs: R-demo-mode, R-mobile-first, R-layout-integration_
  - [ ] 4.3 Add system prompt tuning and conversation guardrails
    - Refine the system prompt in the chat route: include VyaparSahayak context, available tools summary, instruction to respond concisely, preference for Tamil/English mix when relevant
    - Add input length validation (max 500 chars per message, max 20 messages in history)
    - Add error handling UI: show "Something went wrong, try again" message on API failure
    - _Refs: R-agent-loop, R-chat-ui_

## Sequencing Rationale

Tasks are ordered bottom-up, starting from the data layer and ending at the UI integration:

1. **Agent tools first** (Task 1) because everything depends on them. The API route needs tools to execute, and the UI needs the API. Building tools first also lets us validate that existing cached queries and API logic can be reused without new DB tables.

2. **Chat API route second** (Task 2) because it is the bridge between tools and UI. The agentic loop (call Bedrock -> check for tool_use -> execute tool -> loop) is the core complexity of this feature. Getting this right with demo mode fallback means the UI work can proceed against a working endpoint.

3. **Chat UI components third** (Task 3) because they only depend on the API shape being defined (which Task 2 establishes). Messages, input, and widget are independent of each other within the task group, so subtasks 3.1-3.3 could be developed in parallel.

4. **Integration last** (Task 4) because it is just wiring. The layout edit is trivial once the widget exists. The smoke test and guardrails are final polish.

Tests are co-located with each implementation task so defects surface early and each layer is verified before building the next.

## Definition of Done

- [ ] Chat FAB visible on all `/demo/*` pages, opens a chat panel on tap
- [ ] User can type a message and receive an AI-generated response
- [ ] Agent loop executes at least 3 tools: `get_dashboard_summary`, `list_alerts`, `run_detection_scan`
- [ ] Tool results are incorporated into the assistant's natural language reply
- [ ] Demo mode works fully without AWS credentials -- canned responses for all tools and chat
- [ ] No new database tables created -- all data access goes through existing Prisma models and cached queries
- [ ] Chat panel is usable on 375px mobile viewport without overlapping bottom nav
- [ ] Conversation state resets on page refresh (client-side only, no persistence)
- [ ] All test files pass: agent-tools, chat route, chat widget
- [ ] Max 5 tool-use iterations enforced to prevent runaway agent loops
- [ ] Input validation: message length capped, conversation history capped
- [ ] Error states handled gracefully in UI (API failure, empty responses)
