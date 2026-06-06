import { db, executionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../logger";
import type { BrokerOrderOpts, BrokerOrderResult } from "./types";

const RH_MCP_URL = "https://agent.robinhood.com/mcp/trading";
const MCP_PROTOCOL_VERSION = "2024-11-05";

interface McpJsonRpcResult {
  jsonrpc: string;
  id: number;
  result?: unknown;
  error?: { code: number; message: string };
}

async function mcpPost(
  token: string,
  sessionId: string | null,
  payload: Record<string, unknown>,
): Promise<{ data: McpJsonRpcResult; sessionId: string | null }> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`,
  };
  if (sessionId) headers["Mcp-Session-Id"] = sessionId;

  const res = await fetch(RH_MCP_URL, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  const newSession = res.headers.get("Mcp-Session-Id") ?? sessionId;
  const data = await res.json().catch(() => null) as McpJsonRpcResult;
  return { data, sessionId: newSession };
}

export async function placeRobinhoodOrder(
  opts: BrokerOrderOpts,
  bearerToken: string,
): Promise<BrokerOrderResult> {
  const side = opts.action.toLowerCase().includes("sell") ? "sell" : "buy";

  const [execution] = await db.insert(executionsTable).values({
    signalId: opts.signalId,
    broker: "robinhood",
    status: "pending",
    orderType: opts.orderType,
    side: side.toUpperCase(),
    quantity: String(opts.quantity),
    limitPrice: opts.orderType === "LIMIT" && opts.price != null ? String(opts.price) : null,
  }).returning();

  try {
    // Step 1: Initialize MCP session
    const initPayload = {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: MCP_PROTOCOL_VERSION,
        capabilities: {},
        clientInfo: { name: "trade-receiver", version: "1.0" },
      },
    };
    const { data: initData, sessionId } = await mcpPost(bearerToken, null, initPayload);

    if (initData?.error) {
      throw new Error(`MCP init error: ${initData.error.message}`);
    }

    // Step 2: Call place_order tool
    const orderArgs: Record<string, unknown> = {
      symbol: opts.ticker,
      side,
      quantity: opts.quantity,
      order_type: opts.orderType.toLowerCase(),
      time_in_force: opts.timeInForce.toLowerCase(),
    };
    if (opts.orderType === "LIMIT" && opts.price != null) {
      orderArgs["limit_price"] = opts.price;
    }

    const callPayload = {
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: {
        name: "place_order",
        arguments: orderArgs,
      },
    };
    const { data: callData } = await mcpPost(bearerToken, sessionId, callPayload);

    if (callData?.error) {
      throw new Error(`MCP tool error: ${callData.error.message}`);
    }

    const result = callData?.result as Record<string, unknown> | undefined;
    const fillPrice = extractFillPrice(result);

    await db.update(executionsTable)
      .set({ status: "submitted", responseRaw: result as never, updatedAt: new Date() })
      .where(eq(executionsTable.id, execution!.id));

    return { broker: "robinhood", fillPrice, orderId: null };

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await db.update(executionsTable)
      .set({ status: "failed", errorMessage: msg, updatedAt: new Date() })
      .where(eq(executionsTable.id, execution!.id));
    logger.error({ signalId: opts.signalId, err: msg }, "Robinhood MCP order error");
    return { broker: "robinhood", fillPrice: null, orderId: null };
  }
}

function extractFillPrice(result: Record<string, unknown> | undefined): string | null {
  if (!result) return null;
  for (const key of ["fill_price", "average_price", "averagePrice", "price", "filled_at_price"]) {
    const v = result[key];
    if (v != null && v !== "" && !isNaN(Number(v))) return String(v);
  }
  // Check inside content array (MCP tool results wrap in content)
  const content = result["content"];
  if (Array.isArray(content)) {
    for (const item of content) {
      if (item && typeof item === "object") {
        const text = (item as Record<string, unknown>)["text"];
        if (typeof text === "string") {
          const match = text.match(/fill(?:ed)?\s*(?:price|at)[:\s]+\$?([\d.]+)/i);
          if (match) return match[1] ?? null;
        }
      }
    }
  }
  return null;
}
