import { Router } from "express";
import { db, signalsTable } from "@workspace/db";
import { desc, eq, sql, or, like } from "drizzle-orm";
import { ListSignalsQueryParams } from "@workspace/api-zod";

const router = Router();

router.get("/signals/stats", async (req, res) => {
  const totalResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(signalsTable);
  const total = totalResult[0]?.count ?? 0;

  const buysResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(signalsTable)
    .where(
      or(
        eq(signalsTable.action, "buy"),
        eq(signalsTable.action, "buy_long"),
        like(signalsTable.action, "%buy%"),
      ),
    );
  const buys = buysResult[0]?.count ?? 0;

  const sellsResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(signalsTable)
    .where(
      or(
        eq(signalsTable.action, "sell"),
        eq(signalsTable.action, "sell_short"),
        like(signalsTable.action, "%sell%"),
      ),
    );
  const sells = sellsResult[0]?.count ?? 0;

  const lastResult = await db
    .select({ receivedAt: signalsTable.receivedAt })
    .from(signalsTable)
    .orderBy(desc(signalsTable.receivedAt))
    .limit(1);
  const lastSignalAt = lastResult[0]?.receivedAt?.toISOString() ?? null;

  const tickerRows = await db
    .select({
      ticker: signalsTable.ticker,
      count: sql<number>`count(*)::int`,
    })
    .from(signalsTable)
    .groupBy(signalsTable.ticker)
    .orderBy(desc(sql`count(*)`))
    .limit(10);

  res.json({
    total,
    buys,
    sells,
    lastSignalAt,
    tickerBreakdown: tickerRows,
  });
});

router.get("/signals", async (req, res) => {
  const parsed = ListSignalsQueryParams.safeParse(req.query);
  const limit = parsed.success && parsed.data.limit ? parsed.data.limit : 50;
  const actionFilter = parsed.success ? parsed.data.action : undefined;

  const query = db
    .select()
    .from(signalsTable)
    .orderBy(desc(signalsTable.receivedAt))
    .limit(limit);

  let rows;
  if (actionFilter) {
    rows = await db
      .select()
      .from(signalsTable)
      .where(eq(signalsTable.action, actionFilter))
      .orderBy(desc(signalsTable.receivedAt))
      .limit(limit);
  } else {
    rows = await query;
  }

  res.json(
    rows.map((s) => ({
      id: s.id,
      ticker: s.ticker,
      action: s.action,
      price: s.price != null ? Number(s.price) : null,
      quantity: s.quantity != null ? Number(s.quantity) : null,
      strategy: s.strategy,
      message: s.message,
      exchange: s.exchange,
      interval: s.interval,
      receivedAt: s.receivedAt.toISOString(),
      raw: s.raw,
    })),
  );
});

router.get("/signals/:id", async (req, res) => {
  const id = parseInt(req.params.id ?? "", 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [signal] = await db
    .select()
    .from(signalsTable)
    .where(eq(signalsTable.id, id))
    .limit(1);

  if (!signal) {
    res.status(404).json({ error: "Signal not found" });
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
