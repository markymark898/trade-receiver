import { Router } from "express";
import { db, tradesTable, signalsTable } from "@workspace/db";
import { desc, asc } from "drizzle-orm";
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
// Max number of non-buy/sell signals for the same ticker seen between an open buy
// and a sell before the buy is considered "stale" and discarded.
const STALE_INTERRUPTION_THRESHOLD = 5;

async function computeSignalPnL(defaultQty: number) {
  // Query ALL signals so we can count interruptions between buy/sell pairs
  const signals = await db
    .select({
      id: signalsTable.id,
      ticker: signalsTable.ticker,
      action: signalsTable.action,
      price: signalsTable.price,
      receivedAt: signalsTable.receivedAt,
    })
    .from(signalsTable)
    .orderBy(asc(signalsTable.receivedAt));

  // Per-ticker: open buy price + count of non-buy/sell signals seen for that ticker since the buy.
  // If interruptions exceed threshold the buy is stale and discarded.
  const openBuys = new Map<string, { price: number; interruptions: number }>();

  const pairs: { pl: number; plPct: number }[] = [];

  for (const sig of signals) {
    const action = sig.action.toLowerCase();
    const ticker = sig.ticker;

    if (action === "buy" && sig.price != null) {
      // New buy opens (or re-enters) the position — reset interruption counter
      openBuys.set(ticker, { price: Number(sig.price), interruptions: 0 });

    } else if (action === "sell" && sig.price != null) {
      const open = openBuys.get(ticker);
      if (open != null) {
        const price = Number(sig.price);
        const pl = (price - open.price) * defaultQty;
        const plPct = open.price > 0 ? ((price - open.price) / open.price) * 100 : 0;
        pairs.push({ pl, plPct });
        openBuys.delete(ticker); // position closed
      }

    } else {
      // Non-buy/sell signal for this ticker — count as an interruption
      const open = openBuys.get(ticker);
      if (open != null) {
        const next = open.interruptions + 1;
        if (next > STALE_INTERRUPTION_THRESHOLD) {
          openBuys.delete(ticker); // position went stale — too many other signals
        } else {
          openBuys.set(ticker, { ...open, interruptions: next });
        }
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
