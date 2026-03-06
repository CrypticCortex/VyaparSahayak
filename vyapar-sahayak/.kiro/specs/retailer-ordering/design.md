## Overview

The retailer ordering feature adds a public-facing order flow outside the demo dashboard. A token-based URL scheme connects WhatsApp campaign messages to a minimal order page. Campaign creation in the recommend API is extended to generate tokens. Two new Next.js pages (`/order/[token]` and `/order/[token]/confirmation`) render the order form and confirmation. Two new API routes handle fetching campaign info by token and creating orders. The WhatsApp message generation is updated to include the order link. All new pages use a standalone minimal layout (logo only, no sidebar or bottom nav).

## Architecture

```
WhatsApp Message
  |
  | "Order now: /order/vyp_abc123xyz"
  |
  v
+--------------------------------------------------+
|  /order/[token]  (Next.js page, public)          |
|  - Calls GET /api/order/[token]/info on load     |
|  - Renders poster, offer details, order form     |
|  - Submits POST /api/order                       |
|  - Redirects to /order/[token]/confirmation      |
+--------------------------------------------------+
        |                       |
        v                       v
+--------------------+  +------------------------+
| GET /api/order/    |  | POST /api/order        |
|   [token]/info     |  |                        |
| Looks up Campaign  |  | Validates token        |
| by orderLink field |  | Creates Order +        |
| Returns product +  |  |   OrderItem records    |
| offer details      |  | Returns orderId +      |
+--------------------+  |   orderNumber          |
                        +------------------------+
                                |
                                v
                        +----------------+
                        | Prisma (SQLite)|
                        | Campaign       |
                        | Order          |
                        | OrderItem      |
                        | Product        |
                        +----------------+
```

Token generation happens at campaign creation time:

```
POST /api/recommend/[id]
  |
  +-- generates recommendation, poster, WhatsApp message (existing)
  +-- generates token: "vyp_" + 12 alphanumeric chars (new)
  +-- saves token to campaign.orderLink (new)
  +-- appends order link to whatsappMessage (new)
```

## Components and Interfaces

### 1. Token Generator Utility

**File:** `src/lib/order-token.ts`

**Responsibility:** Generates URL-safe order tokens. Exports a `generateOrderToken()` function that returns a string in the format `vyp_` + 12 random alphanumeric characters (lowercase letters and digits). Uses `crypto.randomBytes` for randomness.

**Interface:**
```typescript
export function generateOrderToken(): string
// Returns e.g. "vyp_a1b2c3d4e5f6"
```

### 2. Order Info API Route

**File:** `src/app/api/order/[token]/info/route.ts`

**Responsibility:** Looks up a campaign by its `orderLink` field, joins the related product and distributor data, and returns the information needed to render the order page.

**Input:** URL parameter `token` (string).

**Output (200):**
```typescript
{
  productName: string
  posterUrl: string | null
  offerHeadline: string
  offerDetails: string    // JSON string with headline, subline, offerText
  price: number           // product MRP
  discountPct: number     // from recommendation
  distributorName: string
  campaignId: string
}
```

**Output (404):** `{ error: "Campaign not found" }` when no campaign matches the token.

### 3. Order Creation API Route

**File:** `src/app/api/order/route.ts`

**Responsibility:** Validates the incoming order request, looks up the campaign by token, resolves the product and pricing, creates Order and OrderItem records in the database, and returns the order ID and a human-readable order number.

**Input (POST body):**
```typescript
{
  token: string
  retailerPhone?: string
  retailerName?: string
  quantity: number
  notes?: string
}
```

**Output (200):**
```typescript
{
  orderId: string
  orderNumber: string   // e.g. "ORD-20260306-001"
}
```

**Output (400):** `{ error: "..." }` for invalid token, missing quantity, or quantity <= 0.

**Order number generation:** Format is `ORD-YYYYMMDD-NNN` where NNN is a zero-padded sequential count of orders created today.

### 4. Public Order Page

**File:** `src/app/order/[token]/page.tsx`

**Responsibility:** The public-facing order form. Fetches campaign info from the API on load, renders the poster image, offer details, price display, quantity stepper, phone input, and submit button. No auth, no demo layout.

**Layout:** Uses `src/app/order/layout.tsx` -- a minimal layout with just the VyaparSahayak logo centered at the top, white background, no sidebar or nav.

