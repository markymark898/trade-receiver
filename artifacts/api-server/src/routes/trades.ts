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

// Max non-buy/sell interruptions before a buy is considered stale
const STALE_INTERRUPTION_THRESHOLD = 5;

export type SignalRow = { ticker: string; action: string; price: string | null };

/**
 * Compute Indicator P&L using a paper-trading simulation:
 * - Start with `startingCapital`
 * - On buy: record capital and buy price
 * - On sell: pnl = capital * (sellPrice - buyPrice) / buyPrice; capital += pnl
 * - Stale buy protection: if >STALE_INTERRUPTION_THRESHOLD non-buy/sell signals
 *   for the same ticker arrive before the sell, the buy is discarded.
 *
 * If a ticker filter is provided, only signals with that ticker are evaluated.
 */
export function computeSignalPnLFromRows(
  signals: SignalRow[],
  startingCapital: number,
  tickerFilter?: string | null,
) {
  type OpenBuy = { capital: number; price: number; interruptions: number };
  const openBuys = new Map<string, OpenBuy>();
  const pairs: { pl: number; plPct: number }[] = [];
  let capital = startingCapital;

  for (const sig of signals) {
    const action = sig.action.toLowerCase();
    const ticker = sig.ticker;
    if (tickerFilter && ticker !== tickerFilter) continue;

    if (action === "buy" && sig.price != null) {
      openBuys.set(ticker, { capital, price: Number(sig.price), interruptions: 0 });
    } else if (action === "sell" && sig.price != null) {
      const open = openBuys.get(ticker);
      if (open != null) {
        const sellPrice = Number(sig.price);
        const plPct = open.price > 0 ? (sellPrice - open.price) / open.price : 0;
        const pl = open.capital * plPct;
        capital += pl;
        pairs.push({ pl, plPct: plPct * 100 });
        openBuys.delete(ticker);
      }
    } else {
      const open = openBuys.get(ticker);
      if (open != null) {
        const next = open.interruptions + 1;
        if (next > STALE_INTERRUPTION_THRESHOLD) {
          openBuys.delete(ticker);
        } else {
          openBuys.set(ticker, { ...open, interruptions: next });
        }
      }
    }
  }

  const wins = pairs.filter((p) => p.pl > 0).length;
  const losses = pairs.filter((p) => p.pl <= 0).length;
  const totalPl = capital - startingCapital;

  return {
    pairs: pairs.length,
    wins,
    losses,
    totalProfitLoss: totalPl.toFixed(2),
    finalCapital: capital.toFixed(2),
    winRate: pairs.length > 0 ? Math.round((wins / pairs.length) * 100) : 0,
  };
}

async function computeSignalPnL(startingCapital: number) {
  const signals = await db
    .select({
      ticker: signalsTable.ticker,
      action: signalsTable.action,
      price: signalsTable.price,
    })
    .from(signalsTable)
    .orderBy(asc(signalsTable.receivedAt));

  return computeSignalPnLFromRows(signals, startingCapital);
}

router.get("/trades/stats", async (_req, res) => {
  const [settings, rows] = await Promise.all([
    getSettings(),
    db.select().from(tradesTable),
  ]);

  const startingCapital = Number(settings?.startingCapital ?? "10000");

  // Indicator P&L — paper-trading simulation from signal buy/sell pairs
  const signalPnL = await computeSignalPnL(startingCapital);

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
    startingCapital: startingCapital.toFixed(2),
    // Indicator P&L (paper-trading from signal pairs)
    wins: signalPnL.wins,
    losses: signalPnL.losses,
    totalProfitLoss: signalPnL.totalProfitLoss,
    finalCapital: signalPnL.finalCapital,
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
