## Implementation Tasks

- [ ] 1. Layout Foundation (Sidebar, TopBar, DemoLayout)
  - [ ] 1.1 Create Sidebar client component at `src/components/dashboard/sidebar.tsx`
    - 5 nav items: Dashboard, Alerts, Orders, Campaigns, Network with lucide-react icons
    - Expanded (240px) shows icon + label, collapsed (64px) shows icon only
    - Active route detection via usePathname(), active item gets saffron left border + bg-orange-50
    - Collapse toggle button at the bottom with chevron icon
    - CSS transition on width (transition-all duration-200)
    - Hidden below md breakpoint (hidden md:flex)
    - _Refs: R-sidebar, R-sidebar-collapse_
  - [ ] 1.2 Create TopBar client component at `src/components/dashboard/top-bar.tsx`
    - Render page title (mapped from pathname), search input placeholder, notification bell, user avatar
    - Sticky positioning at top of content area
    - Left offset adjusts based on sidebarCollapsed prop (ml-60 / ml-16 / ml-0)
    - Bell icon from lucide-react, avatar circle with "VS" initials
    - White background, border-b border-gray-200
    - _Refs: R-top-bar_
  - [ ] 1.3 Update DemoLayout at `src/app/demo/layout.tsx`
    - Remove max-w-md / 480px width cap
    - Add Sidebar component (desktop), pass collapsed state
    - Add TopBar component, pass sidebarCollapsed state
    - Background: bg-gray-50
    - Main content: responsive left margin matching sidebar width
    - Sidebar collapsed state persisted to localStorage (try/catch wrapped)
    - Use React context or useState + useEffect for sidebar state
    - BottomNav hidden on md+ (handled in BottomNav component)
    - _Refs: R-demo-layout, R-responsive-layout_
  - [ ] 1.4 Update BottomNav at `src/components/dashboard/bottom-nav.tsx`
    - Add md:hidden to container (hidden on desktop)
    - White background, border-t border-gray-200
    - Active item: text-[#FF9933] and saffron icon fill
    - Inactive item: text-gray-500
    - _Refs: R-bottom-nav-light_

- [ ] 2. Metrics Row and Data Table
  - [ ] 2.1 Create MetricsRow component at `src/components/dashboard/metrics-row.tsx`
    - 4 cards: Dead Stock Items, Recovered Value, Active Campaigns, Pending Orders
    - Each card: white bg, shadow-sm, border-gray-200, icon, primary value, secondary context
    - Desktop: grid-cols-4 gap-4; Mobile: grid-cols-2 gap-3
    - Props: metrics data object with counts and values for each card
    - Cards use saffron accent for icons or highlight values
    - _Refs: R-metrics-row, R-metrics-responsive_
  - [ ] 2.2 Create InventoryDataTable client component at `src/components/dashboard/inventory-table.tsx`
    - Columns: Product, Category, Stock, Sales Velocity, Risk Score, Status, Actions
    - Sortable: click column header to toggle asc/desc, visual sort indicator
    - Risk badges: >= 70 red (bg-red-100 text-red-700), 40-69 amber (bg-amber-100 text-amber-700), < 40 green (bg-emerald-100 text-emerald-700)
    - Action buttons: View detail, Create Campaign (linking to relevant pages)
    - White card container with shadow-sm
    - Empty state when no products
    - On mobile: consider simplified view (fewer columns or card layout)
    - _Refs: R-data-table, R-risk-badges_
  - [ ] 2.3 Update main dashboard page at `src/app/demo/page.tsx`
    - Replace hero-cards + quick-actions with MetricsRow
    - Add InventoryDataTable as main content
    - Fetch metrics data server-side (dead stock count, recovered value, campaign count, order count)
    - Pass data to MetricsRow and InventoryDataTable
    - Light-theme background and spacing
    - _Refs: R-dashboard-restructure_

- [ ] 3. Chart and Widget Restyling
  - [ ] 3.1 Rewrite TrendChart at `src/components/dashboard/trend-chart.tsx`
    - Full main content width (remove fixed small-card sizing)
    - Saffron (#FF9933) line color
    - Gradient fill: #FF9933 opacity 0.3 to transparent
    - White card container, shadow-sm, border-gray-200
    - Light-theme axis labels: text-gray-500 (#6B7280)
    - Larger height (h-64 or h-72 instead of previous small height)
    - _Refs: R-trend-chart_
  - [ ] 3.2 Rewrite AIInsightWidget at `src/components/dashboard/ai-insight.tsx`
    - White background, shadow-sm, border-gray-200
    - Saffron top border: border-t-[3px] border-[#FF9933]
    - Sparkle icon from lucide-react in saffron color
    - Text: text-gray-900 primary, text-gray-500 secondary
    - _Refs: R-ai-insight_
  - [ ] 3.3 Rewrite SuggestionCard at `src/components/dashboard/suggestion-card.tsx`
    - White card, shadow-sm, border-gray-200
    - Priority dot: high=bg-red-500, medium=bg-amber-500, low=bg-gray-400
    - Text: text-gray-900 title, text-gray-500 description
    - "Do it" button: bg-[#FF9933] text-white or outline variant
    - Dismiss X: text-gray-400 hover:text-gray-600
    - _Refs: R-suggestion-cards-light_
  - [ ] 3.4 Update SuggestionList at `src/components/dashboard/suggestion-list.tsx`
    - Light-theme container styling
    - Section header text: text-gray-900
    - _Refs: R-suggestion-list-light_

- [ ] 4. Sub-Page Light Theme Reskin
  - [ ] 4.1 Update alerts page at `src/app/demo/alerts/`
    - White card backgrounds, shadow-sm, border-gray-200
    - Risk badges using status colors (red/amber/green)
    - Text: gray-900 primary, gray-500 secondary
    - Remove any dark-theme classes (bg-gray-800, bg-gray-900, text-white on dark bg, etc.)
    - _Refs: R-sub-page-reskin_
  - [ ] 4.2 Update campaigns pages at `src/app/demo/campaigns/`
    - Light-theme cards and text
    - Campaign status using status color tokens
    - Saffron accents for active/highlighted elements
    - _Refs: R-sub-page-reskin_
  - [ ] 4.3 Update network page at `src/app/demo/network/`
    - Light-theme zone cards and network visualization
    - Saffron accents for highlights
    - _Refs: R-sub-page-reskin_
  - [ ] 4.4 Update orders page at `src/app/demo/orders/`
    - Light-theme order cards, zone groups, summary bar
    - Status badge colors using the shared token palette
    - _Refs: R-sub-page-reskin_
  - [ ] 4.5 Update batches page at `src/app/demo/orders/batches/`
    - Light-theme batch cards
    - Status colors for planned/dispatched/delivered
    - _Refs: R-sub-page-reskin_
  - [ ] 4.6 Update shared dashboard components
    - batch-card.tsx: white bg, shadow-sm, light text
    - order-card.tsx: white bg, shadow-sm, light text
    - zone-order-group.tsx: white bg, light theme headers
    - product-card.tsx: white bg, saffron accents
    - recommendation-card.tsx: white bg, light text
    - campaign-preview.tsx: white bg, light text
    - risk-badge.tsx: use shared status colors
    - _Refs: R-sub-page-reskin, R-component-consistency_

- [ ] 5. Polish and Verification
  - [ ] 5.1 Verify responsive behavior at 375px, 768px, and 1280px
    - 375px: bottom nav, stacked metrics (2x2), full-width table, no sidebar
    - 768px: sidebar collapsed by default, metrics in 4-col, table with all columns
    - 1280px: sidebar expanded, full layout
    - _Refs: R-responsive-layout_
  - [ ] 5.2 Verify no dark-theme remnants across all pages
    - Search for bg-gray-800, bg-gray-900, bg-black, text-white (on dark bg), dark gradient classes
    - Ensure all pages use the light token palette
    - _Refs: R-theme-consistency_
  - [ ] 5.3 Verify sidebar state persistence
    - Collapse sidebar, navigate away and back -- should remain collapsed
    - Open fresh tab -- should load saved state from localStorage
    - _Refs: R-sidebar-persistence_
  - [ ] 5.4 Visual smoke test on all pages
    - /demo -- metrics, table, chart, insight, suggestions all render in light theme
    - /demo/alerts -- light theme
    - /demo/orders -- light theme
    - /demo/orders/batches -- light theme
    - /demo/campaigns -- light theme
    - /demo/network -- light theme
    - _Refs: R-visual-verification_

## Sequencing Rationale

1. **Layout foundation first** (Task 1) because every other component lives inside the layout. The sidebar, top bar, and updated demo layout establish the responsive shell that all content renders within. Bottom nav update is included here since it's tightly coupled to the sidebar (they replace each other at the breakpoint).

2. **Metrics row and data table second** (Task 2) because they are the main dashboard content and depend on the layout being in place. The metrics row replaces hero-cards (a structural change to page.tsx), and the data table is the new centerpiece.

3. **Chart and widget restyling third** (Task 3) because these are existing components that need visual updates but no structural changes to the layout. They can only be verified once the layout shell (Task 1) and page structure (Task 2) are in place.

4. **Sub-page reskin fourth** (Task 4) because these are CSS/class changes across existing pages. They depend on the layout (Task 1) for the sidebar/bottom-nav context but are otherwise independent of dashboard content changes.

5. **Polish and verification last** (Task 5) because it's a cross-cutting check across everything built in Tasks 1-4.

Within each task group, subtasks are ordered by dependency (container before contents). Independent components within a task (e.g., sidebar and top-bar in Task 1) can be built in parallel.

## Definition of Done

- [ ] Sidebar renders on desktop with 5 nav items, collapses to 64px icons, persists state
- [ ] TopBar renders with page title, search placeholder, bell, avatar
- [ ] DemoLayout uses responsive sidebar (desktop) + bottom nav (mobile), no max-width cap
- [ ] BottomNav is light-themed and hidden on desktop
- [ ] MetricsRow shows 4 cards (dead stock, recovered, campaigns, orders) in responsive grid
- [ ] InventoryDataTable renders sortable product list with risk badges and actions
- [ ] TrendChart spans full width with saffron gradient fill
- [ ] AIInsightWidget has white bg, saffron top border, sparkle icon
- [ ] SuggestionCards use light-theme styling with correct priority colors
- [ ] All sub-pages (alerts, campaigns, network, orders, batches) use light theme
- [ ] No dark-theme classes remain in any dashboard component
- [ ] Layout works at 375px (mobile), 768px (tablet), 1280px (desktop)
- [ ] Background is #F9FAFB on all demo pages
- [ ] Saffron #FF9933 is used consistently for accents across all components
