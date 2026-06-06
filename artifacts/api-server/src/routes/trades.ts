import { Router } from "express";
import { db, tradesTable, signalsTable } from "@workspace/db";
import { desc, asc, or, ilike } from "drizzle-orm";
import { getSettings } from "../lib/public-com";

const router = Router();

function formatTrade(t: typeof tradesTable.$inferSelect) {
  return {
    id: t.id,
    ticker: t.ticker,
    buySignalId: t.buySignalId,
    sellSignalId: t.sellSignalId,
    buyPrice: t.buyPrice,
    sellPrice: t.sellPrice,
    quantity: t.quantity,
    status: t.status,
    profitLoss: t.profitLoss,
    profitLossPct: t.profitLossPct,
    actualBuyPrice: t.actualBuyPrice,
    actualSellPrice: t.actualSellPrice,
    actualProfitLoss: t.actualProfitLoss,
    actualProfitLossPct: t.actualProfitLossPct,
    openedAt: t.openedAt.toISOString(),
    closedAt: t.closedAt ? t.closedAt.toISOString() : null,
  };
}

/**
 * Compute Indicator P&L by pairing buy/sell signals chronologically per ticker.
 * This uses all historical signals so it never misses pairs even if the
 * trades table wasn't around when those signals arrived.
 */
async function computeSignalPnL(defaultQty: number) {
  const signals = await db
    .select({
      id: signalsTable.id,
      ticker: signalsTable.ticker,
      action: signalsTable.action,
      price: signalsTable.price,
      receivedAt: signalsTable.receivedAt,
    })
    .from(signalsTable)
    .where(
      or(
        ilike(signalsTable.action, "%buy%"),
        ilike(signalsTable.action, "%sell%"),
      )
    )
    .orderBy(asc(signalsTable.receivedAt));

  // One open position per ticker — a new buy replaces the previous entry
  // (mirrors real single-position trading: you can't stack multiple open buys)
  const openBuys = new Map<string, number>(); // ticker → last buy price

  const pairs: { pl: number; plPct: number }[] = [];

  for (const sig of signals) {
    if (sig.price == null) continue;
    const price = Number(sig.price);
    const action = sig.action.toLowerCase();
    const ticker = sig.ticker;

    if (action.includes("buy")) {
      // New buy opens (or re-enters) the position at this price
      openBuys.set(ticker, price);
    } else if (action.includes("sell")) {
      const buyPrice = openBuys.get(ticker);
      if (buyPrice != null) {
        const pl = (price - buyPrice) * defaultQty;
        const plPct = buyPrice > 0 ? ((price - buyPrice) / buyPrice) * 100 : 0;
        pairs.push({ pl, plPct });
        openBuys.delete(ticker); // position closed
      }
    }
  }

  const wins = pairs.filter((p) => p.pl > 0).length;
  const losses = pairs.filter((p) => p.pl <= 0).length;
  const totalPl = pairs.reduce((sum, p) => sum + p.pl, 0);

  return {
    pairs: pairs.length,
    wins,
    losses,
    totalProfitLoss: totalPl.toFixed(2),
    winRate: pairs.length > 0 ? Math.round((wins / pairs.length) * 100) : 0,
  };
}

router.get("/trades/stats", async (_req, res) => {
  const [settings, rows] = await Promise.all([
    getSettings(),
    db.select().from(tradesTable),
  ]);

  const defaultQty = Number(settings?.defaultQuantity ?? "1") * Number(settings?.buyFraction ?? "1");

  // Indicator P&L — computed directly from all signal buy/sell pairs
  const signalPnL = await computeSignalPnL(defaultQty);

  // Brokerage P&L — from actual fill prices in closed trades
  const closed = rows.filter((r) => r.status === "closed");
  const open = rows.filter((r) => r.status === "open");
  const withActual = closed.filter((r) => r.actualProfitLoss != null);
  const actualWins = withActual.filter((r) => Number(r.actualProfitLoss) > 0);
  const actualLosses = withActual.filter((r) => Number(r.actualProfitLoss) <= 0);
  const actualTotalPnL = withActual.reduce((sum, r) => sum + Number(r.actualProfitLoss), 0);

  res.json({
    totalTrades: rows.length,
    openTrades: open.length,
    closedTrades: closed.length,
    // Indicator P&L (from signal pairs)
    wins: signalPnL.wins,
    losses: signalPnL.losses,
    totalProfitLoss: signalPnL.totalProfitLoss,
    winRate: signalPnL.winRate,
    signalPairs: signalPnL.pairs,
    // Actual brokerage P&L
    actualWins: actualWins.length,
    actualLosses: actualLosses.length,
    actualTotalProfitLoss: actualTotalPnL.toFixed(2),
    actualWinRate: withActual.length > 0 ? Math.round((actualWins.length / withActual.length) * 100) : 0,
    actualTradesTracked: withActual.length,
  });
});

router.get("/trades", async (req, res) => {
  const limit = Math.min(parseInt(String(req.query["limit"] ?? "50"), 10), 200);
  const rows = await db.select().from(tradesTable).orderBy(desc(tradesTable.openedAt)).limit(limit);
  res.json(rows.map(formatTrade));
});

export { formatTrade };
export default router;
