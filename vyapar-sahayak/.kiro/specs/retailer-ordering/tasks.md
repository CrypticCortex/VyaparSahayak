## Implementation Tasks

- [ ] 1. Token Generation and Campaign Integration
  - [ ] 1.1 Create token generator utility in `src/lib/order-token.ts`
    - Export `generateOrderToken()` that returns `"vyp_"` + 12 random lowercase alphanumeric chars using `crypto.randomBytes`
    - Keep it simple -- one function, no dependencies beyond Node crypto
    - _Refs: R-token-generation_
  - [ ] 1.2 Update `src/app/api/recommend/[id]/route.ts` to generate tokens on campaign creation
    - Import `generateOrderToken` from `@/lib/order-token`
    - After the `prisma.campaign.create` call, generate a token and update the campaign: `prisma.campaign.update({ where: { id: campaign.id }, data: { orderLink: token } })`
    - Alternatively, include `orderLink: generateOrderToken()` directly in the `campaign.create` data object
    - _Refs: R-token-generation, R-whatsapp-message-update_
  - [ ] 1.3 Append order link to WhatsApp message text
    - In the recommend route, after generating the WhatsApp message and token, append a line to the message: `"\n\nOrder now: /order/${token}"`
    - Save the updated message to the campaign record
    - _Refs: R-whatsapp-message-update_
  - [ ] 1.4 Update mock WhatsApp message in `src/lib/bedrock.ts`
    - In the `generateMockText` function, add an order link line to the mock WhatsApp message (e.g., `"\n\nOrder: /order/vyp_demo123abc"`)
    - This ensures demo mode campaigns also show the order link pattern
    - _Refs: R-whatsapp-message-update, R-demo-mode_

- [ ] 2. Order Info API Route
  - [ ] 2.1 Create `src/app/api/order/[token]/info/route.ts`
    - Export a GET handler that extracts `token` from the URL params
    - Query: `prisma.campaign.findFirst({ where: { orderLink: token } })` -- include the recommendation relation to get discountPct
    - If no campaign found, return `NextResponse.json({ error: "Campaign not found" }, { status: 404 })`
    - Look up the product: `prisma.product.findFirst({ where: { name: campaign.productName } })` (campaigns store productName, not productId)
    - Look up the distributor: `prisma.distributor.findUnique({ where: { id: campaign.distributorId } })`
    - Return JSON: `{ productName, posterUrl, offerHeadline, offerDetails, price: product.mrp, discountPct, distributorName, campaignId }`
    - _Refs: R-order-info-api_
  - [ ] 2.2 Handle edge cases in the info route
    - If campaign has no related product (productName mismatch), return 404 with "Product not found"
    - If posterUrl is null, still return 200 with posterUrl as null (the page handles it)
    - _Refs: R-order-info-api_

- [ ] 3. Order Creation API Route
  - [ ] 3.1 Create `src/app/api/order/route.ts`
    - Export a POST handler that parses the request body: `{ token, retailerPhone?, retailerName?, quantity, notes? }`
    - Validate: token is required (return 400 if missing), quantity must be a positive integer (return 400 if not)
    - Look up campaign by orderLink token: `prisma.campaign.findFirst({ where: { orderLink: token } })`
    - If no campaign, return 400 with "Invalid order link"
    - Look up the product by campaign.productName
    - If retailerPhone is provided, try to match: `prisma.retailer.findFirst({ where: { whatsappNumber: retailerPhone } })`
    - _Refs: R-order-creation-api_
  - [ ] 3.2 Create Order and OrderItem records
    - Generate order number: format `ORD-YYYYMMDD-NNN` where NNN is a zero-padded count of orders created today + 1
    - Count today's orders: `prisma.order.count({ where: { createdAt: { gte: startOfDay } } })`
    - Calculate pricing: `unitPrice = product.mrp * (1 - discountPct/100)`, `total = unitPrice * quantity`
    - Create Order: `{ token: generateOrderToken(), retailerId (optional), distributorId: campaign.distributorId, status: "pending", totalAmount: total, campaignId: campaign.id, zoneCode: retailer?.zone?.code || "UNKNOWN", notes }`
    - Create OrderItem: `{ orderId: order.id, productId: product.id, quantity, unitPrice, discount: discountPct, total }`
    - Return `{ orderId: order.id, orderNumber }`
    - _Refs: R-order-creation-api_

