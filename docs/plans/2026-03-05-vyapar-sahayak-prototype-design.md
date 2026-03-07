# VyaparSahayak Prototype -- Design Document

Date: 2026-03-05
Status: Approved
Owner: Kalyan | Partner: Sanjana
Region: Tirunelveli, Tamil Nadu

---

## What We're Building

A full-loop AI-powered prototype for FMCG dead stock management. Seed inventory
data -> ML-based detection -> Bedrock-powered recommendations -> image poster
generation -> WhatsApp-ready campaign sender. Plus a landing page that makes
people stop scrolling.

Single Next.js app, SQLite for dev, AWS Bedrock for AI (text + image gen), ML
pipeline running in Node.js with no Python dependencies.

---

## Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Framework | Next.js 15 (App Router, TypeScript) | Full-stack, single deploy |
| DB | SQLite via Prisma (Postgres-ready) | Zero setup for prototype |
| AI Text | AWS Bedrock (Claude on Bedrock or Nova Micro) | Recommendations, campaign copy |
| AI Image | AWS Bedrock -- Amazon Nova Canvas ($0.04/image) | Poster generation |
| ML | simple-statistics + ml-kmeans + danfojs-node | No Python, runs in API routes |
| UI | shadcn/ui + Tailwind CSS | Dashboard components |
| Landing | Aceternity UI + Framer Motion + GSAP ScrollTrigger | 2026 trending patterns |
| Scroll | Lenis | Smooth scroll, Next.js compatible |

---

## Budget ($100 AWS)

| Service | Usage | Cost |
|---------|-------|------|
| Nova Canvas (image gen) | ~500 posters @ $0.04 | $20 |
| Bedrock text (recs + copy) | ~5M tokens | $5 |
| Comprehend (free tier) | Sentiment analysis | $0 |
| S3 (generated images) | <1GB | ~$0 |
| **Total** | | **~$25** |

Headroom: ~$75. No SageMaker, no Personalize (idle charges kill budgets).
ML runs locally in Node.js.

---

## Seed Data -- Tirunelveli FMCG

### Distributor

- Name: Kalyan Traders
- Owner: Kalyan
- Partner: Sanjana
- City: Tirunelveli, Tamil Nadu
- GSTIN: 33AABCK1234F1Z5 (sample)
- Monthly turnover: ~Rs.2 crore

### 6 Zones

1. Urban Tirunelveli (Palayamkottai side)
2. Tirunelveli Town (Junction area)
3. Nanguneri Rural
4. Ambasamudram
5. Cheranmahadevi
6. Sankarankovil

### ~250 Retailers (Tamil names)

Urban:
- Sri Murugan General Stores, Annapoorna Supermarket, Karpagam Traders
- Bharath General Stores, Sri Vinayaga Traders, Rajlaxmi Provision Store

Palayamkottai (mixed community):
- Al-Ameena Stores, Bismillah Provision, Crescent General Stores
- Sri Ram Kirana, Fathima Traders

Rural (Nanguneri, Ambasamudram):
- Selvam Stores, Mariappan General, Murugesan Provision
- Chellaswamy Traders, Pandi Kirana, Ayyasamy Stores

Modern trade:
- Daily Needs Mini Mart, Super Savings Store, Family Needs Center

Types: kirana, supermarket, medical, wholesale, petty

### ~50 SKUs

Beverages: Horlicks 200g, Boost 200g, Bru Instant 50g, Nescafe Classic 50g,
Hatsun Arun Badam Mix 200ml

Biscuits: Britannia Marie Gold 250g, Parle-G 200g, Sunfeast Dark Fantasy,
Good Day Cashew 100g

Oils: Idhayam Sesame Oil 1L, Fortune Sunflower 1L, Parachute Coconut 500ml

Soaps/Detergents: Lifebuoy Bar 100g, Surf Excel 500g, Pril Dishwash 500ml

Noodles: Maggi 70g, Yippee Mood Masala 70g

Dead stock candidates:
- Hatsun Arun Badam Drink 1L Tetra (shelf life 120d, low velocity)
- Complan NutriGro Strawberry 500g (Rs.395, barely moves)
- Milo Drink Mix 400g (new launch flop)

### Seasonal Patterns (Tamil Nadu)

Monthly multipliers by category:
- Pongal (mid-Jan): gingelly oil +30%, sweets ingredients +40%
- Summer (Apr-May): beverages +35-40%
- School reopen (Jun): health drinks +10-15%
- Navratri (Oct): edible oils +30%
- Deepavali (Nov): everything +40-50%
- Ramadan (Feb-Mar 2026): dates, vermicelli, fruit drinks +40-60% in
  Palayamkottai zone

