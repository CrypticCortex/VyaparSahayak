## Feature Summary

An AI-powered chat interface embedded in the VyaparSahayak dashboard that lets distributors query their inventory, dead stock alerts, campaigns, and retailer network using natural language -- and execute actions (scan inventory, generate recommendations, switch posters, send campaigns) through conversational tool-use. Powered by AWS Bedrock Nova Lite with function-calling, falling back to mock responses when AWS credentials are absent. Chat state lives entirely in the browser; no new database tables.

## User Stories

- As a distributor, I want to ask "show me my dead stock" in the chat so that I get a summary without navigating to the alerts page.
- As a distributor, I want to type "scan my inventory" in the chat so that the system runs dead stock detection and reports results inline.
- As a distributor, I want to ask "what should I do about alert X?" so that the chatbot generates an AI recommendation and creates a campaign for that alert.
- As a distributor, I want to say "send campaign for [product]" so that the chatbot finds the matching draft campaign and sends it without me leaving the chat.
- As a distributor, I want to ask "how many retailers do I have in zone North?" so that I get network stats conversationally.
- As a distributor, I want to switch a campaign's poster by telling the chatbot "use the other poster for campaign X" so that it calls the select-poster endpoint.
- As a distributor, I want the chatbot to work on my phone so that I can manage operations on the go.
- As a distributor, I want the chatbot to work without AWS keys configured so that I can demo the product offline.

## Acceptance Criteria

### Chat UI

- WHEN the user taps the chat icon on any dashboard page THEN the system SHALL open a chat panel overlaying the current view.
- WHEN the chat panel is open on a viewport narrower than 640px THEN the system SHALL render the panel full-screen.
- WHEN the chat panel is open on a viewport 640px or wider THEN the system SHALL render the panel as a side drawer or floating window that does not obscure the full dashboard.
- WHEN the user submits a message THEN the system SHALL display it in the conversation thread within 100ms and show a typing indicator until the response arrives.
- WHEN the user closes and reopens the chat panel within the same browser session THEN the system SHALL preserve the conversation history.
- WHEN the user refreshes the page THEN the system SHALL start a new empty conversation (no persistence).

### Natural Language Understanding and Tool Use

- WHEN the user sends a message THEN the system SHALL send the conversation history plus a system prompt containing available tools to the Bedrock Nova Lite model using the Converse API with toolUse configuration.
- WHEN the model response contains a toolUse block THEN the system SHALL execute the corresponding API call server-side and return the tool result to the model for a follow-up response.
- WHEN the model response contains only text (no tool use) THEN the system SHALL display the text directly as the assistant reply.

### Tool: Scan Inventory

- WHEN the model invokes the `scan_inventory` tool THEN the system SHALL call POST /api/detect and return the summary (total items, at-risk count, high/medium breakdown, total dead stock value) to the model.
- WHEN the scan completes THEN the system SHALL display the results as a formatted summary card in the chat, not raw JSON.

### Tool: Get Dashboard Data

- WHEN the model invokes the `get_dashboard_data` tool THEN the system SHALL query cached distributor data (alerts, campaigns, zones, recommendations) and return it to the model.

### Tool: Get Alerts

- WHEN the model invokes the `get_alerts` tool THEN the system SHALL return open dead stock alerts sorted by score descending, including product names.

### Tool: Generate Recommendation

- WHEN the model invokes the `generate_recommendation` tool with an alert ID THEN the system SHALL call POST /api/recommend/[id] and return the recommendation summary and campaign ID to the model.
- IF the provided alert ID does not exist THEN the system SHALL return an error message to the model (not crash the chat).

### Tool: Select Poster

- WHEN the model invokes the `select_poster` tool with a campaign ID and poster URL THEN the system SHALL call POST /api/campaign/[id]/select-poster and confirm the switch.
- IF the campaign has no alternate poster THEN the system SHALL return a message saying no alternate is available.

### Tool: Send Campaign

- WHEN the model invokes the `send_campaign` tool with a campaign ID THEN the system SHALL call POST /api/campaign/send with that ID and confirm the send result.
- IF the campaign status is already "sent" THEN the system SHALL inform the user the campaign was already sent and not call the endpoint again.

### Tool: Get Network Info

- WHEN the model invokes the `get_network_info` tool THEN the system SHALL return zones with retailer counts and alert summaries per zone.

### Demo Mode

- IF the environment variable AWS_ACCESS_KEY_ID is unset or equals "your-key" THEN the system SHALL use mock responses that simulate realistic chatbot behavior without calling Bedrock.
- WHEN in demo mode THEN the system SHALL still execute tool calls against real API endpoints (detect, recommend, etc.) -- only the LLM text generation is mocked.

### Error Handling

- IF a tool call returns an HTTP error THEN the system SHALL display a user-friendly error message in the chat and allow the conversation to continue.
- IF the Bedrock API call fails (timeout, throttle, 5xx) THEN the system SHALL display "Something went wrong, please try again" and not break the conversation state.

## Edge Cases

- User sends an empty message or whitespace-only input -- reject client-side, do not call the API.
- User sends messages faster than the model can respond -- queue or debounce; never drop the in-flight request silently.
- Model returns malformed JSON in a tool-use block -- catch the parse error, return a fallback error to the model, continue the conversation.
- Model attempts to call a tool that does not exist -- ignore the unknown tool, return an error result to the model.
- Model enters an infinite tool-use loop (tool -> response -> tool -> ...) -- enforce a max of 5 tool-use rounds per user message.
- Alert ID referenced in chat no longer exists (was cleared by a new scan) -- return "alert not found" gracefully.
- Campaign send is requested but no campaigns exist yet -- inform the user to scan and generate recommendations first.
- Network request fails mid-stream (user goes offline) -- show a retry option on the failed message.
- Conversation grows beyond the model's context window (~32K tokens) -- truncate oldest messages, keeping the system prompt and last N turns.
- Concurrent users on different tabs -- each tab maintains its own independent chat state (no cross-tab sync needed).

## Out of Scope

- Chat history persistence (no database storage, no cross-session recall).
- Multi-turn memory beyond the current browser session.
- Voice input or speech-to-text.
- File/image uploads from the user into the chat.
- Streaming/token-by-token response rendering (full response returned at once is acceptable for v1).
- Multi-language chat input (v1 supports English input only; output may include Tamil per existing campaign generation).
- User authentication or role-based access within the chat.
- New database tables or schema changes.
- Custom fine-tuning or prompt management UI.
- Rate limiting or usage metering for Bedrock API calls.
