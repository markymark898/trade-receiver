import { Router } from "express";
import { db, strategiesTable, signalsTable } from "@workspace/db";
import { eq, asc, or, ilike } from "drizzle-orm";

const router = Router();

const STALE_INTERRUPTION_THRESHOLD = 5;

function computePnL(signals: { action: string; price: string | null; ticker: string }[], ticker: string | null) {
  const openBuys = new Map<string, { price: number; interruptions: number }>();
  const pairs: { pl: number; plPct: number; win: boolean }[] = [];

  for (const sig of signals) {
    const action = sig.action.toLowerCase();
    const t = sig.ticker;
    if (ticker && t !== ticker) continue;

    if (action === "buy" && sig.price != null) {
      openBuys.set(t, { price: Number(sig.price), interruptions: 0 });
    } else if (action === "sell" && sig.price != null) {
      const open = openBuys.get(t);
      if (open != null) {
        const price = Number(sig.price);
        const pl = price - open.price;
        const plPct = open.price > 0 ? ((price - open.price) / open.price) * 100 : 0;
        pairs.push({ pl, plPct, win: pl > 0 });
        openBuys.delete(t);
      }
    } else {
      const open = openBuys.get(t);
      if (open != null) {
        const next = open.interruptions + 1;
        if (next > STALE_INTERRUPTION_THRESHOLD) {
          openBuys.delete(t);
        } else {
          openBuys.set(t, { ...open, interruptions: next });
        }
      }
    }
  }

  const wins = pairs.filter((p) => p.win).length;
  const losses = pairs.filter((p) => !p.win).length;
  const total = pairs.reduce((s, p) => s + p.pl, 0);
  const winRate = pairs.length > 0 ? Math.round((wins / pairs.length) * 100) : 0;

  return { pairs: pairs.length, wins, losses, totalPnL: total.toFixed(2), winRate };
}

async function getStrategyStats(strategy: typeof strategiesTable.$inferSelect) {
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

  const stats = computePnL(
    signals.map((s) => ({ action: s.action, price: s.price, ticker: s.ticker })),
    strategy.ticker ?? null,
  );
  return { signalCount: signals.length, ...stats };
}

router.get("/strategies", async (req, res) => {
  const rows = await db.select().from(strategiesTable).orderBy(asc(strategiesTable.createdAt));
  const withStats = await Promise.all(
    rows.map(async (s) => ({ ...formatStrategy(s), stats: await getStrategyStats(s) }))
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
  const [row] = await db.select().from(strategiesTable).where(eq(strategiesTable.id, id));
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  const stats = await getStrategyStats(row);
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
