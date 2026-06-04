import { Router } from "express";
import { db, signalsTable } from "@workspace/db";

const router = Router();

function parseBody(req: { body: unknown; headers: Record<string, string | string[] | undefined> }): Record<string, unknown> {
  const body = req.body;
  if (body && typeof body === "object" && !Array.isArray(body)) {
    return body as Record<string, unknown>;
  }
  if (typeof body === "string") {
    try {
      const parsed = JSON.parse(body) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      // not JSON
    }
    return { message: body };
  }
  return {};
}

function toNum(v: unknown): string | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return isNaN(n) ? null : String(n);
}

function toStr(v: unknown): string | null {
  if (v == null || v === "") return null;
  return String(v);
}

router.post("/webhook/tradingview", async (req, res) => {
  const raw = parseBody({ body: req.body, headers: req.headers as Record<string, string | string[] | undefined> });

  const ticker = toStr(raw["ticker"]) ?? "UNKNOWN";
  const action = toStr(raw["action"]) ?? "unknown";

  const [signal] = await db
    .insert(signalsTable)
    .values({
      ticker,
      action,
      price: toNum(raw["price"] ?? raw["close"]),
      open: toNum(raw["open"]),
      high: toNum(raw["high"]),
      low: toNum(raw["low"]),
      volume: toNum(raw["volume"]),
      quantity: toNum(raw["quantity"] ?? raw["contracts"]),
      strategy: toStr(raw["strategy"]),
      message: toStr(raw["message"]),
      exchange: toStr(raw["exchange"]),
      interval: toStr(raw["interval"]),
      currency: toStr(raw["currency"]),
      basecurrency: toStr(raw["basecurrency"]),
      alertTime: toStr(raw["time"]),
      timenow: toStr(raw["timenow"]),
      positionSize: toNum(raw["position_size"]),
      orderPrice: toNum(raw["order_price"]),
      orderId: toStr(raw["order_id"]),
      orderComment: toStr(raw["order_comment"]),
      raw,
    })
    .returning();

  if (!signal) {
    res.status(500).json({ error: "Failed to store signal" });
    return;
  }

  res.json(formatSignal(signal));
});

export function formatSignal(s: typeof signalsTable.$inferSelect) {
  return {
    id: s.id,
    ticker: s.ticker,
    action: s.action,
    price: s.price != null ? Number(s.price) : null,
    open: s.open != null ? Number(s.open) : null,
    high: s.high != null ? Number(s.high) : null,
    low: s.low != null ? Number(s.low) : null,
    volume: s.volume != null ? Number(s.volume) : null,
    quantity: s.quantity != null ? Number(s.quantity) : null,
    strategy: s.strategy,
    message: s.message,
    exchange: s.exchange,
    interval: s.interval,
    currency: s.currency,
    basecurrency: s.basecurrency,
    alertTime: s.alertTime,
    timenow: s.timenow,
    positionSize: s.positionSize != null ? Number(s.positionSize) : null,
    orderPrice: s.orderPrice != null ? Number(s.orderPrice) : null,
    orderId: s.orderId,
    orderComment: s.orderComment,
    receivedAt: s.receivedAt.toISOString(),
    raw: s.raw,
  };
}

export default router;
