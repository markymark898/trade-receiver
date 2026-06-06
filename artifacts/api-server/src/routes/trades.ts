import { Router } from "express";
import { db, tradesTable } from "@workspace/db";
import { desc } from "drizzle-orm";

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

router.get("/trades/stats", async (_req, res) => {
  const rows = await db.select().from(tradesTable);

  const closed = rows.filter((r) => r.status === "closed");
  const open = rows.filter((r) => r.status === "open");

  // Signal-based P&L (indicator prices)
  const signalWins = closed.filter((r) => r.profitLoss != null && Number(r.profitLoss) > 0);
  const signalLosses = closed.filter((r) => r.profitLoss != null && Number(r.profitLoss) <= 0);
  const signalTotalPnL = closed.reduce((sum, r) => sum + (r.profitLoss != null ? Number(r.profitLoss) : 0), 0);

  // Actual brokerage P&L (actual fill prices — only count trades where we have actual data)
  const withActual = closed.filter((r) => r.actualProfitLoss != null);
  const actualWins = withActual.filter((r) => Number(r.actualProfitLoss) > 0);
  const actualLosses = withActual.filter((r) => Number(r.actualProfitLoss) <= 0);
  const actualTotalPnL = withActual.reduce((sum, r) => sum + Number(r.actualProfitLoss), 0);

  res.json({
    totalTrades: rows.length,
    openTrades: open.length,
    closedTrades: closed.length,
    // Signal P&L
    wins: signalWins.length,
    losses: signalLosses.length,
    totalProfitLoss: signalTotalPnL.toFixed(2),
    winRate: closed.length > 0 ? Math.round((signalWins.length / closed.length) * 100) : 0,
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
