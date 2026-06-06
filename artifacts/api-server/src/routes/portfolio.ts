import { Router, type IRouter } from "express";
import { getSettings } from "../lib/public-com";

const PUBLIC_API_BASE = "https://api.public.com";

const router: IRouter = Router();

router.get("/portfolio", async (req, res) => {
  const settings = await getSettings();

  if (!settings?.publicApiToken || !settings.publicAccountId) {
    res.json({ connected: false, error: "No API credentials configured" });
    return;
  }

  try {
    const r = await fetch(
      `${PUBLIC_API_BASE}/userapigateway/trading/${settings.publicAccountId}/portfolio/v2`,
      { headers: { Authorization: `Bearer ${settings.publicApiToken}` } }
    );

    const data = await r.json().catch(() => null) as Record<string, unknown> | null;

    if (!r.ok || !data) {
      const msg = (data?.["message"] as string) ?? (data?.["error"] as string) ?? `HTTP ${r.status}`;
      res.json({ connected: false, error: msg });
      return;
    }

    const bp = data["buyingPower"] as Record<string, string> | null;
    const rawPositions = (data["positions"] as unknown[]) ?? [];

    const positions = rawPositions.map((p) => {
      const pos = p as Record<string, unknown>;
      const instrument = pos["instrument"] as Record<string, string> | null;
      return {
        symbol: instrument?.["symbol"] ?? "UNKNOWN",
        type: instrument?.["type"] ?? "EQUITY",
        quantity: String(pos["quantity"] ?? "0"),
        currentValue: pos["currentValue"] != null ? String(pos["currentValue"]) : null,
        averageCost: pos["averageCost"] != null ? String(pos["averageCost"]) : null,
        unrealizedPnl: pos["unrealizedPnl"] != null ? String(pos["unrealizedPnl"]) : null,
        unrealizedPnlPercent: pos["unrealizedPnlPercent"] != null ? String(pos["unrealizedPnlPercent"]) : null,
      };
    });

    res.json({
      connected: true,
      accountId: settings.publicAccountId,
      accountType: (data["accountType"] as string) ?? null,
      buyingPower: bp?.["buyingPower"] ?? null,
      cashOnlyBuyingPower: bp?.["cashOnlyBuyingPower"] ?? null,
      totalValue: data["totalValue"] != null ? String(data["totalValue"]) : null,
      positions,
    });
  } catch (err) {
    req.log.error({ err }, "Portfolio fetch failed");
    res.json({ connected: false, error: err instanceof Error ? err.message : String(err) });
  }
});

export default router;
