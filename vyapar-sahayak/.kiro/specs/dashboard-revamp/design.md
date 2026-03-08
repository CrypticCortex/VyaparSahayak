## Overview

The dashboard revamp replaces the dark-themed, 480px-capped mobile layout with a responsive light-mode design using white + saffron (#FF9933) that matches the landing page. The layout switches from bottom-nav-only to a collapsible sidebar on desktop (>= 768px) with bottom nav retained for mobile. The main dashboard page gets a complete restructure: a top bar, 4-card metrics row, sortable inventory data table as the centerpiece, larger trend chart, and restyled AI insight / suggestion widgets. All existing sub-pages receive a light-theme reskin using shared design tokens.

## Architecture

```
+--------------------------------------------------------------------+
|  Browser (React 19)                                                |
|                                                                    |
|  DemoLayout (src/app/demo/layout.tsx)                              |
|    +-- Sidebar (desktop >= 768px, collapsible 240px / 64px)        |
|    +-- TopBar (page title, search, bell, avatar)                   |
|    +-- BottomNav (mobile < 768px, light theme)                     |
|    +-- ChatWidget (unchanged, z-40)                                |
|    +-- <children> (main content area)                              |
|                                                                    |
|  /demo (DashboardPage - server)                                    |
|    +-- MetricsRow (4 cards: dead stock, recovered, campaigns,      |
|    |               orders)                                         |
|    +-- InventoryDataTable (sortable, risk badges, actions)         |
|    +-- TrendChart (full-width, saffron gradient)                   |
|    +-- AIInsightWidget (saffron top border, sparkle icon)          |
|    +-- SuggestionList > SuggestionCard[] (light theme)             |
|                                                                    |
|  /demo/alerts, /demo/campaigns, /demo/network,                    |
|  /demo/orders, /demo/orders/batches                                |
|    +-- (existing components, reskinned to light theme)             |
+--------------------------------------------------------------------+
```

## Design Tokens

All components share these tokens, defined as Tailwind classes / CSS variables:

| Token | Value | Usage |
|-------|-------|-------|
| Background | #F9FAFB (gray-50) | Page background, layout bg |
| Card surface | #FFFFFF (white) | All card backgrounds |
| Card border | border-gray-200 | Card borders |
| Card shadow | shadow-sm | Card elevation |
| Accent | #FF9933 | Active nav, chart gradient, highlights |
| Text primary | #111827 (gray-900) | Headings, body text |
| Text secondary | #6B7280 (gray-500) | Labels, descriptions |
| Status red | #EF4444 (red-500) | High risk, errors |
| Status green | #10B981 (emerald-500) | Low risk, success, delivered |
| Status blue | #3B82F6 (blue-500) | Info, confirmed |
| Status amber | #F59E0B (amber-500) | Medium risk, pending |

## Components and Interfaces

### 1. Sidebar (new client component)

**File:** `src/components/dashboard/sidebar.tsx`

**Responsibility:** Collapsible sidebar navigation for desktop viewports. Renders 5 nav items with icons and labels. Collapsed state shows icons only. Active item highlighted with saffron accent.

**Props:**
- `collapsed: boolean`
- `onToggle: () => void`

**Key behaviors:**
- 240px expanded, 64px collapsed
- CSS transition on width change
- Active route detection via `usePathname()`
- 5 items: Dashboard (/demo), Alerts (/demo/alerts), Orders (/demo/orders), Campaigns (/demo/campaigns), Network (/demo/network)
- Active item: saffron left border (border-l-3 border-[#FF9933]), saffron-tinted background (bg-orange-50)
- Collapse toggle button at the bottom
- Hidden below 768px (md: breakpoint)

### 2. TopBar (new client component)

**File:** `src/components/dashboard/top-bar.tsx`

**Responsibility:** Horizontal bar at the top of the main content area. Shows page title (derived from route), search input (placeholder), notification bell, and user avatar.

**Props:**
- `sidebarCollapsed: boolean`

**Key behaviors:**
- Sticky at top of content area
- Left offset adjusts based on sidebar state (ml-60 expanded, ml-16 collapsed, ml-0 on mobile)
- Page title derived from pathname mapping
- Search input is visual placeholder (no backend)
- Bell icon with optional red dot badge
- Avatar circle with initials

### 3. MetricsRow (new server component)

**File:** `src/components/dashboard/metrics-row.tsx`

**Responsibility:** Replaces the old hero-cards + quick-actions with a row of 4 metric cards. Each card shows a label, primary value, and secondary context (trend or sub-metric).

**Data:**
- Dead Stock Items: count of high/medium risk items, total value at risk
- Recovered Value: Rs. amount recovered, percentage of total dead stock
- Active Campaigns: campaign count, total retailer reach
- Pending Orders: order count, total order value

**Layout:**
- Desktop: `grid grid-cols-4 gap-4`
- Mobile: `grid grid-cols-2 gap-3`

### 4. InventoryDataTable (new client component)

**File:** `src/components/dashboard/inventory-table.tsx`

**Responsibility:** Sortable data table displaying all products with risk scores, stock levels, and action buttons. This is the main centerpiece of the revamped dashboard.

**Columns:**
- Product (name + thumbnail)
- Category
- Stock (quantity)
- Sales Velocity (units/month)
- Risk Score (0-100 with color-coded badge)
- Status (risk level badge)
- Actions (View, Create Campaign buttons)

**Key behaviors:**
- Click column header to sort ascending/descending
- Risk badge colors: high (>= 70) = red, medium (40-69) = amber, low (< 40) = green
- Responsive: on mobile, less important columns hidden, card layout option
- Built with HTML table + Tailwind, not a heavy table library

### 5. TrendChart (rewrite)

**File:** `src/components/dashboard/trend-chart.tsx`

**Responsibility:** Existing trend chart, restyled to span full main content width with saffron gradient fill instead of the old dark-theme colors.

**Changes from current:**
- Remove fixed small-card sizing, make full-width
- Change line/area color to #FF9933
- Gradient fill from #FF9933 (opacity 0.3) to transparent
- White background card with shadow-sm
- Light-theme axis labels (#6B7280)

### 6. AIInsightWidget (rewrite)

**File:** `src/components/dashboard/ai-insight.tsx`

**Responsibility:** Existing AI insight widget, restyled with light theme. White card, saffron top border, sparkle icon replacing any dark-theme icon.

**Changes from current:**
- White background, shadow-sm, border-gray-200
- Top border: `border-t-3 border-[#FF9933]`
- Sparkle icon (from lucide-react) in saffron color
- Text: #111827 primary, #6B7280 secondary

### 7. SuggestionCard (rewrite)

**File:** `src/components/dashboard/suggestion-card.tsx`

**Responsibility:** Existing suggestion cards, restyled for light theme. White cards with shadow-sm instead of dark glassmorphic style.

**Changes from current:**
- White background, shadow-sm, border-gray-200
- Priority dot: high=#EF4444, medium=#F59E0B, low=#6B7280
- Text: #111827 primary, #6B7280 secondary
- "Do it" button: saffron background or outline style
- Dismiss button: gray-400 X icon

### 8. DemoLayout (update)

**File:** `src/app/demo/layout.tsx`

**Responsibility:** Updated to use the new layout structure with sidebar (desktop) and bottom nav (mobile). Manages sidebar collapsed state.

**Changes from current:**
- Remove `max-w-md` / 480px width cap
- Add Sidebar component (desktop)
- Add TopBar component
- Background: bg-gray-50 (#F9FAFB)
- Main content area: responsive margin based on sidebar state
- Sidebar collapsed state stored in React context or local state with localStorage persistence

### 9. BottomNav (update)

**File:** `src/components/dashboard/bottom-nav.tsx`

**Responsibility:** Existing bottom nav, restyled for light theme and hidden on desktop.

**Changes from current:**
- White background, border-t border-gray-200
- Active item: saffron (#FF9933) icon + label color
- Inactive: #6B7280
- Add `md:hidden` to hide on desktop (sidebar takes over)

### 10. Sub-Page Reskin (updates)

**Files:** `src/app/demo/alerts/`, `src/app/demo/campaigns/`, `src/app/demo/network/`, `src/app/demo/orders/`, `src/app/demo/orders/batches/`

**Responsibility:** Update all sub-page components to use light theme tokens. This is primarily a CSS/class change pass -- replacing dark backgrounds with white cards, dark text with #111827/#6B7280, and any accent colors with saffron where appropriate.

## Key Decisions

### Decision: Light-only, no dark mode toggle

- **Context:** The current dashboard is dark-themed. The landing page is light with saffron accents.
- **Options:** (a) Add a dark/light toggle; (b) Go light-only to match landing page.
- **Choice:** Light-only. The hackathon demo needs a cohesive look. Supporting both themes doubles the CSS work for no demo value. The saffron brand identity works best on light backgrounds.

### Decision: Collapsible sidebar over persistent sidebar

- **Context:** Desktop users need efficient navigation. A permanent 240px sidebar wastes space on medium screens.
- **Options:** (a) Fixed 240px sidebar; (b) Collapsible to 64px icons; (c) Hamburger-hidden sidebar.
- **Choice:** Collapsible. Icons-only mode keeps navigation accessible while freeing horizontal space. The collapse state persists via localStorage so it remembers the user's preference.

### Decision: Remove max-width cap, go fully responsive

- **Context:** Current layout has `max-w-md` (448px) constraining everything to a phone-width column even on desktop.
- **Options:** (a) Keep the cap; (b) Remove it and use responsive grid.
- **Choice:** Remove it. The data table and trend chart need width. On desktop, content fills the available space between sidebar and page edge. On mobile, content is full-width with appropriate padding.

### Decision: Data table as centerpiece over card-based product list

- **Context:** The current dashboard uses cards for products. Cards are good for a few items but don't scale for scanning 50+ products.
- **Options:** (a) Keep card layout; (b) Sortable data table.
- **Choice:** Data table. Distributors managing 50-200 products need to scan, sort, and compare quickly. A table with sortable columns is the standard pattern for this. Risk badges and inline action buttons keep it actionable.

### Decision: Metrics row replaces hero-cards + quick-actions

- **Context:** Current dashboard has hero-cards (large, visual) and separate quick-actions. The new design consolidates these.
- **Options:** (a) Keep both sections; (b) Merge into a single metrics row.
- **Choice:** Merge. The 4-card metrics row gives the same information (dead stock, recovered value, campaigns, orders) in a denser, more scannable format. Quick action links move into the data table and sidebar.

## Error Handling

### Sidebar state persistence

If localStorage is unavailable, default to expanded on desktop. Wrap localStorage reads in try/catch.

### Responsive breakpoint edge cases

Use Tailwind responsive prefixes consistently. The sidebar uses `hidden md:flex` and bottom nav uses `md:hidden`. No JavaScript viewport detection needed.

### Data table empty state

When no products exist, render a centered empty state message inside the table container instead of an empty <tbody>.

### Token consistency

All color values reference Tailwind classes or CSS custom properties, not raw hex values scattered through components. The hex values in this doc are the source of truth; components use the Tailwind equivalents (gray-50, gray-200, gray-900, gray-500, etc.) plus custom `[#FF9933]` for saffron.

## Testing Strategy

### Visual regression

- Screenshot the dashboard at 375px, 768px, and 1280px viewports
- Compare sidebar expanded vs collapsed states
- Verify no dark-theme remnants on any page

### Component spot tests

- Sidebar: renders 5 nav items, collapse toggle works, active item highlighted
- TopBar: renders title, search, bell, avatar; adjusts offset for sidebar state
- MetricsRow: renders 4 cards with correct data
- InventoryDataTable: renders columns, sorting works, risk badges show correct colors
- BottomNav: hidden on desktop, visible on mobile, saffron active state

### Manual smoke tests

1. Navigate to /demo on desktop -- verify sidebar, top bar, metrics, table, chart render correctly
2. Collapse sidebar -- verify content area expands, icons remain visible
3. Navigate between all sub-pages via sidebar -- verify light theme on every page
4. Resize to mobile -- verify sidebar hides, bottom nav appears, metrics stack to 2x2
5. Check /demo/alerts, /demo/campaigns, /demo/network, /demo/orders, /demo/orders/batches -- all light theme
6. Verify trend chart uses saffron gradient
7. Verify AI insight has saffron top border and sparkle icon
8. Verify suggestion cards use light-theme styling
