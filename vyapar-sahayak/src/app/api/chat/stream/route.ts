export const runtime = "nodejs";

// SSE streaming endpoint for Vyapar Sahayak chat.
// Wraps the same demo-mode logic as /api/chat but emits events as each tool executes.

import { executeTool } from "@/lib/agent-tools";
import { prisma } from "@/lib/db";
import { createTrace, flushLangfuse } from "@/lib/observability";
import { auth, isToolAllowed, type UserRole } from "@/auth";

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


// Unwrap tool results that may be wrapped in { items: [...] } or be a plain array
function unwrapItems(result: unknown): any[] {
  const r = result as any;
  if (r?.items && Array.isArray(r.items)) return r.items;
  if (Array.isArray(r)) return r;
  return [];
}


// Generate a brief human-readable summary based on tool name and result shape
function summarizeToolResult(toolName: string, result: unknown): string {
  const r = result as any;
  if (r?.error) return `Error: ${r.error}`;

  switch (toolName) {
    case "scan_inventory":
      return `${r.atRiskItems} at-risk items out of ${r.totalItemsScanned} scanned`;
    case "get_alerts": {
      const items = unwrapItems(result);
      return `${items.length} alerts found`;
    }
    case "get_dashboard_summary":
      return `${r.atRiskSkus} at-risk SKUs, ${r.deadStockValueFormatted} dead stock`;
    case "get_campaigns": {
      const items = unwrapItems(result);
      return `${items.length} campaigns`;
    }
    case "get_whatsapp_groups": {
      const items = unwrapItems(result);
      return `${items.length} groups configured`;
    }
    case "send_campaign":
      return r.success
        ? `Sent to ${r.totalGroupsSent} groups, ${r.totalRecipients} retailers`
        : r.message || "Sent";
    case "generate_recommendation":
      return r.success ? `Campaign created${r.headline ? `: ${r.headline}` : ""}` : "Failed";
    case "auto_handle_dead_stock":
      return r.summary?.message || "Processed";
    case "get_network_overview":
      return `${r.totalZones} zones, ${r.totalRetailers} retailers`;
    default:
      return "Done";
  }
}


type SendFn = (event: Record<string, unknown>) => void;


// Tools that accept a zone_code parameter for salesman filtering
const ZONE_FILTERABLE_TOOLS = new Set([
  "get_dashboard_summary",
  "get_alerts",
  "get_pending_orders",
  "get_network_overview",
  "suggest_dispatch_batch",
]);

// Tools where the salesman's zone should be injected as zone_codes (array)
const ZONE_ARRAY_FILTERABLE_TOOLS = new Set([
  "send_campaign",
]);


// Execute a tool with before/after SSE events + Langfuse span
// Role-based access control: rejects tools the user's role cannot access.
// Zone scoping: for salesman role, injects zone filter into supported tools.
async function executeWithStream(
  toolName: string,
  args: Record<string, unknown>,
  send: SendFn,
  role: UserRole,
  trace?: ReturnType<typeof createTrace>,
  zoneCode?: string,
): Promise<unknown> {
  if (!isToolAllowed(role, toolName)) {
    send({ type: "tool_result", tool: toolName, summary: "Access denied for your role", ms: 0 });
    return { error: "Tool not available for your role" };
  }

  // Inject zone filter for salesman users
  let filteredArgs = args;
  if (role === "salesman" && zoneCode) {
    if (ZONE_FILTERABLE_TOOLS.has(toolName) && !args.zone_code) {
      filteredArgs = { ...args, zone_code: zoneCode };
    }
    if (ZONE_ARRAY_FILTERABLE_TOOLS.has(toolName) && !args.zone_codes) {
      filteredArgs = { ...args, zone_codes: [zoneCode] };
    }
  }

  send({ type: "tool_call", tool: toolName, status: "running" });
  const startTime = new Date();
  const span = trace?.span({ name: `tool:${toolName}`, startTime });
  const result = await executeTool(toolName, filteredArgs);
  const ms = Date.now() - startTime.getTime();
  const summary = summarizeToolResult(toolName, result);
  span?.end({ output: summary });
  send({ type: "tool_result", tool: toolName, summary, ms });
  return result;
}


