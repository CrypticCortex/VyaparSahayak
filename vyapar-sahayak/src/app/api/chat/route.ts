// src/app/api/chat/route.ts
// Agentic chatbot using Strands Agents SDK with Bedrock

import { NextResponse } from "next/server";
import { Agent } from "@strands-agents/sdk";
import { bedrockModel } from "@/lib/strands/model";
import { allTools } from "@/lib/strands/tools";
import { isSuggestionResult } from "@/lib/strands/autonomy";
import { executeTool } from "@/lib/agent-tools";
import { prisma } from "@/lib/db";

interface CampaignCard {
  id: string;
  productName: string;
  status: string;
  posters: string[];
  whatsappMessage?: string;
  offerHeadline?: string;
}

async function getCampaignCards(campaignIds: string[]): Promise<CampaignCard[]> {
  if (campaignIds.length === 0) return [];
  const campaigns = await prisma.campaign.findMany({
    where: { id: { in: campaignIds } },
  });
  return campaigns.map((c) => ({
    id: c.id,
    productName: c.productName,
    status: c.status,
    posters: [c.posterUrl, c.posterUrlAlt].filter(Boolean) as string[],
    whatsappMessage: c.whatsappMessage || undefined,
    offerHeadline: c.offerHeadline || undefined,
  }));
}

// Always use demo mode for chat -- the structured handlers are faster,
// more predictable, and have WhatsApp/poster integration built in.
// Set CHAT_USE_BEDROCK=true to use the LLM-powered agentic path instead.
const isDemoMode = process.env.CHAT_USE_BEDROCK !== "true";

const SYSTEM_PROMPT = `You are VyaparSahayak AI, a smart assistant for Indian FMCG distributors in Tamil Nadu. You help manage dead stock, create WhatsApp campaigns, handle orders, manage dispatch batches, and monitor retailer activity.

You speak in a friendly, professional tone. Mix English with occasional Tamil words when it feels natural. Keep responses concise -- 2-3 sentences max unless the user asks for detail.

You have tools for:
INVENTORY & ALERTS:
- get_dashboard_summary: Overview of dead stock metrics, campaigns, zones
- scan_inventory: Scan for dead/slow-moving stock
- get_alerts: List all dead stock alerts
- get_alert_detail: Deep dive into a specific alert
- generate_recommendation: Create AI recommendation + WhatsApp campaign from an alert
- auto_handle_dead_stock: Full automated flow (scan -> detect -> recommend -> campaign)

CAMPAIGNS & WHATSAPP:
- get_campaigns: List all campaigns
- get_campaign_detail: View a specific campaign's details
- send_campaign: Send a campaign to WhatsApp groups (NEEDS APPROVAL)
- get_whatsapp_groups: List configured WhatsApp groups
- get_campaign_performance: Analyze campaign conversion rates
- send_campaign_reminder: Re-send campaign to non-ordering retailers

ORDERS & DISPATCH:
- get_pending_orders: View pending orders grouped by zone
- confirm_order: Confirm a pending order (NEEDS APPROVAL)
- reject_order: Reject an order with reason (NEEDS APPROVAL)
- suggest_dispatch_batch: Analyze confirmed orders and suggest optimal batches
- create_dispatch_batch: Create a dispatch batch for a zone (NEEDS APPROVAL)

NETWORK:
- get_network_overview: Zone and retailer statistics
- check_retailer_activity: Flag inactive retailers

AUTONOMY RULES:
- For read-only tools (dashboards, lists, analytics), execute automatically.
- For mutating actions (send_campaign, confirm_order, reject_order, create_dispatch_batch), present the suggestion to the user and wait for approval before executing.

IMPORTANT BEHAVIORS:
- When the user says "check what's dead and handle it" or "scan and give me ideas", use auto_handle_dead_stock with auto_send=false so they can review first.
- When the user approves or says "send it" / "go ahead" / "dispatch", send the campaigns.
- When sending, tell them which WhatsApp groups received it and how many retailers.
- Always mention product names, not just IDs.
- After creating campaigns, offer to send them. After sending, summarize the delivery.
- If the user asks about groups or who will receive, use get_whatsapp_groups.
- For orders: show pending counts, offer to confirm/reject, suggest dispatch batches.
- For inactive retailers: flag them and suggest re-engagement campaigns.

If the user asks something outside your scope, politely redirect them.`;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function POST(req: Request) {
  try {
    const { messages } = (await req.json()) as { messages: ChatMessage[] };

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: "No messages provided" }, { status: 400 });
    }

    if (isDemoMode) {
      return handleDemoMode(messages);
    }

    // Create Strands Agent with Bedrock model and all tools
    const agent = new Agent({
      model: bedrockModel,
      systemPrompt: SYSTEM_PROMPT,
      tools: allTools,
    });

    // Extract the last user message for the agent
    const lastUserMessage = messages[messages.length - 1].content;

    // Invoke the agent (handles the tool-use loop internally)
    const result = await agent.invoke(lastUserMessage);

    // Extract reply text, strip any leaked thinking tags
    const rawReply = result.toString() || "I processed your request but have nothing to add.";
    const reply = rawReply.replace(/<thinking>[\s\S]*?<\/thinking>\s*/g, "").trim();

    // Collect campaign IDs and suggestions from the agent's conversation history
    const seenCampaignIds = new Set<string>();
    const suggestions: unknown[] = [];

    // Walk all messages to find tool results with campaign data
    for (const msg of agent.messages) {
      for (const block of msg.content) {
        if ("type" in block && block.type === "toolResultBlock") {
          const trBlock = block as any;
          for (const item of trBlock.content || []) {
            const r = ("json" in item) ? (item as any).json : null;
            if (!r) continue;
            // Collect campaign IDs
            if (r.items && Array.isArray(r.items)) {
              for (const c of r.items) if (c.id) seenCampaignIds.add(c.id);
            }
            if (r.id) seenCampaignIds.add(r.id);
            if (r.campaignId) seenCampaignIds.add(r.campaignId);
            if (r.processed) {
              for (const a of r.processed) if (a.campaignId) seenCampaignIds.add(a.campaignId);
            }
            // Collect suggestion cards
            if (isSuggestionResult(r)) {
              suggestions.push(r);
            }
          }
        }
      }
    }

    // Attach campaign cards if any were accessed during tool execution
    const campaigns = await getCampaignCards([...seenCampaignIds]);

    return NextResponse.json({
      reply,
      ...(campaigns.length > 0 && { campaigns }),
      ...(suggestions.length > 0 && { suggestions }),
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("Chat error:", errMsg, error);
    return NextResponse.json(
      { error: `Something went wrong: ${errMsg}` },
      { status: 500 }
    );
  }
}




