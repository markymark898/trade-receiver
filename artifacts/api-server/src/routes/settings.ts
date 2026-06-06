import { Router } from "express";
import { db, settingsTable, executionsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { getSettings } from "../lib/public-com";

const PUBLIC_API_BASE = "https://api.public.com";

const router = Router();

function buildSettingsResponse(s: Awaited<ReturnType<typeof getSettings>>) {
  return {
    publicAccountId: s?.publicAccountId ?? null,
    hasApiToken: !!(s?.publicApiToken),
    hasRobinhoodToken: !!(s?.robinhoodBearerToken),
    hasWebullKey: !!(s?.webullAppKey),
    webullAccountId: s?.webullAccountId ?? null,
    orderType: s?.orderType ?? "MARKET",
    instrumentType: s?.instrumentType ?? "EQUITY",
    defaultQuantity: s?.defaultQuantity ?? "1",
    timeInForce: s?.timeInForce ?? "DAY",
    autoExecute: s?.autoExecute ?? true,
    buyFraction: s?.buyFraction ?? "1",
    neverSellAtLoss: s?.neverSellAtLoss ?? false,
  };
}

router.get("/settings", async (_req, res) => {
  const s = await getSettings();
  res.json(buildSettingsResponse(s));
});

router.put("/settings", async (req, res) => {
  const body = req.body as {
    publicApiToken?: string | null;
    publicAccountId?: string | null;
    robinhoodBearerToken?: string | null;
    webullAppKey?: string | null;
    webullAppSecret?: string | null;
    webullAccountId?: string | null;
    orderType?: string;
    instrumentType?: string;
    defaultQuantity?: string;
    timeInForce?: string;
    autoExecute?: boolean;
    buyFraction?: string;
    neverSellAtLoss?: boolean;
  };

  const existing = await getSettings();

  const values: Record<string, unknown> = {
    publicAccountId: body.publicAccountId ?? existing?.publicAccountId ?? null,
    webullAccountId: body.webullAccountId ?? existing?.webullAccountId ?? null,
    orderType: body.orderType ?? existing?.orderType ?? "MARKET",
    instrumentType: body.instrumentType ?? existing?.instrumentType ?? "EQUITY",
    defaultQuantity: body.defaultQuantity ?? existing?.defaultQuantity ?? "1",
    timeInForce: body.timeInForce ?? existing?.timeInForce ?? "DAY",
    autoExecute: body.autoExecute ?? existing?.autoExecute ?? true,
    buyFraction: body.buyFraction ?? existing?.buyFraction ?? "1",
    neverSellAtLoss: body.neverSellAtLoss ?? existing?.neverSellAtLoss ?? false,
    updatedAt: new Date(),
  };

  // Only update token/key fields when explicitly provided (undefined = keep, null = clear, string = set)
  if (body.publicApiToken !== undefined) values["publicApiToken"] = body.publicApiToken || null;
  if (body.robinhoodBearerToken !== undefined) values["robinhoodBearerToken"] = body.robinhoodBearerToken || null;
  if (body.webullAppKey !== undefined) values["webullAppKey"] = body.webullAppKey || null;
  if (body.webullAppSecret !== undefined) values["webullAppSecret"] = body.webullAppSecret || null;

  let result;
  if (existing) {
    [result] = await db.update(settingsTable)
      .set(values as Partial<typeof settingsTable.$inferInsert>)
      .where(eq(settingsTable.id, existing.id))
      .returning();
  } else {
    [result] = await db.insert(settingsTable).values({
      ...(values as Partial<typeof settingsTable.$inferInsert>),
    }).returning();
  }

  res.json(buildSettingsResponse(result));
});

router.post("/settings/test-connection", async (req, res) => {
  const body = req.body as { publicApiToken?: string; publicAccountId?: string } | undefined;
  const s = await getSettings();

  const token = body?.publicApiToken || s?.publicApiToken;
  const accountId = body?.publicAccountId || s?.publicAccountId;

  if (!token || !accountId) {
    res.json({ ok: false, error: "API token and account ID are required" });
    return;
  }

  try {
    const r = await fetch(
      `${PUBLIC_API_BASE}/userapigateway/trading/${accountId}/portfolio/v2`,
      { headers: { "Authorization": `Bearer ${token}` } }
    );
    const data = await r.json().catch(() => null) as Record<string, unknown> | null;

    if (r.ok && data) {
      const bp = (data["buyingPower"] as Record<string, string> | null);
      res.json({
        ok: true,
        accountId: s?.publicAccountId,
        accountType: (data["accountType"] as string) ?? null,
        buyingPower: bp?.["buyingPower"] ?? null,
      });
    } else {
      const msg = (data?.["message"] as string) ?? (data?.["error"] as string) ?? `HTTP ${r.status}`;
      res.json({ ok: false, error: msg });
    }
  } catch (err) {
    res.json({ ok: false, error: err instanceof Error ? err.message : String(err) });
  }
});

router.get("/executions", async (req, res) => {
  const limit = parseInt(String(req.query["limit"] ?? "50"), 10);
  const rows = await db.select().from(executionsTable).orderBy(desc(executionsTable.createdAt)).limit(limit);
  res.json(rows.map(formatExecution));
});

router.get("/signals/:id/execution", async (req, res) => {
  const signalId = parseInt(req.params.id ?? "", 10);
  if (isNaN(signalId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [row] = await db.select().from(executionsTable)
    .where(eq(executionsTable.signalId, signalId))
    .orderBy(desc(executionsTable.createdAt))
    .limit(1);

  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(formatExecution(row));
});

function formatExecution(e: typeof executionsTable.$inferSelect) {
  return {
    id: e.id,
    signalId: e.signalId,
    broker: e.broker,
    status: e.status,
    publicOrderId: e.publicOrderId,
    orderType: e.orderType,
    side: e.side,
    quantity: e.quantity,
    limitPrice: e.limitPrice,
    errorMessage: e.errorMessage,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  };
}

export default router;
