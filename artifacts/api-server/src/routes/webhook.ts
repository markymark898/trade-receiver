import { Router } from "express";
import { db, signalsTable, tradesTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { placeOrderForSignal, getSettings } from "../lib/public-com";

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
  const price = toNum(raw["price"] ?? raw["close"]);

  const [signal] = await db
    .insert(signalsTable)
    .values({
      ticker,
      action,
      price,
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

  // Fire-and-forget: track trade + place order
  trackTradeAndPlaceOrder(signal.id, ticker, action, price).catch(() => {/* errors logged inside */});
});

async function trackTradeAndPlaceOrder(
  signalId: number,
  ticker: string,
  action: string,
  priceStr: string | null,
) {
  const settings = await getSettings();
  const isBuy = action.toLowerCase().includes("buy");
  const isSell = action.toLowerCase().includes("sell");
  const price = priceStr != null ? Number(priceStr) : null;

  if (isBuy && price != null) {
    const defaultQty = Number(settings?.defaultQuantity ?? "1");
    const fraction = Number(settings?.buyFraction ?? "1");
    const qty = Math.max(0.001, defaultQty * fraction);

    const [trade] = await db.insert(tradesTable).values({
      ticker,
      buySignalId: signalId,
      buyPrice: String(price),
      quantity: String(qty),
      status: "open",
    }).returning();

    const { fillPrice } = await placeOrderForSignal(signalId, { ticker, action, price, quantity: qty });

    // Store the actual fill price from the brokerage if we got one
    if (trade && fillPrice != null) {
      await db.update(tradesTable)
        .set({ actualBuyPrice: fillPrice })
        .where(eq(tradesTable.id, trade.id));
    }

  } else if (isSell) {
    const [openTrade] = await db
      .select()
      .from(tradesTable)
      .where(and(eq(tradesTable.ticker, ticker), eq(tradesTable.status, "open")))
      .orderBy(desc(tradesTable.openedAt))
      .limit(1);

    if (openTrade && price != null) {
      const buyPrice = Number(openTrade.buyPrice ?? 0);
      const qty = Number(openTrade.quantity);
      const pl = (price - buyPrice) * qty;
      const plPct = buyPrice > 0 ? ((price - buyPrice) / buyPrice) * 100 : 0;

      // Never-sell-at-loss guard
      if (settings?.neverSellAtLoss && pl < 0) {
        return;
      }

      // Compute signal-based P&L
      const updates: Partial<typeof tradesTable.$inferInsert> = {
        sellSignalId: signalId,
        sellPrice: String(price),
        status: "closed",
        profitLoss: pl.toFixed(4),
        profitLossPct: plPct.toFixed(4),
        closedAt: new Date(),
      };

      await db.update(tradesTable).set(updates).where(eq(tradesTable.id, openTrade.id));

      const { fillPrice } = await placeOrderForSignal(signalId, { ticker, action, price, quantity: qty });

      // Compute actual (brokerage) P&L if we have both actual prices
      if (fillPrice != null) {
        const actualSell = Number(fillPrice);
        const actualBuy = openTrade.actualBuyPrice != null ? Number(openTrade.actualBuyPrice) : buyPrice;
        const actualPl = (actualSell - actualBuy) * qty;
        const actualPlPct = actualBuy > 0 ? ((actualSell - actualBuy) / actualBuy) * 100 : 0;

        await db.update(tradesTable)
          .set({
            actualSellPrice: fillPrice,
            actualProfitLoss: actualPl.toFixed(4),
            actualProfitLossPct: actualPlPct.toFixed(4),
          })
          .where(eq(tradesTable.id, openTrade.id));
      }

    } else if (!openTrade) {
      await placeOrderForSignal(signalId, { ticker, action, price, quantity: null });
    }
  }
}

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
