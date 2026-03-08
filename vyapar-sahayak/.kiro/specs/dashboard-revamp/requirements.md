## Feature Summary

Revamp the VyaparSahayak demo dashboard from a dark-themed, 480px-capped mobile-only layout to a light-mode (white + saffron #FF9933) responsive design that matches the landing page. The dashboard gets a collapsible sidebar on desktop (240px expanded, 64px collapsed), bottom nav on mobile, a top bar with search and notifications, a 4-card metrics row, a sortable inventory data table as the centerpiece, a larger trend chart, and restyled AI insight / suggestion widgets. All sub-pages (alerts, campaigns, network, orders, batches) receive the same light-theme reskin.

## User Stories

- As a distributor, I want the dashboard to match the landing page's light saffron theme so that the product feels cohesive and professional.
- As a distributor, I want to use the dashboard on my laptop with a sidebar so that I can navigate quickly between sections without the bottom nav.
- As a distributor, I want the sidebar to collapse to icons when I need more screen space for data.
- As a distributor, I want a top bar with search and notifications so that I can find things fast and stay informed.
- As a distributor, I want a metrics row showing dead stock count, recovered value, active campaigns, and pending orders so that I get an instant snapshot without scrolling.
- As a distributor, I want a sortable inventory data table as the main view so that I can scan all products, sort by risk, and take action without navigating away.
- As a distributor, I want the trend chart to be larger and more prominent so that I can read sales trends at a glance.
- As a distributor, I want AI insights and suggestion cards styled with a light theme so that they are readable and consistent with the rest of the dashboard.
- As a distributor, I want all sub-pages (alerts, campaigns, network, orders, batches) to use the same light theme so there are no jarring transitions.
- As a distributor, I want the layout to work on any screen size -- phone, tablet, or desktop -- without a fixed width cap.

## Acceptance Criteria

### Theme and Tokens

- WHEN the dashboard renders THEN the background SHALL be #F9FAFB with white (#FFFFFF) card surfaces using shadow-sm and border-gray-200.
- WHEN the dashboard renders THEN the primary accent color SHALL be saffron #FF9933, used for active nav items, chart gradients, and highlights.
- WHEN text is rendered THEN primary text SHALL be #111827 and secondary text SHALL be #6B7280.
- WHEN status indicators are rendered THEN they SHALL use Red #EF4444, Green #10B981, Blue #3B82F6, and Amber #F59E0B.

### Sidebar Navigation (Desktop)

- WHEN the viewport is >= 768px THEN the system SHALL render a collapsible sidebar instead of the bottom nav.
- WHEN the sidebar is expanded THEN it SHALL be 240px wide with icon + label for each nav item.
- WHEN the sidebar is collapsed THEN it SHALL be 64px wide with icons only.
- WHEN the user clicks the collapse toggle THEN the sidebar SHALL animate between expanded and collapsed states.
- WHEN a nav item is active THEN it SHALL have a saffron (#FF9933) left border accent and saffron-tinted background.
- WHEN the sidebar renders THEN it SHALL contain 5 nav items: Dashboard, Alerts, Orders, Campaigns, Network.

### Top Bar

- WHEN the dashboard renders THEN a top bar SHALL appear with the current page title, a search input, a notification bell icon, and a user avatar.
- WHEN the sidebar is expanded THEN the top bar SHALL be offset by the sidebar width.
- WHEN the sidebar is collapsed THEN the top bar SHALL adjust its left offset accordingly.

### Metrics Row

- WHEN the main dashboard (/demo) renders THEN it SHALL display a 4-card metrics row replacing the old hero-cards and quick-actions.
- WHEN the metrics row renders THEN the 4 cards SHALL be: Dead Stock Items (count + value), Recovered Value (amount + percentage), Active Campaigns (count + reach), Pending Orders (count + value).
- WHEN displayed on mobile THEN the metrics row SHALL stack into a 2x2 grid.
- WHEN displayed on desktop THEN the metrics row SHALL be a single horizontal row of 4 cards.

### Inventory Data Table

- WHEN the main dashboard renders THEN the centerpiece SHALL be a sortable inventory data table showing products with columns: Product, Category, Stock, Sales Velocity, Risk Score, Status, Actions.
- WHEN the user clicks a column header THEN the table SHALL sort by that column.
- WHEN a product has a risk score THEN the system SHALL display a color-coded risk badge (high=red, medium=amber, low=green).
- WHEN a product row has actions THEN the system SHALL show action buttons (e.g., View, Create Campaign).

### Trend Chart

- WHEN the main dashboard renders THEN the trend chart SHALL span the full main content width (not constrained to a small card).
- WHEN the trend chart renders THEN it SHALL use a saffron (#FF9933) gradient fill with the existing Recharts setup.

### AI Insight Widget

- WHEN the AI insight widget renders THEN it SHALL have a white background, saffron (#FF9933) top border, and a sparkle icon.
- WHEN the widget displays text THEN the text SHALL use the light theme colors (#111827 primary, #6B7280 secondary).

### Suggestion Cards

- WHEN suggestion cards render THEN they SHALL use white card backgrounds with shadow-sm and light-theme text colors.
- WHEN the priority indicator renders THEN it SHALL use: high=red #EF4444, medium=amber #F59E0B, low=gray #6B7280.

### Demo Layout

- WHEN the demo layout renders THEN the background SHALL be #F9FAFB.
- WHEN the viewport is >= 768px THEN the layout SHALL use the sidebar for navigation.
- WHEN the viewport is < 768px THEN the layout SHALL use the bottom nav.
- WHEN the layout renders THEN there SHALL be no max-width cap (removing the old max-w-md / 480px constraint).

### Bottom Nav (Mobile)

- WHEN the viewport is < 768px THEN the bottom nav SHALL render with a white background, light borders, and saffron active indicator.
- WHEN the viewport is >= 768px THEN the bottom nav SHALL be hidden.

### Sub-Page Reskin

- WHEN any sub-page (alerts, campaigns, network, orders, batches) renders THEN it SHALL use the light theme tokens (#F9FAFB background, white cards, saffron accents, light text colors).
- WHEN sub-pages contain dark-themed components THEN those components SHALL be updated to the light theme.

## Edge Cases

- User has system dark mode preference -- dashboard stays light mode (explicit design choice for this revamp).
- Sidebar state should persist across page navigations (store in localStorage or React context).
- On tablet (768px-1024px), the sidebar should start collapsed to give more content space.
- When sidebar transitions between states, main content should not jump -- use CSS transitions on margin/padding.
- Data table with zero products -- show empty state message, not a blank table.
- Metrics cards with zero values -- display "0" or "Rs.0", not blank or loading states.
- Notification bell with no notifications -- show the bell without a badge, not a "0" badge.

## Out of Scope

- Dark mode toggle or dark mode support (this revamp is explicitly light-only).
- Sidebar nav item reordering or customization.
- Search functionality implementation (the search input is a visual placeholder for now).
- Notification system backend (the bell is a UI placeholder).
- Data table pagination or virtual scrolling (demo dataset is small enough).
- User avatar dropdown menu or profile page.
- Keyboard shortcuts for sidebar collapse.
