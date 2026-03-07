# VyaparSahayak - Product Context

## What It Is

VyaparSahayak ("Business Helper") is a mobile-first web app for FMCG distributors in
Tamil Nadu, India. It detects dead stock using ML, generates recovery recommendations,
and helps distributors run WhatsApp clearance campaigns -- all from their phone.

## Target User

Small to mid-size FMCG distributors (think: one person managing 50-200 products across
6 zones in Tirunelveli district). They sell soaps, snacks, beverages to kirana
(mom-and-pop) retailers. Their primary business tool is WhatsApp.

## Core Flow

1. **Detect** -- ML pipeline scans inventory, scores every SKU-zone pair for dead stock risk
2. **Recommend** -- system generates actionable recommendations (reallocate, discount, bundle, liquidate)
3. **Approve** -- distributor reviews and approves recommendations
4. **Campaign** -- AI generates WhatsApp message + poster, distributor selects zones and sends

## Key Metrics

- Dead stock value (Rs.) across all zones
- Items cleared / recovered value
- Active campaigns and their reach (retailer count)
- Risk distribution (high / medium / low)

## Language & Locale

- UI is in English, but WhatsApp messages and posters mix English + Tamil
- Currency is Indian Rupees (Rs.), formatted with Indian numbering (lakhs, not millions)
- Date format: dd/mm/yyyy or "6 Mar" style

## Competition Context

This was built for the AWS GenAI Hackathon (aiforbharath). The differentiator is the
end-to-end ML + GenAI pipeline: from detection through campaign generation, not just
a chatbot wrapper.
