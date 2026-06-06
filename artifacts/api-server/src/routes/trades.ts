import { Router } from "express";
import { db, tradesTable } from "@workspace/db";
import { desc, eq, sql } from "drizzle-orm";

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
    openedAt: t.openedAt.toISOString(),
    closedAt: t.closedAt ? t.closedAt.toISOString() : null,
  };
}

router.get("/trades/stats", async (_req, res) => {
  const rows = await db.select().from(tradesTable);

  const closed = rows.filter((r) => r.status === "closed");
  const open = rows.filter((r) => r.status === "open");
  const wins = closed.filter((r) => r.profitLoss != null && Number(r.profitLoss) > 0);
  const losses = closed.filter((r) => r.profitLoss != null && Number(r.profitLoss) <= 0);
  const totalPnL = closed.reduce((sum, r) => sum + (r.profitLoss != null ? Number(r.profitLoss) : 0), 0);

  res.json({
    totalTrades: rows.length,
    openTrades: open.length,
    closedTrades: closed.length,
    wins: wins.length,
    losses: losses.length,
    totalProfitLoss: totalPnL.toFixed(2),
    winRate: closed.length > 0 ? Math.round((wins.length / closed.length) * 100) : 0,
  });
});

router.get("/trades", async (req, res) => {
  const limit = Math.min(parseInt(String(req.query["limit"] ?? "50"), 10), 200);
  const rows = await db.select().from(tradesTable).orderBy(desc(tradesTable.openedAt)).limit(limit);
  res.json(rows.map(formatTrade));
});

export { formatTrade };
export default router;
