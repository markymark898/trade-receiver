import { Router } from "express";
import { db, strategiesTable, signalsTable } from "@workspace/db";
import { eq, asc, or, ilike } from "drizzle-orm";
import { getSettings } from "../lib/public-com";
import { computeSignalPnLFromRows } from "./trades";

const router = Router();

async function getStrategyStats(
  strategy: typeof strategiesTable.$inferSelect,
  startingCapital: number,
) {
  const signals = await db
    .select({
      action: signalsTable.action,
      price: signalsTable.price,
      ticker: signalsTable.ticker,
    })
    .from(signalsTable)
    .where(
      strategy.signalTag
        ? or(
            ilike(signalsTable.strategy, strategy.signalTag),
            strategy.ticker ? eq(signalsTable.ticker, strategy.ticker) : undefined,
          )
        : strategy.ticker
        ? eq(signalsTable.ticker, strategy.ticker)
        : undefined,
    )
    .orderBy(asc(signalsTable.receivedAt));

  const result = computeSignalPnLFromRows(
    signals.map((s) => ({ action: s.action, price: s.price, ticker: s.ticker })),
    startingCapital,
    strategy.ticker ?? null,
  );
  return {
    signalCount: signals.length,
    pairs: result.pairs,
    wins: result.wins,
    losses: result.losses,
    totalPnL: result.totalProfitLoss,
    finalCapital: result.finalCapital,
    winRate: result.winRate,
  };
}

router.get("/strategies", async (req, res) => {
  const [rows, settings] = await Promise.all([
    db.select().from(strategiesTable).orderBy(asc(strategiesTable.createdAt)),
    getSettings(),
  ]);
  const startingCapital = Number(settings?.startingCapital ?? "10000");
  const withStats = await Promise.all(
    rows.map(async (s) => ({ ...formatStrategy(s), stats: await getStrategyStats(s, startingCapital) }))
  );
  res.json(withStats);
});

router.post("/strategies", async (req, res) => {
  const body = req.body as {
    name: string;
    description?: string;
    ticker?: string;
    signalTag?: string;
    pineScript?: string;
    alertMessageTemplate?: string;
  };
  if (!body.name?.trim()) { res.status(400).json({ error: "name is required" }); return; }
  const [row] = await db.insert(strategiesTable).values({
    name: body.name.trim(),
    description: body.description ?? null,
    ticker: body.ticker?.trim().toUpperCase() || null,
    signalTag: body.signalTag?.trim() || null,
    pineScript: body.pineScript ?? null,
    alertMessageTemplate: body.alertMessageTemplate ?? null,
  }).returning();
  res.status(201).json(formatStrategy(row!));
});

router.get("/strategies/:id", async (req, res) => {
  const id = parseInt(req.params.id ?? "", 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [[row], settings] = await Promise.all([
    db.select().from(strategiesTable).where(eq(strategiesTable.id, id)),
    getSettings(),
  ]);
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  const startingCapital = Number(settings?.startingCapital ?? "10000");
  const stats = await getStrategyStats(row, startingCapital);
  res.json({ ...formatStrategy(row), stats });
});

router.put("/strategies/:id", async (req, res) => {
  const id = parseInt(req.params.id ?? "", 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const body = req.body as {
    name?: string;
    description?: string | null;
    ticker?: string | null;
    signalTag?: string | null;
    pineScript?: string | null;
    alertMessageTemplate?: string | null;
  };
  const [row] = await db
    .update(strategiesTable)
    .set({
      ...(body.name !== undefined ? { name: body.name.trim() } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(body.ticker !== undefined ? { ticker: body.ticker?.trim().toUpperCase() || null } : {}),
      ...(body.signalTag !== undefined ? { signalTag: body.signalTag?.trim() || null } : {}),
      ...(body.pineScript !== undefined ? { pineScript: body.pineScript } : {}),
      ...(body.alertMessageTemplate !== undefined ? { alertMessageTemplate: body.alertMessageTemplate } : {}),
      updatedAt: new Date(),
    })
    .where(eq(strategiesTable.id, id))
    .returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(formatStrategy(row));
});

router.delete("/strategies/:id", async (req, res) => {
  const id = parseInt(req.params.id ?? "", 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(strategiesTable).where(eq(strategiesTable.id, id));
  res.json({ ok: true });
});

function formatStrategy(s: typeof strategiesTable.$inferSelect) {
  return {
    id: s.id,
    name: s.name,
    description: s.description ?? null,
    ticker: s.ticker ?? null,
    signalTag: s.signalTag ?? null,
    pineScript: s.pineScript ?? null,
    alertMessageTemplate: s.alertMessageTemplate ?? null,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  };
}

export default router;
