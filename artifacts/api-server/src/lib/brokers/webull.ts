import { db, executionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../logger";
import type { BrokerOrderOpts, BrokerOrderResult } from "./types";

// Webull OpenAPI — US production
// Docs: https://developer.webull.com/apis/docs/Trading-API
const WEBULL_BASE_URL = "https://openapi.webull.com";
const WEBULL_TOKEN_PATH = "/openapi/oauth2/v1/token";
const WEBULL_ORDER_PATH = "/openapi/v1/trading/orders";

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(appKey: string, appSecret: string): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 60_000) {
    return cachedToken.token;
  }

  const res = await fetch(`${WEBULL_BASE_URL}${WEBULL_TOKEN_PATH}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: appKey,
      client_secret: appSecret,
    }).toString(),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Webull token error HTTP ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = await res.json() as { access_token?: string; expires_in?: number };
  if (!data.access_token) throw new Error("Webull token response missing access_token");

  const expiresIn = (data.expires_in ?? 3600) * 1000;
  cachedToken = { token: data.access_token, expiresAt: now + expiresIn };
  return data.access_token;
}

export async function placeWebullOrder(
  opts: BrokerOrderOpts,
  appKey: string,
  appSecret: string,
  accountId: string | null,
): Promise<BrokerOrderResult> {
  const side = opts.action.toLowerCase().includes("sell") ? "SELL" : "BUY";

  const [execution] = await db.insert(executionsTable).values({
    signalId: opts.signalId,
    broker: "webull",
    status: "pending",
    orderType: opts.orderType,
    side,
    quantity: String(opts.quantity),
    limitPrice: opts.orderType === "LIMIT" && opts.price != null ? String(opts.price) : null,
  }).returning();

  try {
    const token = await getAccessToken(appKey, appSecret);

    const body: Record<string, unknown> = {
      symbol: opts.ticker,
      action: side,
      order_type: opts.orderType,
      qty: opts.quantity,
      time_in_force: opts.timeInForce,
    };
    if (accountId) body["account_id"] = accountId;
    if (opts.orderType === "LIMIT" && opts.price != null) {
      body["limit_price"] = String(opts.price);
    }

    const res = await fetch(`${WEBULL_BASE_URL}${WEBULL_ORDER_PATH}`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const responseJson = await res.json().catch(() => null) as Record<string, unknown> | null;

    if (res.ok) {
      const fillPrice = extractFillPrice(responseJson);
      await db.update(executionsTable)
        .set({ status: "submitted", responseRaw: responseJson as never, updatedAt: new Date() })
        .where(eq(executionsTable.id, execution!.id));
      return { broker: "webull", fillPrice, orderId: null };
    } else {
      const errMsg = (responseJson?.["message"] as string) ?? (responseJson?.["error"] as string) ?? `HTTP ${res.status}`;
      await db.update(executionsTable)
        .set({ status: "failed", errorMessage: errMsg, responseRaw: responseJson as never, updatedAt: new Date() })
        .where(eq(executionsTable.id, execution!.id));
      logger.error({ signalId: opts.signalId, status: res.status, error: errMsg }, "Webull order failed");
      return { broker: "webull", fillPrice: null, orderId: null };
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await db.update(executionsTable)
      .set({ status: "failed", errorMessage: msg, updatedAt: new Date() })
      .where(eq(executionsTable.id, execution!.id));
    logger.error({ signalId: opts.signalId, err: msg }, "Webull order error");
    return { broker: "webull", fillPrice: null, orderId: null };
  }
}

function extractFillPrice(resp: Record<string, unknown> | null): string | null {
  if (!resp) return null;
  for (const key of ["average_price", "averagePrice", "avg_price", "filled_price", "price"]) {
    const v = resp[key];
    if (v != null && v !== "" && !isNaN(Number(v))) return String(v);
  }
  return null;
}