export async function POST(req: Request) {
  const { messages } = await req.json();
  const lastMessage = (messages[messages.length - 1].content as string).toLowerCase();
  const trace = createTrace("chat-stream", { intent: lastMessage.slice(0, 200) });

  // RBAC: get the authenticated user's role and zone
  const session = await auth();
  const role = ((session?.user as any)?.role || "distributor") as UserRole;
  const userZone = (session?.user as any)?.zoneCode as string | undefined;

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const startTime = Date.now();

      function send(event: Record<string, unknown>) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      }

      function sendText(content: string) {
        send({ type: "text", content });
      }

      function sendCampaigns(cards: CampaignCard[]) {
        for (const card of cards) {
          send({ type: "campaign", data: card });
        }
      }

      try {
        // --- Full auto flow ---
        if (
          lastMessage.includes("handle") ||
          lastMessage.includes("take care") ||
          lastMessage.includes("do everything") ||
          (lastMessage.includes("check") && lastMessage.includes("dead")) ||
          (lastMessage.includes("what") && lastMessage.includes("dead") && (lastMessage.includes("idea") || lastMessage.includes("suggest") || lastMessage.includes("fix")))
        ) {
          send({ type: "thinking", text: "Running full dead stock analysis..." });

          // Step 1: Scan inventory
          const scanResult = await executeWithStream("scan_inventory", {}, send, role, trace, userZone) as any;
          if (scanResult.error) {
            sendText(scanResult.error);
            return;
          }

          // Step 2: Get alerts
          const alertsResult = await executeWithStream("get_alerts", {}, send, role, trace, userZone);
          const alerts = unwrapItems(alertsResult);
          if (alerts.length === 0) {
            sendText("Scan complete but no at-risk items found. Your inventory looks healthy!");
            return;
          }

          // Step 3: Generate recommendations for top 3
          const topAlerts = alerts.slice(0, 3);
          const processed: any[] = [];

          for (const alert of topAlerts) {
            const recResult = await executeWithStream(
              "generate_recommendation",
              { alert_id: alert.id },
              send,
              role,
              trace,
              userZone,
            ) as any;

            processed.push({
              productName: alert.productName,
              riskLevel: alert.riskLevel,
              stockValue: alert.stockValueFormatted,
              recommendationCreated: !recResult.error,
              campaignId: recResult.campaignId || null,
            });
          }

          const campaignIds = processed.map((a) => a.campaignId).filter(Boolean);
          const cards = await getCampaignCards(campaignIds);

          const lines = processed.map(
            (a, i) => `${i + 1}. **${a.productName}** -- ${a.riskLevel} risk, ${a.stockValue}${a.recommendationCreated ? " -> Campaign created" : " -> Failed"}`
          );

          const campaignsCreated = processed.filter((a) => a.recommendationCreated).length;
          sendText(
            `Processed ${topAlerts.length} items and created ${campaignsCreated} campaigns as drafts.\n\nHere's what I processed:\n\n${lines.join("\n")}\n\nWant me to send these campaigns to your WhatsApp groups?`
          );
          sendCampaigns(cards);
          return;
        }

        // --- WhatsApp groups ---
        if (lastMessage.includes("group") || lastMessage.includes("who will receive") || lastMessage.includes("whatsapp group")) {
          send({ type: "thinking", text: "Fetching WhatsApp groups..." });
          const result = await executeWithStream("get_whatsapp_groups", {}, send, role, trace, userZone);
          const groups = unwrapItems(result);

          if (groups.length === 0) {
            sendText("No WhatsApp groups configured. Run seed to set them up.");
            return;
          }
          const lines = groups.map(
            (g: any, i: number) => `${i + 1}. **${g.name}** (${g.type}) -- ${g.memberCount} members${g.zoneCode ? ` [${g.zoneCode}]` : ""}`
          );
          sendText(`Your WhatsApp groups:\n\n${lines.join("\n")}\n\nCampaigns are sent to zone-specific groups by default.`);
          return;
        }

        // --- Send / approve / go ahead ---
        if (
          (lastMessage.includes("send") && (lastMessage.includes("it") || lastMessage.includes("them") || lastMessage.includes("all"))) ||
          lastMessage.includes("go ahead") ||
          lastMessage.includes("approve") ||
          lastMessage.includes("dispatch")
        ) {
          send({ type: "thinking", text: "Sending campaigns to WhatsApp groups..." });
          const rawCampaigns = await executeWithStream("get_campaigns", {}, send, role, trace, userZone);
          const campaigns = unwrapItems(rawCampaigns);

          if (campaigns.length === 0) {
            sendText("No campaigns to send. Let me scan and create some first.");
            return;
          }
          const drafts = campaigns.filter((c: any) => c.status === "draft");
          if (drafts.length === 0) {
            sendText("All campaigns have already been sent!");
            return;
          }

          const results: string[] = [];
          const sentIds: string[] = [];
          const whatsappMessages: string[] = [];

          for (const draft of drafts) {
            const sendResult = await executeWithStream(
              "send_campaign",
              { campaign_id: draft.id },
              send,
              role,
              trace,
              userZone,
            ) as any;
            if (sendResult.success) {
              results.push(`**${draft.productName}** -> ${sendResult.totalGroupsSent} groups, ${sendResult.totalRecipients} retailers`);
              sentIds.push(draft.id);
            }
          }

          const cards = await getCampaignCards(sentIds);
          for (const card of cards) {
            if (card.whatsappMessage) {
              whatsappMessages.push(card.whatsappMessage);
            }
          }

          sendText(`Sent ${results.length} campaigns:\n\n${results.join("\n")}\n\nAll done! Your retailers will see the offers on WhatsApp.`);
          sendCampaigns(cards);

          if (whatsappMessages.length > 0) {
            send({ type: "whatsapp", messages: whatsappMessages });
          }
          return;
        }

        // --- Scan inventory ---
        if (lastMessage.includes("scan") || lastMessage.includes("detect") || lastMessage.includes("inventory check")) {
          send({ type: "thinking", text: "Scanning your inventory..." });
          const result = await executeWithStream("scan_inventory", {}, send, role, trace, userZone) as any;

          if (result.error) {
            sendText(result.error);
            return;
          }
          sendText(
            `Inventory scan complete! Found ${result.atRiskItems} at-risk items out of ${result.totalItemsScanned} total SKUs. Dead stock value: ${result.totalDeadStockValueFormatted}. ${result.highRisk} items are high risk. Check the Alerts page for details.`
          );
          return;
        }

        // --- Alerts / risk / dead stock ---
        if (lastMessage.includes("alert") || lastMessage.includes("risk") || lastMessage.includes("dead stock")) {
          send({ type: "thinking", text: "Loading dead stock alerts..." });
          const result = await executeWithStream("get_alerts", {}, send, role, trace, userZone);
          const alerts = unwrapItems(result);

          if (alerts.length === 0) {
            sendText("No alerts found. Try scanning your inventory first.");
            return;
          }
          const top5 = alerts.slice(0, 5);
          const lines = top5.map(
            (a: any, i: number) => `${i + 1}. **${a.productName}** -- ${a.riskLevel} risk, ${a.stockValueFormatted}, ${a.daysSinceLastSale} days idle`
          );
          sendText(`Found ${alerts.length} at-risk items. Here are the top ones:\n\n${lines.join("\n")}\n\nWant me to generate a recommendation for any of these?`);
          return;
        }

        // --- Campaign + send ---
        if (lastMessage.includes("campaign") && (lastMessage.includes("send") || lastMessage.includes("dispatch"))) {
          send({ type: "thinking", text: "Sending campaign..." });
          const rawCampaigns = await executeWithStream("get_campaigns", {}, send, role, trace, userZone);
          const campaigns = unwrapItems(rawCampaigns);

          if (campaigns.length === 0) {
            sendText("No campaigns found. Generate a recommendation first to create one.");
            return;
          }
          const draft = campaigns.find((c: any) => c.status === "draft");
          if (!draft) {
            sendText("All campaigns have already been sent!");
            return;
          }
          const result = await executeWithStream("send_campaign", { campaign_id: draft.id }, send, role, trace, userZone) as any;
          const cards = await getCampaignCards([draft.id]);
          const waMsg = cards[0]?.whatsappMessage;

          sendText(`Campaign for **${draft.productName}** sent to retailers! ${result.message}`);
          sendCampaigns(cards);
          if (waMsg) {
            send({ type: "whatsapp", messages: [waMsg] });
          }
          return;
        }

        // --- Show posters / ads ---
        if (
          (lastMessage.includes("show") && (lastMessage.includes("ad") || lastMessage.includes("poster") || lastMessage.includes("pic") || lastMessage.includes("creative"))) ||
          lastMessage.includes("view poster") ||
          lastMessage.includes("see the poster")
        ) {
          send({ type: "thinking", text: "Loading campaign posters..." });
          const allCampaigns = await prisma.campaign.findMany({
            where: { posterUrl: { not: "" } },
            orderBy: { createdAt: "desc" },
            take: 5,
          });

          if (allCampaigns.length === 0) {
            sendText("No campaign posters found yet. Generate some recommendations first!");
            return;
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

          sendText(`Here are your campaign posters:\n\n${lines.join("\n")}`);
          sendCampaigns(cards);
          return;
        }

        // --- Campaigns list ---
        if (lastMessage.includes("campaign")) {
          send({ type: "thinking", text: "Loading campaigns..." });
          const rawResult = await executeWithStream("get_campaigns", {}, send, role, trace, userZone);
          const campaigns = unwrapItems(rawResult);

          if (campaigns.length === 0) {
            sendText("No campaigns yet. Scan inventory and generate recommendations to create campaigns.");
            return;
          }
          const campaignIds = campaigns.slice(0, 5).map((c: any) => c.id);
          const cards = await getCampaignCards(campaignIds);
          const lines = campaigns.slice(0, 5).map(
            (c: any, i: number) => `${i + 1}. **${c.productName}** -- ${c.status}${c.sentAt ? " (sent)" : ""}`
          );

          sendText(`You have ${campaigns.length} campaigns:\n\n${lines.join("\n")}\n\nWant me to send any draft campaigns?`);
          sendCampaigns(cards);
          return;
        }

        // --- Recommend / action / fix ---
        if (lastMessage.includes("recommend") || lastMessage.includes("action") || lastMessage.includes("fix")) {
          send({ type: "thinking", text: "Generating recommendations..." });
          const rawAlerts = await executeWithStream("get_alerts", {}, send, role, trace, userZone);
          const alerts = unwrapItems(rawAlerts);

          if (alerts.length === 0) {
            sendText("No alerts to act on. Scan your inventory first.");
            return;
          }
          const first = alerts[0];
          const result = await executeWithStream(
            "generate_recommendation",
            { alert_id: first.id },
            send,
            role,
            trace,
            userZone,
          ) as any;

          if (result.error) {
            sendText(`Error: ${result.error}`);
            return;
          }
          sendText(
            `Generated a recommendation for **${first.productName}**! ${result.headline || "Campaign created with WhatsApp message and poster."} Check the Campaigns page to review and send.`
          );
          return;
        }

        // --- Network / zone / retailer ---
        if (lastMessage.includes("network") || lastMessage.includes("zone") || lastMessage.includes("retailer")) {
          send({ type: "thinking", text: "Loading network overview..." });
          const result = await executeWithStream("get_network_overview", {}, send, role, trace, userZone) as any;

          if (result.error) {
            sendText(result.error);
            return;
          }
          const zoneLines = result.zones.slice(0, 5).map(
            (z: any) => `- **${z.name}** (${z.code}): ${z.retailerCount} retailers, ${z.deadStockValueFormatted} dead stock`
          );
          sendText(`Your network: ${result.totalZones} zones, ${result.totalRetailers} retailers.\n\n${zoneLines.join("\n")}`);
          return;
        }

        // --- Dashboard / summary / overview ---
        if (lastMessage.includes("dashboard") || lastMessage.includes("summary") || lastMessage.includes("overview") || lastMessage.includes("how") || lastMessage.includes("status")) {
          send({ type: "thinking", text: "Loading dashboard..." });
          const result = await executeWithStream("get_dashboard_summary", {}, send, role, trace, userZone) as any;

          if (result.error) {
            sendText(result.error);
            return;
          }
          sendText(
            `Here's your overview, ${result.ownerName}:\n\n- Dead stock: **${result.deadStockValueFormatted}** across ${result.atRiskSkus} SKUs (${result.highRiskSkus} high risk)\n- Active campaigns: ${result.activeCampaigns}\n- Pending recommendations: ${result.pendingRecommendations}\n- Zones: ${result.totalZones}\n\nWhat would you like to do? I can scan inventory, show alerts, or create campaigns.`
          );
          return;
        }

        // --- Default help ---
        sendText(
          "I can help you with:\n\n- **Scan inventory** for dead stock\n- **View alerts** and at-risk items\n- **Generate recommendations** and campaigns\n- **Send campaigns** to retailers\n- **View network** overview\n- **Dashboard summary**\n\nWhat would you like to do?"
        );
      } catch (error) {
        console.error("Stream chat error:", error);
        send({ type: "error", message: "Something went wrong. Please try again." });
      } finally {
        send({ type: "done", total_ms: Date.now() - startTime });
        await flushLangfuse().catch(() => {});
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
