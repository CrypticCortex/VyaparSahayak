// src/lib/rag/knowledge.ts
// Static FMCG domain knowledge for Tamil Nadu distributors

export const FMCG_KNOWLEDGE: Array<{
  sourceType: string;
  sourceId: string;
  content: string;
  metadata?: Record<string, unknown>;
}> = [
  // --- Seasonal patterns ---
  {
    sourceType: "market_insight",
    sourceId: "seasonal-pongal",
    content:
      "During Pongal festival (mid-January) in Tamil Nadu, demand for rice, sugar, jaggery, snacks, and sweets spikes 200-300%. Distributors should stock up 2-3 weeks before. Conversely, health drinks and supplements see a temporary dip.",
    metadata: { season: "pongal", months: [1], region: "tamil_nadu" },
  },
  {
    sourceType: "market_insight",
    sourceId: "seasonal-diwali",
    content:
      "Diwali (October-November) drives massive demand for sweets, snacks, dry fruits, cooking oil, and personal care gift packs. Stock beverages and cleaning products ahead. FMCG sales increase 25-40% overall.",
    metadata: { season: "diwali", months: [10, 11], region: "all_india" },
  },
  {
    sourceType: "market_insight",
    sourceId: "seasonal-summer",
    content:
      "Tamil Nadu summer (March-June) increases demand for beverages (40% spike), ice cream, oral rehydration, and cooling products. Detergent and soap sales also rise. Stock Tang, Rasna, Bisleri, and similar beverages.",
    metadata: { season: "summer", months: [3, 4, 5, 6], region: "tamil_nadu" },
  },
  {
    sourceType: "market_insight",
    sourceId: "seasonal-monsoon",
    content:
      "Monsoon season (October-December in Tamil Nadu) reduces foot traffic to kirana stores. Stock essentials but reduce perishable inventory. Umbrella and rain gear sales spike. Delivery routes may be disrupted.",
    metadata: { season: "monsoon", months: [10, 11, 12], region: "tamil_nadu" },
  },
  {
    sourceType: "market_insight",
    sourceId: "seasonal-ramadan",
    content:
      "During Ramadan, demand for dates, juices, packaged foods, and cooking oil rises sharply in Muslim-majority areas. Iftar snack packs sell well. Stock 2 weeks before Ramadan begins. Post-Eid sees a brief dip then normalization.",
    metadata: { season: "ramadan", region: "tamil_nadu" },
  },

  // --- Recovery strategies ---
  {
    sourceType: "market_insight",
    sourceId: "strategy-bundle",
    content:
      "Bundling slow-moving products with fast-movers is the most effective dead stock recovery strategy for Indian FMCG. Typical bundle: slow product at 20% off paired with a staple (e.g., Tang with Maggi). Recovery rate: 60-75%. Works best when bundle MRP is a round number (Rs.99, Rs.149).",
    metadata: { strategy: "bundle", recovery_rate: 0.675 },
  },
  {
    sourceType: "market_insight",
    sourceId: "strategy-reallocate",
    content:
      "Zone reallocation works for products with uneven demand. If a product sells well in urban zones but is dead in rural zones, transfer stock. Typical recovery: 70-80%. Best for products with >30 days shelf life remaining. Cost: transportation only.",
    metadata: { strategy: "reallocate", recovery_rate: 0.75 },
  },
  {
    sourceType: "market_insight",
    sourceId: "strategy-flash-sale",
    content:
      "Flash sales via WhatsApp work well for near-expiry FMCG products. Offer 15-25% discount with urgency messaging. Tamil retailers respond best to messages in casual spoken Tamil with English product names. Include poster image for maximum impact. Recovery rate: 50-65%.",
    metadata: { strategy: "flash_sale", recovery_rate: 0.575 },
  },
  {
    sourceType: "market_insight",
    sourceId: "strategy-return",
    content:
      "Returning dead stock to the manufacturer is the last resort. Most FMCG companies accept returns within 6 months of expiry with full credit. Process: raise a return request, get authorization, deduct from next order. Recovery: 80-90% but damages the distributor-brand relationship.",
    metadata: { strategy: "return", recovery_rate: 0.85 },
  },
  {
    sourceType: "market_insight",
    sourceId: "strategy-sampling",
    content:
      "Product sampling through kirana shops is effective for slow-moving new launches. Give 2-3 free samples per retailer for in-store trials. Works best for personal care, snacks, and beverages. Conversion to reorder: 30-40% within 2 weeks. Cost: product value only.",
    metadata: { strategy: "sampling", recovery_rate: 0.35 },
  },

  // --- Product category insights ---
  {
    sourceType: "market_insight",
    sourceId: "category-beverages",
    content:
      "Beverage category (Tang, Rasna, Bru, tea) in Tamil Nadu peaks March-June. Shelf life is typically 12-18 months. Dead stock risk highest in winter months. Best recovery: bundle with biscuits or snacks.",
    metadata: { category: "beverages" },
  },
  {
    sourceType: "market_insight",
    sourceId: "category-personal-care",
    content:
      "Personal care products (soaps, creams, detergents) have long shelf life (2-3 years) but slow velocity in rural zones. Dead stock accumulates gradually. Best recovery: zone reallocation from rural to urban, or discount campaigns during festivals.",
    metadata: { category: "personal_care" },
  },
  {
    sourceType: "market_insight",
    sourceId: "category-snacks",
    content:
      "Snacks (Lays, Kurkure, Haldirams) have short shelf life (60-90 days) and high dead stock risk. Fast-moving in urban but can stall in rural areas. Monitor weekly. Best recovery: flash sales with WhatsApp posters. Never hold past 75% of shelf life.",
    metadata: { category: "snacks" },
  },
  {
    sourceType: "market_insight",
    sourceId: "category-staples",
    content:
      "Staples (rice, dal, oil, sugar, atta) are the backbone of kirana sales. Low margin (5-8%) but guaranteed movement. Use staples as anchor items in bundles. Dead stock risk is near zero for branded staples. Unbranded staples carry moisture/pest risk.",
    metadata: { category: "staples" },
  },
  {
    sourceType: "market_insight",
    sourceId: "category-biscuits",
    content:
      "Biscuit category (Britannia, Parle, ITC) moves steadily year-round. Shelf life 6-9 months. Marie and glucose biscuits are the fastest movers. Premium cream biscuits (Rs.30+) slow down in rural. Dead stock rare except for new premium variants.",
    metadata: { category: "biscuits" },
  },

  // --- Pricing and margins ---
  {
    sourceType: "market_insight",
    sourceId: "pricing-margin-tiers",
    content:
      "Typical FMCG distributor margins in Tamil Nadu: staples 5-8%, beverages 8-12%, snacks 10-15%, personal care 12-18%, health supplements 15-25%. Wholesale retailers expect 2-3% extra margin. Supermarkets demand 5-7% promotional discount. Kirana shops accept standard pricing but need credit terms.",
    metadata: { topic: "margins" },
  },
  {
    sourceType: "market_insight",
    sourceId: "pricing-round-numbers",
    content:
      "Indian consumers and retailers strongly prefer round MRP pricing. Products priced at Rs.10, Rs.20, Rs.50, Rs.99, Rs.149, Rs.199 move 15-20% faster than odd pricing. When creating bundle offers, always target a round number total. Rs.99 and Rs.199 are the sweet spots for impulse purchases.",
    metadata: { topic: "pricing" },
  },

  // --- Kirana shop patterns ---
  {
    sourceType: "market_insight",
    sourceId: "kirana-buying-pattern",
    content:
      "Tamil Nadu kirana shops typically order twice a week (Monday and Thursday are popular). Average order: Rs.3,000-8,000 for small shops, Rs.15,000-30,000 for medium. They prefer credit terms of 7-15 days. Ordering spikes before weekends and festivals. Most shop owners check WhatsApp between 7-9 AM and after 8 PM.",
    metadata: { topic: "kirana_patterns" },
  },
  {
    sourceType: "market_insight",
    sourceId: "kirana-loyalty",
    content:
      "Kirana shop loyalty is driven by: (1) credit terms, (2) delivery reliability, (3) replacement/return policy, (4) personal relationship. Price is 4th priority. A distributor who visits regularly and resolves issues quickly retains 90%+ of shops. Competitor switching happens primarily due to stockouts or credit disputes.",
    metadata: { topic: "kirana_loyalty" },
  },

  // --- WhatsApp marketing ---
  {
    sourceType: "market_insight",
    sourceId: "whatsapp-best-practices",
    content:
      "WhatsApp marketing best practices for FMCG distributors: (1) Send messages 7-9 AM or 8-10 PM when shop owners check phones. (2) Use a mix of Tamil and English -- Tamil for emotional hook, English for product names and prices. (3) Include product image or poster -- messages with images get 3x more response. (4) Keep messages under 150 words. (5) Include a clear call-to-action with phone number. (6) Don't spam -- max 2-3 messages per week per group.",
    metadata: { topic: "whatsapp_marketing" },
  },
  {
    sourceType: "market_insight",
    sourceId: "whatsapp-urgency",
    content:
      "Urgency messaging doubles conversion in WhatsApp campaigns. Use: 'Only X cases left', 'Offer valid till [date]', 'First 10 orders get extra 5% off'. Tamil phrases that work: 'stock mudiyum munne' (before stock finishes), 'indru mattum' (today only). Avoid overusing urgency -- retailers learn to ignore if every message is 'urgent'.",
    metadata: { topic: "whatsapp_urgency" },
  },

  // --- Credit and payment ---
  {
    sourceType: "market_insight",
    sourceId: "credit-collection-pattern",
    content:
      "Payment collection patterns for Tamil Nadu FMCG: 60% of retailers pay within 7 days, 25% within 15 days, 15% extend to 30+ days. Best collection days are Monday morning and Saturday afternoon. UPI/GPay adoption is 70%+ in urban, 40% in rural. Cash-on-delivery still preferred by older shop owners. Offering 2% discount for immediate payment recovers more than chasing late payments.",
    metadata: { topic: "credit_collection" },
  },
  {
    sourceType: "market_insight",
    sourceId: "credit-risk-signals",
    content:
      "Warning signs of retailer credit risk: (1) ordering frequency drops, (2) returns increase, (3) payment delays extend beyond usual pattern, (4) requests for higher credit limit without volume increase, (5) neighboring shops report the retailer is stocking competitor products. Action: reduce credit limit and switch to cash-on-delivery before total outstanding exceeds Rs.50,000.",
    metadata: { topic: "credit_risk" },
  },
];