### 3 Months of Synthetic Sales History

Generated with:
- Base weekly sales per SKU (from catalog)
- Seasonal multipliers applied
- Random noise (+-15%)
- Deliberate dead stock patterns: some SKUs stop selling mid-period
- Returns: ~2-5% return rate on select items

---

## ML Pipeline

All Node.js, no Python. Libraries: simple-statistics, ml-kmeans, danfojs-node.

### Feature Engineering (per SKU)

```
daysSinceLastSale          -- primary signal
avgDailySalesLast30d       -- recent velocity
avgDailySalesLast90d       -- baseline velocity
velocityRatio              -- 30d / 90d (< 0.6 = concerning)
velocityTrend              -- linear regression slope on weekly sales
weeksOfCover               -- currentStock / avgWeeklySales
expiryUrgency              -- exponential curve as expiry approaches
seasonalIndex              -- month-by-category Tamil Nadu multiplier
retailerPenetration        -- % of retailers buying this SKU
returnRate                 -- returns / sales ratio
stockTurnoverRatio         -- annual sales / avg inventory
```

### Dead Stock Score (weighted 0-1)

| Signal | Weight |
|--------|--------|
| Idleness (days since last sale) | 28% |
| Velocity decline (30d vs 90d) | 22% |
| Overstock (weeks of cover) | 20% |
| Expiry urgency | 18% |
| Seasonal risk | 8% |
| Return rate | 4% |

Thresholds:
- >= 0.7 = High Risk (red)
- 0.4-0.7 = Medium (amber)
- < 0.4 = Watch (green)

### Retailer Segmentation (k-means)

4 clusters based on: purchase frequency, avg order value, category affinity, zone.
- Platinum: high-volume urban
- Gold: regular suburban kirana
- Silver: small kirana
- New: recently onboarded

### Time Series Forecasting

Exponential smoothing (Holt-Winters simplified):
- 4-week rolling velocity with trend slope
- Seasonal decomposition using monthly multipliers
- Predicts next 4 weeks demand per SKU

### Recommendation Engine

| Condition | Action |
|-----------|--------|
| Near expiry (<30d) + high stock value (>Rs.20K) | Reallocate to high-demand zone |
| Low velocity ratio (<0.4) + long shelf life (>60d) | Bundle with fast-mover |
| Off-season + upcoming seasonal spike | Monitor (seasonal recovery coming) |
| Default | Price-off campaign (15-20%) |

---

## AI Integration (AWS Bedrock)

### Text Generation

Model: Claude on Bedrock (or Nova Micro for cost savings)
Use: recommendations + campaign copy

Input: dead stock features, territory data, retailer segments
Output: structured JSON -- recommendation type, rationale, WhatsApp message,
poster headline, offer details

### Image Generation

Model: Amazon Nova Canvas (amazon.nova-canvas-v1:0)
Cost: $0.04/image at 1024x1024 standard quality
Region: us-east-1

Prompt template:
"Vibrant Indian FMCG clearance sale promotional poster for {product}.
Bold {discount}% OFF text. Red and yellow color scheme. Eye-catching retail
advertisement. Clean white background. Professional product packaging visible.
Modern flat design style."

Text overlay (product name, price, offer text) added via Sharp after generation
since AI models render text poorly.

---

## Landing Page

