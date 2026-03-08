# Codebase Structure

## Layout

```
vyapar-sahayak/
  prisma/
    schema.prisma          # SQLite DB schema (Distributor, Product, Zone, Retailer,
                           #   Inventory, SalesTransaction, SalesLineItem,
                           #   DeadStockAlert, Recommendation, Campaign)
  src/
    app/
      page.tsx             # Landing page
      layout.tsx           # Root layout
      demo/
        page.tsx           # Dashboard (server component)
        layout.tsx         # Demo shell with bottom nav + chat widget
        alerts/            # Dead stock alerts list
        recommendations/   # Recommendation detail (approve/reject)
        campaigns/         # Campaign list + detail (poster picker, WhatsApp preview)
        network/           # Zone network overview
      api/
        seed/              # POST -- seeds demo data (distributor, products, zones, retailers, sales)
        detect/            # POST -- runs ML pipeline, creates DeadStockAlert records
        recommend/         # POST -- generates recommendation + campaign from alert
        campaign/          # POST -- campaign actions (select poster, send)
        chat/              # POST -- agentic chatbot (Bedrock Converse API)
    lib/
      db.ts                # Prisma client singleton
      cache.ts             # unstable_cache wrappers + revalidation helpers
      bedrock.ts           # AWS Bedrock text + image generation (Nova Lite, Nova Canvas, Gemini)
      agent-tools.ts       # 9 tool definitions for chatbot agent loop
      utils.ts             # cn() helper
      ml/
        features.ts        # 18-feature extraction from inventory + sales data
        scoring.ts         # 6-signal weighted dead stock scoring
        clustering.ts      # K-means zone clustering
        forecasting.ts     # Demand forecasting
        recommendations.ts # Rule-based recommendation generation
        insights.ts        # Dashboard insight generation from ML data
        enrich.ts          # LLM enrichment of recommendations (problem/solution/rationale)
      seed/
        data.ts            # Seed data generators
    components/
      dashboard/           # All dashboard UI components
                           #   Layout: sidebar, top-bar, bottom-nav, demo-shell
                           #   Metrics: metrics-row, inventory-table
                           #   Charts: trend-chart
                           #   AI: ai-insight, suggestion-card, suggestion-list
                           #   Cards: product-card, recommendation-card, order-card,
                           #          batch-card, campaign-preview, hero-cards
                           #   Other: quick-actions, guided-tour, risk-badge, zone-order-group
      chat/
        chat-widget.tsx    # Floating agentic chatbot
      landing/             # Landing page components
      ui/                  # shadcn/ui primitives (badge, button, card, dialog, etc.)
```

## Data Flow

```
Seed API --> DB populated with demo data
         |
Detect API --> features.ts --> scoring.ts --> recommendations.ts --> DeadStockAlert rows
         |                                                      --> enrich.ts (background LLM call)
         |
Dashboard <-- cache.ts <-- DB queries (unstable_cache with revalidateTag)
         |
Recommend API --> bedrock.ts (WhatsApp text) --> bedrock.ts (poster image) --> Campaign row
         |
Campaign page --> campaign-preview.tsx (poster picker, zone toggles, send button)
```

## Key Patterns

- Server components fetch data via cached queries; client components handle interactivity
- Cache invalidation uses `revalidateTag` with named tags (dashboard, alerts, campaigns, network)
- ML pipeline is pure TypeScript (no Python) using simple-statistics + ml-kmeans
- LLM enrichment is non-blocking (fire-and-forget after detection response)
- Chatbot uses Bedrock Converse API with tool-use loop (max 8 turns)
