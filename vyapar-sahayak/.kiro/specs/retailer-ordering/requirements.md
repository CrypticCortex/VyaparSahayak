## Feature Summary

A public, no-auth order page that retailers reach by tapping a link in a WhatsApp campaign message. Campaign creation generates a URL-safe token (e.g., `vyp_abc123xyz`) and embeds it in the WhatsApp text as `/order/vyp_abc123xyz`. The retailer lands on a mobile-first page showing the campaign poster, offer details, and a simple order form. One tap submits the order, and a confirmation page displays the order number. No login required, no demo layout -- just the logo and the form.

## User Stories

- As a retailer, I want to tap an order link in a WhatsApp message so that I can place an order without calling the distributor or visiting a shop.
- As a retailer, I want to see the campaign poster, product name, and discounted price on the order page so that I know exactly what I am ordering.
- As a retailer, I want a simple quantity selector and one-tap "Place Order" button so that I can order quickly from my phone.
- As a retailer, I want a confirmation page with my order number so that I know my order was received.
- As a distributor, I want each campaign to include an order link in the WhatsApp message so that retailers can order directly from the promotion.
- As a distributor, I want orders linked back to the originating campaign so that I can measure which promotions drive purchases.
- As a developer, I want the order token generated automatically during campaign creation so that no manual step is needed to enable ordering.

## Acceptance Criteria

### Token Generation

- WHEN a campaign is created via POST /api/recommend/[id] THEN the system SHALL generate a token in the format `vyp_` followed by 12 random alphanumeric characters and save it to the campaign's `orderLink` field.
- WHEN the token is generated THEN the system SHALL verify uniqueness against existing campaigns before saving.

### WhatsApp Message Update

- WHEN the WhatsApp message is generated for a campaign THEN the system SHALL append an order link line (e.g., "Order now: /order/vyp_abc123xyz") to the message text.
- WHEN in demo mode THEN the order link SHALL use a relative path or localhost URL, not a production domain.

### Order Info API

- WHEN a GET request is made to /api/order/[token]/info with a valid token THEN the system SHALL return JSON containing productName, posterUrl, offerHeadline, offerDetails, price, discountPct, and distributorName.
- WHEN a GET request is made to /api/order/[token]/info with an invalid or expired token THEN the system SHALL return HTTP 404 with an error message.

### Public Order Page

- WHEN a retailer navigates to /order/[token] THEN the system SHALL render a public page with no authentication requirement and no demo dashboard layout.
- WHEN the order page loads THEN it SHALL display: the campaign poster image (full width), the offer headline, the product name, the original price crossed out, and the discounted price highlighted.
- WHEN the order page loads THEN it SHALL show a quantity selector (stepper with +/- buttons) defaulting to 1 case.
- WHEN the order page loads THEN it SHALL show a phone number input field for retailer identification.
- WHEN the retailer taps "Place Order" THEN the system SHALL submit the order via POST /api/order with the token, phone number, and quantity.

### Order Creation API

- WHEN a POST request is made to /api/order with a valid token, retailer phone, and quantity THEN the system SHALL look up the campaign from the token, create an Order record with status "pending", create an OrderItem record with the product and quantity, and return the orderId and orderNumber.
- WHEN the token in the POST body is invalid or missing THEN the system SHALL return HTTP 400 with an error message.
- WHEN the quantity is zero or negative THEN the system SHALL return HTTP 400 with a validation error.

### Confirmation Page

- WHEN an order is successfully placed THEN the system SHALL redirect to /order/[token]/confirmation with the order number.
- WHEN the confirmation page loads THEN it SHALL display the order number prominently, a product and quantity summary, and the message "Your distributor will confirm shortly."
- WHEN the confirmation page loads THEN it SHALL NOT show any navigation back to the demo dashboard.

### Mobile-First Design

- WHEN the order page is viewed on a viewport narrower than 640px THEN the system SHALL render the poster full-width, the form fields stacked vertically, and the "Place Order" button full-width with a minimum height of 48px.
- WHEN the order page is viewed on a wider viewport THEN the system SHALL center the content in a max-width container (480px) for readability.

## Edge Cases

- Token does not match any campaign -- show a "This link is no longer valid" error page instead of a blank screen.
- Campaign exists but has no poster image -- render the order page without the poster section; the form still works.
- Retailer enters a phone number not in the database -- still accept the order; create it without a retailer association (the distributor can reconcile later).
- Retailer submits the same order twice (double-tap) -- debounce the submit button client-side; the API should still create a second order if called twice (idempotency is out of scope for v1).
- Token contains special characters in the URL -- tokens are alphanumeric with a `vyp_` prefix, so URL encoding is not needed, but the page should handle encoded input gracefully.
- Campaign was already sent days ago and the product is out of stock -- the order page has no stock check; the distributor handles fulfillment manually.
- Network failure during order submission -- show a clear error message and allow the retailer to retry.

## Out of Scope

- Retailer authentication or login.
- Real-time stock availability checks on the order page.
- Payment processing or online payment collection.
- Order status tracking or status update pages for retailers.
- Push notifications or real-time WhatsApp confirmation messages back to the retailer.
- Multi-product orders (each campaign link is for a single product).
- Order editing or cancellation by the retailer after submission.
- Rate limiting or abuse prevention on the public order endpoint.
- Analytics or conversion tracking on the order page.
