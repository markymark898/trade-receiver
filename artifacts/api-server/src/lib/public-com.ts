import { db, settingsTable, executionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { logger } from "./logger";

const PUBLIC_API_BASE = "https://api.public.com";

export async function getSettings() {
  const rows = await db.select().from(settingsTable).limit(1);
  const dbRow = rows[0] ?? null;

  const envToken = process.env["PUBLIC_API_KEY"] ?? null;
  const envAccountId = process.env["PUBLIC_ACCOUNT_ID"] ?? null;

  if (!envToken && !envAccountId) return dbRow;

  // Merge env vars as fallbacks — DB values take priority if set
  return {
    id: dbRow?.id ?? 0,
    publicApiToken: dbRow?.publicApiToken || envToken,
    publicAccountId: dbRow?.publicAccountId || envAccountId,
    orderType: dbRow?.orderType ?? "MARKET",
    instrumentType: dbRow?.instrumentType ?? "EQUITY",
    defaultQuantity: dbRow?.defaultQuantity ?? "1",
    timeInForce: dbRow?.timeInForce ?? "DAY",
    autoExecute: dbRow?.autoExecute ?? true,
    buyFraction: dbRow?.buyFraction ?? "1",
    neverSellAtLoss: dbRow?.neverSellAtLoss ?? false,
    updatedAt: dbRow?.updatedAt ?? new Date(),
  };
}

export async function placeOrderForSignal(signalId: number, opts: {
  ticker: string;
  action: string;
  price: number | null;
  quantity: number | null;
}) {
  const settings = await getSettings();

  if (!settings?.publicApiToken || !settings.publicAccountId) {
    await db.insert(executionsTable).values({
      signalId,
      status: "skipped",
      errorMessage: "Public.com API token or account ID not configured",
    });
    return;
  }

  if (!settings.autoExecute) {
    await db.insert(executionsTable).values({
      signalId,
      status: "skipped",
      errorMessage: "Auto-execute is disabled",
    });
    return;
  }

  const side = opts.action.toLowerCase().includes("sell") ? "SELL" : "BUY";
  const qty = String(opts.quantity ?? settings.defaultQuantity ?? "1");
  const orderType = settings.orderType ?? "MARKET";
  const limitPrice = orderType === "LIMIT" && opts.price ? String(opts.price) : undefined;
  const clientOrderId = randomUUID();

  const body: Record<string, unknown> = {
    orderId: clientOrderId,
    instrument: { symbol: opts.ticker, type: settings.instrumentType ?? "EQUITY" },
    side,
    type: orderType,
    quantity: qty,
    expiration: { timeInForce: settings.timeInForce ?? "DAY" },
  };
  if (limitPrice) body["limitPrice"] = limitPrice;

  const [execution] = await db.insert(executionsTable).values({
    signalId,
    status: "pending",
    orderType,
    side,
    quantity: qty,
    limitPrice: limitPrice ?? null,
    publicOrderId: clientOrderId,
  }).returning();

  try {
    const res = await fetch(
      `${PUBLIC_API_BASE}/userapigateway/trading/${settings.publicAccountId}/order`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${settings.publicApiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    const responseJson = await res.json().catch(() => null) as Record<string, unknown> | null;

    if (res.ok) {
      await db.update(executionsTable)
        .set({ status: "submitted", responseRaw: responseJson, updatedAt: new Date() })
        .where(eq(executionsTable.id, execution!.id));
    } else {
      const errMsg = (responseJson?.["message"] as string) ?? (responseJson?.["error"] as string) ?? `HTTP ${res.status}`;
      await db.update(executionsTable)
        .set({ status: "failed", errorMessage: errMsg, responseRaw: responseJson, updatedAt: new Date() })
        .where(eq(executionsTable.id, execution!.id));
      logger.error({ signalId, status: res.status, error: errMsg }, "Public.com order failed");
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await db.update(executionsTable)
      .set({ status: "failed", errorMessage: msg, updatedAt: new Date() })
      .where(eq(executionsTable.id, execution!.id));
    logger.error({ signalId, err: msg }, "Public.com order error");
  }
}