**Key UI elements:**
- Campaign poster image at top (full width, max 480px centered)
- Offer headline below poster (large text)
- Product name (medium text)
- Price display: original MRP with strikethrough, discounted price in green/bold
- Quantity stepper: minus button, number display, plus button (min 1, max 99)
- Phone number input (tel type, for retailer identification)
- "Place Order" button: green (#22C55E), full width, large (min 48px height), disabled during submission
- Loading state: spinner on button, form fields disabled
- Error state: red banner below the form

### 5. Confirmation Page

**File:** `src/app/order/[token]/confirmation/page.tsx`

**Responsibility:** Displays order confirmation after successful submission. Shows the order number, product name, quantity, and a message that the distributor will confirm.

**Key UI elements:**
- Success icon (checkmark, ASCII-safe)
- Order number in large bold text
- Product name + quantity summary
- "Your distributor will confirm shortly" message
- No navigation links back to the main app

### 6. Order Layout

**File:** `src/app/order/layout.tsx`

**Responsibility:** Minimal layout wrapper for all `/order/*` pages. Contains only the VyaparSahayak logo centered at the top and a clean white background. No sidebar, no bottom nav, no demo banner.

### 7. Recommend Route Modifications

**File:** `src/app/api/recommend/[id]/route.ts`

**Responsibility (changes only):**
- Import `generateOrderToken` from `src/lib/order-token.ts`
- After creating the Campaign record, generate a token and update the campaign's `orderLink` field
- Append the order link to the `whatsappMessage` before saving the campaign

### 8. WhatsApp Message Enhancement

**File:** `src/lib/bedrock.ts`

**Responsibility (changes only):**
- Update the mock WhatsApp message in `generateMockText` to include an order link placeholder line
- The real WhatsApp prompt in the recommend route already gets the order link appended after generation, so no change needed in the prompt itself

## Data Models

The Order, OrderItem, and Campaign.orderLink models are defined in the data-model-expansion spec. This feature consumes those models -- no new schema changes are introduced here. The key models used:

- **Campaign.orderLink** (String, optional): stores the `vyp_` token for this campaign
- **Order**: created when a retailer submits the form; linked to campaign via campaignId
- **OrderItem**: one item per order (single-product orders from campaign links)

Refer to the `data-model-expansion` spec for the full schema definitions.

## Key Decisions

### Decision: Standalone layout, not under /demo

- **Context:** The order page is opened by retailers from WhatsApp. They should not see the distributor's demo dashboard, sidebar, or bottom nav.
- **Options:** (a) Nest under `/demo/order/` and conditionally hide nav; (b) Create pages under `/order/` with their own minimal layout.
- **Choice:** Separate `/order/` route group with its own layout. Clean separation -- retailers never touch the demo layout. The layout is just a logo and white background.

### Decision: Token in URL path, not query parameter

- **Context:** The order link needs to be clean and WhatsApp-friendly.
- **Options:** (a) `/order?token=vyp_abc123`; (b) `/order/vyp_abc123`.
- **Choice:** Path parameter. Cleaner URLs, better for WhatsApp link previews, and Next.js dynamic routes handle it natively with `[token]`.

### Decision: Phone number for retailer identification, not login

- **Context:** Retailers do not have accounts in the system. We need some way to associate orders with retailers.
- **Options:** (a) Require retailer login; (b) Ask for phone number and match against DB; (c) No identification at all.
- **Choice:** Phone number input. If the number matches a retailer in the database, the order is linked. If not, the order is created without a retailer association -- the distributor reconciles manually. This keeps the flow frictionless.

### Decision: Order number format ORD-YYYYMMDD-NNN

- **Context:** Orders need a human-readable identifier for the confirmation page and WhatsApp follow-ups.
- **Options:** (a) Use the cuid directly; (b) Sequential number; (c) Date-prefixed sequential.
- **Choice:** `ORD-YYYYMMDD-NNN`. Readable, sortable by date, and the daily counter keeps numbers short. The cuid remains the primary key internally.

### Decision: Client-side redirect to confirmation page

- **Context:** After order submission, the retailer needs to see confirmation.
- **Options:** (a) Show confirmation inline on the same page; (b) Redirect to a separate confirmation page.
- **Choice:** Redirect to `/order/[token]/confirmation?orderId=...`. Prevents duplicate submissions on page refresh (POST-redirect-GET pattern). The confirmation page fetches order details from a query parameter.

## Error Handling

### Invalid token on page load

The order page calls GET /api/order/[token]/info. If it returns 404, the page renders a friendly "This order link is no longer valid" message instead of the form. No crash, no blank screen.

### Order submission failure

If POST /api/order returns an error (400 or 500), the form shows a red error banner below the submit button with the error message. The form remains enabled so the retailer can fix input and retry.

### Network failure

If the fetch call itself fails (offline, timeout), the page catches the error and shows "Could not connect. Please check your internet and try again." The submit button re-enables for retry.

### Double submission

The "Place Order" button is disabled immediately on tap and shows a spinner. Re-enabling only happens on error. This prevents accidental double-taps. Server-side, duplicate orders are accepted (no idempotency key in v1) -- the distributor handles deduplication manually if needed.

### Missing poster image

If `posterUrl` is null or the image fails to load, the order page skips the poster section and shows just the offer headline and form. The `<img>` tag uses an `onError` handler to hide itself gracefully.

## Testing Strategy

### Unit tests -- token generator

- Verify token format: starts with `vyp_`, followed by exactly 12 alphanumeric characters.
- Generate 100 tokens, verify all are unique.
- Verify tokens contain only lowercase letters and digits (URL-safe).

### Unit tests -- order info API

- Valid token returns 200 with correct shape (productName, posterUrl, etc.).
- Invalid token returns 404.
- Campaign with no poster returns posterUrl as null (not an error).

### Unit tests -- order creation API

- Valid request creates Order + OrderItem records and returns orderId + orderNumber.
- Missing token returns 400.
- Quantity of 0 or negative returns 400.
- Invalid token returns 400.
- Phone number matching: order links to retailer when phone matches, creates unlinked order when phone does not match.

### Component tests -- order page

- Renders poster, product name, price, and form when API returns data.
- Shows error state when API returns 404.
- Quantity stepper increments and decrements correctly (min 1).
- Submit button disables during submission.
- Redirects to confirmation page on success.

### Manual smoke test

1. Seed the database, generate a recommendation for an alert -- verify campaign gets an orderLink token.
2. Open `/order/[token]` in a mobile viewport (375px) -- verify poster, form, and button render correctly.
3. Submit an order -- verify redirect to confirmation page with order number.
4. Check database -- verify Order and OrderItem records exist with correct data.
5. Open an invalid token URL -- verify error page renders.