// Demo mode: use tool execution directly without Bedrock
async function handleDemoMode(messages: ChatMessage[]) {
  const lastMessage = messages[messages.length - 1].content.toLowerCase();

  try {
    // Full auto flow: "handle it", "take care of it", "do everything", "check what's dead"
    if (
      lastMessage.includes("handle") ||
      lastMessage.includes("take care") ||
      lastMessage.includes("do everything") ||
      (lastMessage.includes("check") && lastMessage.includes("dead")) ||
      (lastMessage.includes("what") && lastMessage.includes("dead") && (lastMessage.includes("idea") || lastMessage.includes("suggest") || lastMessage.includes("fix")))
    ) {
      const result = await executeTool("auto_handle_dead_stock", { max_items: 3, auto_send: false });
      const r = result as any;
      if (r.error) return NextResponse.json({ reply: r.error });
      const processed = (r.processed || []) as any[];
      const campaignIds = processed.map((a: any) => a.campaignId).filter(Boolean);
      const cards = await getCampaignCards(campaignIds);
      const lines = processed.map(
        (a: any, i: number) => `${i + 1}. **${a.productName}** -- ${a.riskLevel} risk, ${a.stockValue}${a.recommendationCreated ? " -> Campaign created" : " -> Failed"}`
      );
      return NextResponse.json({
        reply: `${r.summary.message}\n\nHere's what I processed:\n\n${lines.join("\n")}\n\nWant me to send these campaigns to your WhatsApp groups?`,
        campaigns: cards,
      });
    }

    // WhatsApp groups
    if (lastMessage.includes("group") || lastMessage.includes("who will receive") || lastMessage.includes("whatsapp group")) {
      const result = await executeTool("get_whatsapp_groups", {});
      const groups = result as any[];
      if (!Array.isArray(groups) || groups.length === 0) {
        return NextResponse.json({ reply: "No WhatsApp groups configured. Run seed to set them up." });
      }
      const lines = groups.map(
        (g: any, i: number) => `${i + 1}. **${g.name}** (${g.type}) -- ${g.memberCount} members${g.zoneCode ? ` [${g.zoneCode}]` : ""}`
      );
      return NextResponse.json({
        reply: `Your WhatsApp groups:\n\n${lines.join("\n")}\n\nCampaigns are sent to zone-specific groups by default.`,
      });
    }

    // "send it" / "go ahead" / "approve" / "dispatch" (without "campaign" context)
    if (
      (lastMessage.includes("send") && (lastMessage.includes("it") || lastMessage.includes("them") || lastMessage.includes("all"))) ||
      lastMessage.includes("go ahead") ||
      lastMessage.includes("approve") ||
      lastMessage.includes("dispatch")
    ) {
      const campaigns = (await executeTool("get_campaigns", {})) as any[];
      if (!Array.isArray(campaigns) || campaigns.length === 0) {
        return NextResponse.json({ reply: "No campaigns to send. Let me scan and create some first." });
      }
      const drafts = campaigns.filter((c) => c.status === "draft");
      if (drafts.length === 0) {
        return NextResponse.json({ reply: "All campaigns have already been sent!" });
      }
      const results: string[] = [];
      const sentIds: string[] = [];
      const whatsappMessages: string[] = [];
      for (const draft of drafts) {
        const sendResult = await executeTool("send_campaign", { campaign_id: draft.id }) as any;
        if (sendResult.success) {
          results.push(`**${draft.productName}** -> ${sendResult.totalGroupsSent} groups, ${sendResult.totalRecipients} retailers`);
          sentIds.push(draft.id);
        }
      }
      const cards = await getCampaignCards(sentIds);
      // Collect WhatsApp messages for opening in WhatsApp
      for (const card of cards) {
        if (card.whatsappMessage) {
          whatsappMessages.push(card.whatsappMessage);
        }
      }
      return NextResponse.json({
        reply: `Sent ${results.length} campaigns:\n\n${results.join("\n")}\n\nAll done! Your retailers will see the offers on WhatsApp.`,
        campaigns: cards,
        openWhatsApp: whatsappMessages.length > 0 ? whatsappMessages : undefined,
      });
    }

    // Simple intent matching for demo
    if (lastMessage.includes("scan") || lastMessage.includes("detect") || lastMessage.includes("inventory check")) {
      const result = await executeTool("scan_inventory", {});
      const r = result as any;
      if (r.error) return NextResponse.json({ reply: r.error });
      return NextResponse.json({
        reply: `Inventory scan complete! Found ${r.atRiskItems} at-risk items out of ${r.totalItemsScanned} total SKUs. Dead stock value: ${r.totalDeadStockValueFormatted}. ${r.highRisk} items are high risk. Check the Alerts page for details.`,
      });
    }

    if (lastMessage.includes("alert") || lastMessage.includes("risk") || lastMessage.includes("dead stock")) {
      const result = await executeTool("get_alerts", {});
      const alerts = result as any[];
      if (!Array.isArray(alerts) || alerts.length === 0) {
        return NextResponse.json({ reply: "No alerts found. Try scanning your inventory first." });
      }
      const top5 = alerts.slice(0, 5);
      const lines = top5.map(
        (a, i) => `${i + 1}. **${a.productName}** -- ${a.riskLevel} risk, ${a.stockValueFormatted}, ${a.daysSinceLastSale} days idle`
      );
      return NextResponse.json({
        reply: `Found ${alerts.length} at-risk items. Here are the top ones:\n\n${lines.join("\n")}\n\nWant me to generate a recommendation for any of these?`,
      });
    }

    if (lastMessage.includes("campaign") && (lastMessage.includes("send") || lastMessage.includes("dispatch"))) {
      const campaigns = (await executeTool("get_campaigns", {})) as any[];
      if (!Array.isArray(campaigns) || campaigns.length === 0) {
        return NextResponse.json({ reply: "No campaigns found. Generate a recommendation first to create one." });
      }
      const draft = campaigns.find((c) => c.status === "draft");
      if (!draft) {
        return NextResponse.json({ reply: "All campaigns have already been sent!" });
      }
      const result = await executeTool("send_campaign", { campaign_id: draft.id });
      const cards = await getCampaignCards([draft.id]);
      const waMsg = cards[0]?.whatsappMessage;
      return NextResponse.json({
        reply: `Campaign for **${draft.productName}** sent to retailers! ${(result as any).message}`,
        campaigns: cards,
        ...(waMsg && { openWhatsApp: [waMsg] }),
      });
    }

    // "show me the ads" / "show posters" / "show pics"
    if (
      (lastMessage.includes("show") && (lastMessage.includes("ad") || lastMessage.includes("poster") || lastMessage.includes("pic") || lastMessage.includes("creative"))) ||
      lastMessage.includes("view poster") ||
      lastMessage.includes("see the poster")
    ) {
      const allCampaigns = await prisma.campaign.findMany({
        where: { posterUrl: { not: "" } },
        orderBy: { createdAt: "desc" },
        take: 5,
      });
      if (allCampaigns.length === 0) {
        return NextResponse.json({ reply: "No campaign posters found yet. Generate some recommendations first!" });
      }
      const cards: CampaignCard[] = allCampaigns.map((c) => ({
        id: c.id,
        productName: c.productName,
        status: c.status,
        posters: [c.posterUrl, c.posterUrlAlt].filter(Boolean) as string[],
        whatsappMessage: c.whatsappMessage || undefined,
        offerHeadline: c.offerHeadline || undefined,
      }));
      const lines = allCampaigns.map(
        (c, i) => `${i + 1}. **${c.productName}** -- ${c.status}`
      );
      return NextResponse.json({
        reply: `Here are your campaign posters:\n\n${lines.join("\n")}`,
        campaigns: cards,
      });
    }

    if (lastMessage.includes("campaign")) {
      const result = await executeTool("get_campaigns", {});
      const campaigns = result as any[];
      if (!Array.isArray(campaigns) || campaigns.length === 0) {
        return NextResponse.json({ reply: "No campaigns yet. Scan inventory and generate recommendations to create campaigns." });
      }
      const campaignIds = campaigns.slice(0, 5).map((c: any) => c.id);
      const cards = await getCampaignCards(campaignIds);
      const lines = campaigns.slice(0, 5).map(
        (c, i) => `${i + 1}. **${c.productName}** -- ${c.status}${c.sentAt ? " (sent)" : ""}`
      );
      return NextResponse.json({
        reply: `You have ${campaigns.length} campaigns:\n\n${lines.join("\n")}\n\nWant me to send any draft campaigns?`,
        campaigns: cards,
      });
    }

    if (lastMessage.includes("recommend") || lastMessage.includes("action") || lastMessage.includes("fix")) {
      const alerts = (await executeTool("get_alerts", {})) as any[];
      if (!Array.isArray(alerts) || alerts.length === 0) {
        return NextResponse.json({ reply: "No alerts to act on. Scan your inventory first." });
      }
      const first = alerts[0];
      const result = await executeTool("generate_recommendation", { alert_id: first.id });
      const r = result as any;
      if (r.error) return NextResponse.json({ reply: `Error: ${r.error}` });
      return NextResponse.json({
        reply: `Generated a recommendation for **${first.productName}**! ${r.headline || "Campaign created with WhatsApp message and poster."}  Check the Campaigns page to review and send.`,
      });
    }

    if (lastMessage.includes("network") || lastMessage.includes("zone") || lastMessage.includes("retailer")) {
      const result = await executeTool("get_network_overview", {});
      const r = result as any;
      if (r.error) return NextResponse.json({ reply: r.error });
      const zoneLines = r.zones.slice(0, 5).map(
        (z: any) => `- **${z.name}** (${z.code}): ${z.retailerCount} retailers, ${z.deadStockValueFormatted} dead stock`
      );
      return NextResponse.json({
        reply: `Your network: ${r.totalZones} zones, ${r.totalRetailers} retailers.\n\n${zoneLines.join("\n")}`,
      });
    }

    if (lastMessage.includes("dashboard") || lastMessage.includes("summary") || lastMessage.includes("overview") || lastMessage.includes("how") || lastMessage.includes("status")) {
      const result = await executeTool("get_dashboard_summary", {});
      const r = result as any;
      if (r.error) return NextResponse.json({ reply: r.error });
      return NextResponse.json({
        reply: `Here's your overview, ${r.ownerName}:\n\n- Dead stock: **${r.deadStockValueFormatted}** across ${r.atRiskSkus} SKUs (${r.highRiskSkus} high risk)\n- Active campaigns: ${r.activeCampaigns}\n- Pending recommendations: ${r.pendingRecommendations}\n- Zones: ${r.totalZones}\n\nWhat would you like to do? I can scan inventory, show alerts, or create campaigns.`,
      });
    }

    // Default
    return NextResponse.json({
      reply:
        "I can help you with:\n\n- **Scan inventory** for dead stock\n- **View alerts** and at-risk items\n- **Generate recommendations** and campaigns\n- **Send campaigns** to retailers\n- **View network** overview\n- **Dashboard summary**\n\nWhat would you like to do?",
    });
  } catch (error) {
    console.error("Demo chat error:", error);
    return NextResponse.json({
      reply: "Oops, something went wrong while processing that. Try again?",
    });
  }
}