Dark theme (#0a0f1e), saffron-to-blue mesh gradient.
Aceternity UI components + Framer Motion + GSAP ScrollTrigger + Lenis scroll.

### Section Flow

```
1. NAV         Sticky glassmorphic
               Logo | Features | Demo | [WhatsApp CTA] [Try Demo]

2. HERO        "Your dead stock is costing you crores."
               Sub: "AI-powered inventory intelligence for FMCG distributors"
               Animated glassmorphic dashboard card -- dead stock items
               highlighted red, turning green as AI clears them
               Floating metric chips: "Rs.40L recovered" "3 days setup"
               CTA: [Try Live Demo] [Watch 2-min Demo]

3. PROBLEM     "Sound familiar?"
               3 pain points animated on scroll:
               - Products approaching expiry, no alerts
               - Capital locked in unsellable inventory
               - Manual Excel tracking breaks at scale

4. SOLUTION    3-step visual flow with connecting line animation:
               1. Connect your billing software (Tally, Busy)
               2. AI scans and flags dead stock by risk tier
               3. Smart clearance: discounts, redistribution, campaigns

5. FEATURES    Bento grid (Aceternity):
               Large: "Dead Stock Radar" with animated mini chart
               Medium: "Expiry Alerts", "Campaign Generator"
               Small: "WhatsApp Reports", "Works Offline",
                      "Regional Language Support"

6. DEMO        "See how Kalyan Traders cleared Rs.4.2L of dead stock"
               Auto-playing silent video loop of dashboard
               [Try Live Demo] button -> /demo route

7. METRICS     Full-width dark section, oversized numbers:
               "Rs.2.4 crore recovered" "91% see ROI in 60 days"

8. PRICING     INR, monthly/annual toggle
               3 tiers: Starter / Growth / Enterprise
               Most popular with glow effect
               "No hidden charges. GST invoice provided."

9. FOOTER      Minimal. GST number. "Data stored in India."
               WhatsApp contact. Social links.
```

### Landing -> Demo Transition

"Try Live Demo" on landing page navigates to /demo.
/demo is the actual dashboard pre-seeded with Kalyan Traders data.
No signup, no friction -- visitor lands directly in the working app.
Subtle top banner: "Live demo with sample data. [Start Free Trial]"

---

## Dashboard

4 screens matching existing wireframes, built in React + shadcn/ui:

### Screen 1: Home (/demo)
- Greeting: "Good afternoon, Kalyan"
- Hero cards: Rs.4.2L stuck in dead stock | Rs.1.8L cleared this week
- Quick actions: Dead Stock Alerts, Pending Approvals, Active Campaigns,
  Network Overview
- Dead stock trend chart (real data from ML pipeline)
- AI Insight card: "3 SKUs expiring in 15 days can be bundled..."

### Screen 2: Dead Stock Detail (/demo/alerts)
- Filter chips: All | Near Expiry | Slow Moving | Excess | Returns
- Product cards with risk badges (High/Medium/Watch)
- AI suggestion per item (reallocate, bundle, price-off)
- Estimated recovery amount

### Screen 3: AI Recommendation (/demo/recommendations/[id])
- Problem -> Solution card
- Generated poster preview (Nova Canvas image)
- Expandable: Rationale, Affected Territories, Cost vs Recovery
- Approve & Launch / Reject buttons

### Screen 4: Campaign Sender (/demo/campaigns/[id])
- Full poster preview (AI-generated)
- WhatsApp message preview
- Recipient group toggles with counts
- Send Campaign button (simulated)

---

## Project Structure

```
vyapar-sahayak/
  src/
    app/
      page.tsx                          # Landing page
      demo/
        layout.tsx                      # Dashboard layout + bottom nav
        page.tsx                        # Home dashboard
        alerts/page.tsx                 # Dead stock detail
        recommendations/[id]/page.tsx   # AI recommendation
        campaigns/[id]/page.tsx         # Campaign sender
      api/
        seed/route.ts                   # Seed Tirunelveli data
        detect/route.ts                 # Run ML detection pipeline
        recommend/[id]/route.ts         # Bedrock text recommendation
        campaign/
          generate/route.ts             # Bedrock text + image
          send/route.ts                 # Simulated send
    lib/
      db.ts                             # Prisma client
      bedrock.ts                        # AWS Bedrock wrapper (text + image)
      ml/
        features.ts                     # Feature engineering
        scoring.ts                      # Dead stock score
        forecasting.ts                  # Exponential smoothing
        clustering.ts                   # k-means retailer segmentation
        recommendations.ts              # Recommendation engine
      seed/
        data.ts                         # FMCG catalog + retailers
        seasonal.ts                     # Tamil Nadu seasonal indices
        generate.ts                     # Synthetic sales history
    components/
      landing/                          # Aceternity + Framer Motion
        hero.tsx
        problem-section.tsx
        solution-steps.tsx
        bento-features.tsx
        demo-section.tsx
        metrics-section.tsx
        pricing.tsx
        footer.tsx
      dashboard/                        # shadcn/ui dashboard
        hero-cards.tsx
        quick-actions.tsx
        trend-chart.tsx
        ai-insight.tsx
        product-card.tsx
        risk-badge.tsx
        recommendation-card.tsx
        campaign-preview.tsx
        bottom-nav.tsx
      ui/                               # shadcn/ui primitives
  prisma/
    schema.prisma
    seed.ts
  public/
    posters/                            # Generated campaign posters
```
