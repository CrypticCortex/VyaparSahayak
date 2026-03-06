## Feature Summary

Add an AI-powered proactive suggestion system to VyaparSahayak that automatically analyzes distributor data across three categories -- order intelligence, stock rebalancing, and campaign performance -- and surfaces actionable suggestions as cards on the dashboard and order pages. Each suggestion includes a one-click action (send check-in, create batch, transfer stock, launch flash sale, send reminder, view campaign, confirm stock) and can be dismissed. Suggestions are generated via server-side analyzer functions that query the database for specific signals, stored as AgentSuggestion records, and integrated with the Strands agent so the chatbot can also surface them conversationally.

## User Stories

- As a distributor, I want to see a suggestion when a retailer hasn't ordered in longer than their usual frequency so that I can proactively check in before losing the account.
- As a distributor, I want to be alerted when multiple orders cluster in one zone so that I can batch them into a single dispatch and save on logistics.
- As a distributor, I want to know when an order is unusually large compared to a retailer's average so that I can confirm stock availability before committing.
- As a distributor, I want a warning when pending orders for a product exceed zone stock so that I can transfer inventory from another zone.
- As a distributor, I want to see when a product is idle in one zone but selling in another so that I can rebalance stock across zones.
- As a distributor, I want an alert when a product is approaching expiry with remaining stock so that I can push a flash sale before it becomes dead stock.
- As a distributor, I want to know when fulfilling today's orders will deplete zone stock so that I can restock proactively.
- As a distributor, I want a warning when I reorder a product that already has stock scattered across zones so that I can consolidate before buying more.
- As a distributor, I want to see campaign conversion metrics with an option to send reminders to non-responders so that I can maximize campaign ROI.
- As a distributor, I want to compare poster performance across campaigns so that I can use the better-performing creative going forward.
- As a distributor, I want to know when a zone had zero conversion from a campaign so that I can adjust the offer or product for that zone.
- As a distributor, I want to see when a campaign performs exceptionally well so that I can replicate the approach for similar products.
- As a distributor, I want to dismiss suggestions I don't find useful so that my dashboard stays focused on what matters.
- As a distributor, I want to ask the chatbot "any suggestions?" and get proactive recommendations without navigating to a specific page.

## Acceptance Criteria

### Suggestion Generation API

- WHEN POST /api/suggestions/generate is called THEN the system SHALL run all analyzer functions for order intelligence, stock rebalancing, and campaign performance categories.
- WHEN an analyzer detects an actionable signal THEN the system SHALL create an AgentSuggestion record with the appropriate type, title, description, actionType, actionPayload, and priority.
- WHEN POST /api/suggestions/generate completes THEN the system SHALL return all newly created suggestions in the response.
- WHEN the dashboard page loads THEN the system SHALL call GET /api/suggestions to fetch pending suggestions for the distributor.

### Order Intelligence Analyzers

- WHEN a retailer's last order date exceeds their average order frequency by more than 50% THEN the system SHALL generate a high-priority "check in" suggestion with actionType "send_checkin" and the retailer's ID and name in the payload.
- WHEN 3 or more pending orders exist from the same zone THEN the system SHALL generate a medium-priority "create dispatch batch" suggestion with actionType "create_batch" and the zone code in the payload.
- WHEN an order's total is 3x or more above the retailer's historical average THEN the system SHALL generate a high-priority "confirm stock" suggestion with actionType "confirm_stock" and the order ID in the payload.
- WHEN pending order quantities for a product exceed zone inventory THEN the system SHALL generate a high-priority "transfer stock" suggestion with actionType "transfer_stock" and the product ID, source zone, destination zone, and quantity in the payload.

### Stock Rebalancing Analyzers

- WHEN a product has zero sales in one zone for 14+ days but active sales in another zone THEN the system SHALL generate a medium-priority "move stock" suggestion with actionType "transfer_stock".
- WHEN a product expires within 30 days and has remaining inventory THEN the system SHALL generate a high-priority "flash sale" suggestion with actionType "flash_sale" and the product ID and zone code in the payload.
- WHEN fulfilling all pending orders would reduce zone stock below 20% of current level THEN the system SHALL generate a medium-priority "restock" suggestion with actionType "transfer_stock".
- WHEN a reorder is detected for a product that has existing stock across multiple zones THEN the system SHALL generate a low-priority "consolidate" suggestion with actionType "transfer_stock" (simulated).