- [ ] 4. Order Page Layout and UI
  - [ ] 4.1 Create `src/app/order/layout.tsx`
    - Minimal layout: centered VyaparSahayak logo at top, white background, max-width container (480px), centered on larger screens
    - No sidebar, no bottom nav, no demo banner
    - Import the logo from existing assets or render a text logo matching the dashboard style
    - _Refs: R-public-order-page, R-mobile-first-design_
  - [ ] 4.2 Create `src/app/order/[token]/page.tsx`
    - Client component (`"use client"`)
    - On mount, fetch GET `/api/order/${token}/info`
    - Loading state: skeleton placeholder for poster and form
    - Error state (404): render "This order link is no longer valid" with a simple message
    - Success state: render the full order form
    - _Refs: R-public-order-page_
  - [ ] 4.3 Build the order form UI
    - Campaign poster: `<img>` full width with `onError` handler to hide if missing, rounded corners
    - Offer headline: large bold text below poster
    - Product name: medium text
    - Price display: original MRP with `line-through` style, discounted price in green bold (calculate as `mrp * (1 - discountPct/100)`)
    - Quantity stepper: flex row with minus button, quantity number, plus button; min 1, max 99; buttons are 44px tap targets
    - Phone number input: `<input type="tel">` with placeholder "Your WhatsApp number", full width
    - "Place Order" button: green bg (#22C55E), white text, full width, min height 48px, bold text, disabled + spinner during submission
    - _Refs: R-public-order-page, R-mobile-first-design_
  - [ ] 4.4 Handle form submission
    - On submit: disable button, show spinner, POST to `/api/order` with `{ token, retailerPhone, quantity }`
    - On success: redirect to `/order/${token}/confirmation?orderId=${orderId}&orderNumber=${orderNumber}`
    - On error: show red error banner below the button, re-enable the form
    - Debounce: disable button immediately on click to prevent double-tap
    - _Refs: R-order-creation-api, R-public-order-page_

- [ ] 5. Confirmation Page
  - [ ] 5.1 Create `src/app/order/[token]/confirmation/page.tsx`
    - Client component, reads `orderId` and `orderNumber` from URL search params
    - Display a success checkmark (use text "[OK]" or a simple CSS circle-check, no unicode symbols)
    - Order number in large bold text
    - Product + quantity summary (fetch from API or pass via search params)
    - Message: "Your distributor will confirm shortly"
    - Secondary text: "You will receive confirmation on WhatsApp"
    - No navigation links to the main app
    - _Refs: R-confirmation-page_

- [ ] 6. Testing and Verification
  - [ ] 6.1 Write unit tests for token generator
    - Create `src/lib/__tests__/order-token.test.ts`
    - Test format: starts with `vyp_`, total length 16, only lowercase alphanumeric after prefix
    - Test uniqueness: generate 100 tokens, all distinct
    - _Refs: R-token-generation_
  - [ ] 6.2 Write tests for order info API
    - Create `src/app/api/order/[token]/info/__tests__/route.test.ts`
    - Test valid token returns 200 with expected fields
    - Test invalid token returns 404
    - _Refs: R-order-info-api_
  - [ ] 6.3 Write tests for order creation API
    - Create `src/app/api/order/__tests__/route.test.ts`
    - Test valid submission creates Order + OrderItem, returns orderId + orderNumber
    - Test missing token returns 400
    - Test quantity <= 0 returns 400
    - Test invalid token returns 400
    - _Refs: R-order-creation-api_
  - [ ] 6.4 Manual smoke test
    - Seed DB, trigger recommendation for an alert, verify campaign gets orderLink token
    - Open /order/[token] on mobile viewport (375px), verify layout and form
    - Submit order, verify confirmation page and database records
    - Test invalid token URL, verify error page
    - _Refs: R-public-order-page, R-confirmation-page_

## Sequencing Rationale

Tasks are ordered from backend to frontend, with dependencies flowing forward:

1. **Token generation first** (Task 1) because the order info and order creation APIs both depend on campaigns having tokens. The recommend route modification is the origin point -- without tokens, there are no order links. Updating the WhatsApp message and mock text at the same time keeps the campaign creation flow complete.

2. **Order info API second** (Task 2) because the order page needs this endpoint to render. It is a read-only lookup with no complex logic -- just a campaign query with joins. Getting this working early means the frontend can develop against real data.

3. **Order creation API third** (Task 3) because the order page form submission depends on it. This is the most complex backend task (validation, pricing calculation, record creation, order number generation). It must be solid before the frontend wires up the submit flow.

4. **Order page layout and UI fourth** (Task 4) because it depends on both API routes being available. The layout is created first (shared across order and confirmation pages), then the order page itself. The form submission handler is the last subtask since it depends on the creation API.

5. **Confirmation page fifth** (Task 5) because it depends on the order creation flow being complete (it reads the order number from the redirect).

6. **Testing last** (Task 6) because tests validate the full stack. Unit tests for the token generator and APIs can run independently. The manual smoke test is the final end-to-end verification.

Tasks 2 and 3 could be developed in parallel since they are independent API routes. Tasks 4 and 5 (the two pages) could also be developed in parallel once the APIs exist.

## Definition of Done

- [ ] Campaign creation via /api/recommend/[id] generates a `vyp_` token and saves it to campaign.orderLink
- [ ] WhatsApp message text includes an order link with the token
- [ ] Mock WhatsApp message in bedrock.ts includes an order link placeholder
- [ ] GET /api/order/[token]/info returns campaign + product data for valid tokens and 404 for invalid ones
- [ ] POST /api/order creates Order + OrderItem records and returns an order number
- [ ] /order/[token] renders a mobile-first public order page with poster, price, quantity stepper, and submit button
- [ ] /order/[token]/confirmation renders the order number and confirmation message
- [ ] Order pages use a minimal layout (logo only, no demo dashboard chrome)
- [ ] Invalid tokens show a user-friendly error page, not a crash
- [ ] Submit button is disabled during submission to prevent double-tap
- [ ] All unit tests pass for token generator, order info API, and order creation API
- [ ] Manual smoke test confirms the full flow from campaign creation through order placement to confirmation
