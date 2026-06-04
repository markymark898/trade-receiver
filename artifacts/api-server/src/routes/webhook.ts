import { Router } from "express";
import { db, signalsTable } from "@workspace/db";
import { ReceiveTradingViewWebhookBody } from "@workspace/api-zod";

const router = Router();

router.post("/webhook/tradingview", async (req, res) => {
  const parsed = ReceiveTradingViewWebhookBody.safeParse(req.body);

  const payload = parsed.success ? parsed.data : req.body;
  const raw = req.body as Record<string, unknown>;

  const ticker = (payload.ticker ?? raw["ticker"] ?? "UNKNOWN") as string;
  const action = (payload.action ?? raw["action"] ?? "unknown") as string;
  const price = payload.price != null ? String(payload.price) : null;
  const quantity = payload.quantity != null ? String(payload.quantity) : null;
  const strategy = (payload.strategy ?? null) as string | null;
  const message = (payload.message ?? null) as string | null;
  const exchange = (payload.exchange ?? null) as string | null;
  const interval = (payload.interval ?? null) as string | null;

  const [signal] = await db
    .insert(signalsTable)
    .values({
      ticker,
      action,
      price,
      quantity,
      strategy,
      message,
      exchange,
      interval,
      raw,
    })
    .returning();

  if (!signal) {
    res.status(500).json({ error: "Failed to store signal" });
    return;
  }

  res.json({
    id: signal.id,
    ticker: signal.ticker,
    action: signal.action,
    price: signal.price != null ? Number(signal.price) : null,
    quantity: signal.quantity != null ? Number(signal.quantity) : null,
    strategy: signal.strategy,
    message: signal.message,
    exchange: signal.exchange,
    interval: signal.interval,
    receivedAt: signal.receivedAt.toISOString(),
    raw: signal.raw,
  });
});

export default router;