### Campaign Performance Analyzers

- WHEN a sent campaign has received orders from some but not all targeted retailers THEN the system SHALL generate a medium-priority "send reminder" suggestion with actionType "send_reminder" and the campaign ID in the payload.
- WHEN an A/B poster test has sufficient data and one variant outperforms the other THEN the system SHALL generate a low-priority "use better poster" suggestion with actionType "view_campaign" (simulated).
- WHEN a zone has zero orders from a sent campaign THEN the system SHALL generate a medium-priority "adjust zone strategy" suggestion with actionType "flash_sale" for that zone.
- WHEN a campaign achieves the distributor's highest-ever conversion rate THEN the system SHALL generate a low-priority "replicate success" suggestion with actionType "view_campaign".

### Suggestion Lifecycle

- WHEN GET /api/suggestions is called THEN the system SHALL return pending suggestions ordered by priority (high first, then medium, then low) and creation date (newest first within same priority).
- WHEN PATCH /api/suggestions/[id] is called with status "dismissed" THEN the system SHALL update the suggestion status to dismissed and set actedAt to the current timestamp.
- WHEN PATCH /api/suggestions/[id] is called with status "acted" THEN the system SHALL update the suggestion status to acted and set actedAt to the current timestamp.
- WHEN a suggestion is older than 24 hours THEN the system SHALL exclude it from GET /api/suggestions results.

### Suggestion UI

- WHEN pending suggestions exist THEN the system SHALL display SuggestionCard components on the /demo and /demo/orders pages.
- WHEN a SuggestionCard is rendered THEN it SHALL display the title, description, an action button, and a dismiss (X) button.
- WHEN the user clicks the action button THEN the system SHALL execute the corresponding action (API call or page navigation) based on the actionType and actionPayload.
- WHEN the user clicks the dismiss button THEN the system SHALL call PATCH /api/suggestions/[id] with status "dismissed" and remove the card from view.
- WHEN there are more than 5 pending suggestions THEN the system SHALL display only the top 5 and show a "Show more" button to reveal the rest.

### Strands Agent Integration

- WHEN the generate_proactive_suggestions tool is invoked by the agent THEN the system SHALL call POST /api/suggestions/generate and return the results.
- WHEN the user asks "any suggestions?" or "what should I do?" in the chat THEN the agent SHALL invoke the suggestion generation tool and present actionable suggestions conversationally.

## Edge Cases

- No analyzable data exists (new distributor with no orders, no campaigns) -- return an empty suggestions array, do not create spurious suggestions.
- All suggestions for a distributor are dismissed or acted upon -- GET /api/suggestions returns an empty array, UI shows no cards.
- Duplicate suggestions for the same signal (e.g., same retailer inactive on consecutive generate calls) -- check for existing pending suggestion with matching type and actionPayload before creating a new one.
- Analyzer queries return partial data (e.g., retailer has only one order, cannot compute average frequency) -- skip that retailer, do not generate a suggestion with insufficient data.
- Zone inventory is zero for all zones of a product -- cannot suggest a transfer source, skip the transfer suggestion.
- Campaign has no targeted retailers (edge case in seed data) -- skip campaign performance analysis for that campaign.
- Concurrent generate calls -- use upsert or deduplication logic to avoid creating duplicate suggestions.
- ActionPayload JSON is malformed when read by the UI -- parse defensively with try/catch, show a generic "View details" fallback action.
- Suggestion references a retailer, order, or campaign that has since been deleted -- handle missing references gracefully in the UI by showing the suggestion text without a working action button.

## Out of Scope

- Real-time push notifications or WebSocket-based suggestion delivery.
- Machine learning model training for suggestion relevance ranking.
- User feedback loop (thumbs up/down) on suggestion quality.
- Suggestion frequency throttling or per-category limits beyond the 24-hour staleness rule.
- Multi-distributor suggestion isolation (demo is single-distributor).
- Reorder detection from external systems (the "consolidate before reorder" suggestion is simulated with seed data).
- A/B poster performance comparison from real data (simulated with seed data).
- Custom suggestion preferences or category opt-out settings.
