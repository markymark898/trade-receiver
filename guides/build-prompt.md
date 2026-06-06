# Full Build Prompt — TradingView Signal Receiver + Public.com Trading Bot

Paste the contents of this file into your AI coding assistant (Replit Agent, Cursor, Claude Code, etc.) to build the complete application from scratch. The prompt is written in sections — you can paste the entire thing at once or one section at a time.

---

## MASTER PROMPT — PASTE THIS FIRST

```
Build a full-stack trading bot dashboard called "TRD_REQ_RCVR" using a pnpm monorepo on Node.js 24 and TypeScript 5.

The app does three things:
1. Receives TradingView webhook signals via a POST endpoint and stores them in PostgreSQL
2. Displays incoming signals in a live-updating React dashboard (auto-refreshes every 5 seconds)
3. Automatically executes trades on Public.com via their REST API when a signal arrives

Use this exact monorepo structure:
- lib/db              — shared Drizzle ORM + PostgreSQL database library
- lib/api-spec        — OpenAPI 3.1 spec + Orval codegen config
- lib/api-client-react — generated React Query hooks (do not edit manually)
- lib/api-zod         — generated Zod validation schemas (do not edit manually)
- artifacts/api-server — Express 5 backend, reads PORT from environment, logs with pino
- artifacts/trade-receiver — React 19 + Vite + Tailwind CSS + shadcn/ui frontend

Root package.json scripts:
  "typecheck:libs": "tsc --build"
  "typecheck": "pnpm run typecheck:libs && pnpm -r --filter ./artifacts/** --if-present run typecheck"

Strict TypeScript throughout. DATABASE_URL environment variable for the database connection.
Never use console.log in server code — use req.log in route handlers and a pino logger singleton elsewhere.
```

---

## SECTION 1 — DATABASE SCHEMA

```
Create the following Drizzle ORM schema files in lib/db/src/schema/:

--- FILE: lib/db/src/schema/signals.ts ---
import { pgTable, serial, text, numeric, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const signalsTable = pgTable("signals", {
  id: serial("id").primaryKey(),
  ticker: text("ticker").notNull(),
  action: text("action").notNull(),
  price: numeric("price"),
  open: numeric("open"),
  high: numeric("high"),
  low: numeric("low"),
  volume: numeric("volume"),
  quantity: numeric("quantity"),
  strategy: text("strategy"),
  message: text("message"),
  exchange: text("exchange"),
  interval: text("interval"),
  currency: text("currency"),
  basecurrency: text("basecurrency"),
  alertTime: text("alert_time"),
  timenow: text("timenow"),
  positionSize: numeric("position_size"),
  orderPrice: numeric("order_price"),
  orderId: text("order_id"),
  orderComment: text("order_comment"),
  raw: jsonb("raw").notNull(),
  receivedAt: timestamp("received_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertSignalSchema = createInsertSchema(signalsTable).omit({ id: true, receivedAt: true });
export type InsertSignal = z.infer<typeof insertSignalSchema>;
export type Signal = typeof signalsTable.$inferSelect;

--- FILE: lib/db/src/schema/settings.ts ---
import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const settingsTable = pgTable("settings", {
  id: serial("id").primaryKey(),
  publicApiToken: text("public_api_token"),
  publicAccountId: text("public_account_id"),
  orderType: text("order_type").notNull().default("MARKET"),
  instrumentType: text("instrument_type").notNull().default("EQUITY"),
  defaultQuantity: text("default_quantity").notNull().default("1"),
  timeInForce: text("time_in_force").notNull().default("DAY"),
  autoExecute: boolean("auto_execute").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Settings = typeof settingsTable.$inferSelect;

--- FILE: lib/db/src/schema/executions.ts ---
import { pgTable, serial, integer, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { signalsTable } from "./signals";

export const executionsTable = pgTable("executions", {
  id: serial("id").primaryKey(),
  signalId: integer("signal_id").notNull().references(() => signalsTable.id),
  status: text("status").notNull(), // pending | submitted | filled | failed | skipped
  publicOrderId: text("public_order_id"),
  orderType: text("order_type"),
  side: text("side"),
  quantity: text("quantity"),
  limitPrice: text("limit_price"),
  errorMessage: text("error_message"),
  responseRaw: jsonb("response_raw"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Execution = typeof executionsTable.$inferSelect;

--- FILE: lib/db/src/schema/guide-assets.ts ---
import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";

export const guideAssets = pgTable("guide_assets", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  label: text("label").notNull(),
  description: text("description"),
  objectPath: text("object_path").notNull(),
  contentType: text("content_type").notNull(),
  size: integer("size"),
  assetType: text("asset_type").notNull().default("file"), // file | image
  uploadedAt: timestamp("uploaded_at", { withTimezone: true }).defaultNow(),
});

--- FILE: lib/db/src/schema/index.ts ---
export * from "./signals";
export * from "./settings";
export * from "./executions";
export * from "./guide-assets";

After creating the schema files, run:
pnpm --filter @workspace/db run push
```

---

## SECTION 2 — OPENAPI SPEC

```
Create lib/api-spec/openapi.yaml with the full API contract:

openapi: 3.1.0
info:
  title: Api
  version: 0.1.0
  description: Trade Request Receiver API
servers:
  - url: /api
tags:
  - name: health
  - name: webhook
  - name: signals
  - name: settings
  - name: executions
  - name: storage
  - name: guides

paths:
  /healthz:
    get:
      operationId: healthCheck
      tags: [health]
      responses:
        "200":
          content:
            application/json:
              schema: { $ref: "#/components/schemas/HealthStatus" }

  /webhook/tradingview:
    post:
      operationId: receiveTradingViewWebhook
      tags: [webhook]
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: "#/components/schemas/WebhookPayload" }
          text/plain:
            schema: { type: string }
      responses:
        "200":
          content:
            application/json:
              schema: { $ref: "#/components/schemas/TradeSignal" }

  /signals:
    get:
      operationId: listSignals
      tags: [signals]
      parameters:
        - { name: limit, in: query, schema: { type: integer, default: 50 } }
        - { name: action, in: query, schema: { type: string } }
      responses:
        "200":
          content:
            application/json:
              schema: { type: array, items: { $ref: "#/components/schemas/TradeSignal" } }

  /signals/stats:
    get:
      operationId: getSignalStats
      tags: [signals]
      responses:
        "200":
          content:
            application/json:
              schema: { $ref: "#/components/schemas/SignalStats" }

  /signals/{id}:
    get:
      operationId: getSignal
      tags: [signals]
      parameters:
        - { name: id, in: path, required: true, schema: { type: integer } }
      responses:
        "200":
          content:
            application/json:
              schema: { $ref: "#/components/schemas/TradeSignal" }
        "404": { description: Not found }

  /signals/{id}/execution:
    get:
      operationId: getSignalExecution
      tags: [executions]
      parameters:
        - { name: id, in: path, required: true, schema: { type: integer } }
      responses:
        "200":
          content:
            application/json:
              schema: { $ref: "#/components/schemas/Execution" }
        "404": { description: Not found }

  /executions:
    get:
      operationId: listExecutions
      tags: [executions]
      parameters:
        - { name: limit, in: query, schema: { type: integer, default: 50 } }
      responses:
        "200":
          content:
            application/json:
              schema: { type: array, items: { $ref: "#/components/schemas/Execution" } }

  /settings:
    get:
      operationId: getSettings
      tags: [settings]
      responses:
        "200":
          content:
            application/json:
              schema: { $ref: "#/components/schemas/Settings" }
    put:
      operationId: updateSettings
      tags: [settings]
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: "#/components/schemas/SettingsInput" }
      responses:
        "200":
          content:
            application/json:
              schema: { $ref: "#/components/schemas/Settings" }

  /settings/test-connection:
    post:
      operationId: testPublicConnection
      tags: [settings]
      responses:
        "200":
          content:
            application/json:
              schema: { $ref: "#/components/schemas/ConnectionTestResult" }

  /storage/uploads/request-url:
    post:
      operationId: requestUploadUrl
      tags: [storage]
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: "#/components/schemas/RequestUploadUrlBody" }
      responses:
        "200":
          content:
            application/json:
              schema: { $ref: "#/components/schemas/RequestUploadUrlResponse" }

  /guide-assets:
    get:
      operationId: listGuideAssets
      tags: [guides]
      parameters:
        - { name: assetType, in: query, schema: { type: string, enum: [file, image] } }
      responses:
        "200":
          content:
            application/json:
              schema: { type: array, items: { $ref: "#/components/schemas/GuideAsset" } }
    post:
      operationId: createGuideAsset
      tags: [guides]
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: "#/components/schemas/GuideAssetInput" }
      responses:
        "201":
          content:
            application/json:
              schema: { $ref: "#/components/schemas/GuideAsset" }

  /guide-assets/{id}:
    delete:
      operationId: deleteGuideAsset
      tags: [guides]
      parameters:
        - { name: id, in: path, required: true, schema: { type: integer } }
      responses:
        "204": { description: Deleted }

components:
  schemas:
    HealthStatus:
      type: object
      required: [status]
      properties:
        status: { type: string }

    WebhookPayload:
      type: object
      properties:
        ticker: { type: ["string","null"] }
        exchange: { type: ["string","null"] }
        interval: { type: ["string","null"] }
        action: { type: ["string","null"] }
        price: { type: ["number","null"] }
        open: { type: ["number","null"] }
        high: { type: ["number","null"] }
        low: { type: ["number","null"] }
        volume: { type: ["number","null"] }
        time: { type: ["string","null"] }
        timenow: { type: ["string","null"] }
        currency: { type: ["string","null"] }
        basecurrency: { type: ["string","null"] }
        quantity: { type: ["number","null"] }
        strategy: { type: ["string","null"] }
        message: { type: ["string","null"] }
        position_size: { type: ["number","null"] }
        order_price: { type: ["number","null"] }
        order_id: { type: ["string","null"] }
        order_comment: { type: ["string","null"] }

    TradeSignal:
      type: object
      required: [id, ticker, action, receivedAt, raw]
      properties:
        id: { type: integer }
        ticker: { type: string }
        action: { type: string }
        price: { type: ["number","null"] }
        open: { type: ["number","null"] }
        high: { type: ["number","null"] }
        low: { type: ["number","null"] }
        volume: { type: ["number","null"] }
        quantity: { type: ["number","null"] }
        strategy: { type: ["string","null"] }
        message: { type: ["string","null"] }
        exchange: { type: ["string","null"] }
        interval: { type: ["string","null"] }
        currency: { type: ["string","null"] }
        basecurrency: { type: ["string","null"] }
        alertTime: { type: ["string","null"] }
        timenow: { type: ["string","null"] }
        positionSize: { type: ["number","null"] }
        orderPrice: { type: ["number","null"] }
        orderId: { type: ["string","null"] }
        orderComment: { type: ["string","null"] }
        receivedAt: { type: string, format: date-time }
        raw: { type: object }
        execution: { $ref: "#/components/schemas/Execution" }

    SignalStats:
      type: object
      required: [total, buys, sells, lastSignalAt, tickerBreakdown]
      properties:
        total: { type: integer }
        buys: { type: integer }
        sells: { type: integer }
        lastSignalAt: { type: ["string","null"], format: date-time }
        tickerBreakdown:
          type: array
          items:
            type: object
            required: [ticker, count]
            properties:
              ticker: { type: string }
              count: { type: integer }

    Execution:
      type: object
      required: [id, signalId, status, createdAt]
      properties:
        id: { type: integer }
        signalId: { type: integer }
        status: { type: string }
        publicOrderId: { type: ["string","null"] }
        orderType: { type: ["string","null"] }
        side: { type: ["string","null"] }
        quantity: { type: ["string","null"] }
        limitPrice: { type: ["string","null"] }
        errorMessage: { type: ["string","null"] }
        createdAt: { type: string, format: date-time }
        updatedAt: { type: string, format: date-time }

    Settings:
      type: object
      required: [orderType, instrumentType, defaultQuantity, timeInForce, autoExecute]
      properties:
        publicAccountId: { type: ["string","null"] }
        hasApiToken: { type: boolean }
        orderType: { type: string, enum: [MARKET, LIMIT] }
        instrumentType: { type: string, enum: [EQUITY, CRYPTO] }
        defaultQuantity: { type: string }
        timeInForce: { type: string, enum: [DAY, GTC] }
        autoExecute: { type: boolean }

    SettingsInput:
      type: object
      properties:
        publicApiToken: { type: ["string","null"] }
        publicAccountId: { type: ["string","null"] }
        orderType: { type: string, enum: [MARKET, LIMIT] }
        instrumentType: { type: string, enum: [EQUITY, CRYPTO] }
        defaultQuantity: { type: string }
        timeInForce: { type: string, enum: [DAY, GTC] }
        autoExecute: { type: boolean }

    ConnectionTestResult:
      type: object
      required: [ok]
      properties:
        ok: { type: boolean }
        accountId: { type: ["string","null"] }
        accountType: { type: ["string","null"] }
        buyingPower: { type: ["string","null"] }
        error: { type: ["string","null"] }

    RequestUploadUrlBody:
      type: object
      required: [name, size, contentType]
      properties:
        name: { type: string }
        size: { type: integer }
        contentType: { type: string }

    RequestUploadUrlResponse:
      type: object
      required: [uploadURL, objectPath]
      properties:
        uploadURL: { type: string }
        objectPath: { type: string }

    GuideAsset:
      type: object
      required: [id, name, label, objectPath, contentType, assetType, uploadedAt]
      properties:
        id: { type: integer }
        name: { type: string }
        label: { type: string }
        description: { type: ["string","null"] }
        objectPath: { type: string }
        contentType: { type: string }
        size: { type: ["integer","null"] }
        assetType: { type: string }
        uploadedAt: { type: string, format: date-time }

    GuideAssetInput:
      type: object
      required: [name, label, objectPath, contentType, assetType]
      properties:
        name: { type: string }
        label: { type: string }
        description: { type: ["string","null"] }
        objectPath: { type: string }
        contentType: { type: string }
        size: { type: ["integer","null"] }
        assetType: { type: string }

After creating the spec, configure Orval in lib/api-spec/orval.config.ts to generate:
- api-client-react: React Query hooks in lib/api-client-react/src/generated/
- zod: Zod schemas in lib/api-zod/src/generated/api.ts (mode: split, no separate schemas folder)

The codegen script in lib/api-spec/package.json must overwrite the api-zod barrel after orval runs
to avoid duplicate export errors:
"codegen": "orval --config ./orval.config.ts && printf \"export * from './generated/api';\\n\" > ../api-zod/src/index.ts && pnpm -w run typecheck:libs"

Then run:
pnpm --filter @workspace/api-spec run codegen
```

---

## SECTION 3 — BACKEND: Express App + All Routes

```
Create the Express API server in artifacts/api-server/src/.

--- FILE: artifacts/api-server/src/app.ts ---
import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(pinoHttp({
  logger,
  serializers: {
    req(req) { return { id: req.id, method: req.method, url: req.url?.split("?")[0] }; },
    res(res) { return { statusCode: res.statusCode }; },
  },
}));
app.use(cors());
app.use(express.json());
app.use(express.text({ type: "text/plain" }));  // Required: TradingView sends text/plain
app.use(express.urlencoded({ extended: true }));
app.use("/api", router);

export default app;

--- FILE: artifacts/api-server/src/routes/webhook.ts ---
import { Router } from "express";
import { db, signalsTable } from "@workspace/db";
import { placeOrderForSignal } from "../lib/public-com";

const router = Router();

function parseBody(req: { body: unknown }): Record<string, unknown> {
  const body = req.body;
  if (body && typeof body === "object" && !Array.isArray(body)) return body as Record<string, unknown>;
  if (typeof body === "string") {
    try {
      const parsed = JSON.parse(body) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed as Record<string, unknown>;
    } catch { /* not JSON */ }
    return { message: body };
  }
  return {};
}

function toNum(v: unknown): string | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return isNaN(n) ? null : String(n);
}

function toStr(v: unknown): string | null {
  if (v == null || v === "") return null;
  return String(v);
}

router.post("/webhook/tradingview", async (req, res) => {
  const raw = parseBody(req);
  const ticker = toStr(raw["ticker"]) ?? "UNKNOWN";
  const action = toStr(raw["action"]) ?? "unknown";

  const [signal] = await db.insert(signalsTable).values({
    ticker, action,
    price: toNum(raw["price"] ?? raw["close"]),
    open: toNum(raw["open"]), high: toNum(raw["high"]), low: toNum(raw["low"]),
    volume: toNum(raw["volume"]),
    quantity: toNum(raw["quantity"] ?? raw["contracts"]),
    strategy: toStr(raw["strategy"]), message: toStr(raw["message"]),
    exchange: toStr(raw["exchange"]), interval: toStr(raw["interval"]),
    currency: toStr(raw["currency"]), basecurrency: toStr(raw["basecurrency"]),
    alertTime: toStr(raw["time"]), timenow: toStr(raw["timenow"]),
    positionSize: toNum(raw["position_size"]),
    orderPrice: toNum(raw["order_price"]),
    orderId: toStr(raw["order_id"]),
    orderComment: toStr(raw["order_comment"]),
    raw,
  }).returning();

  if (!signal) { res.status(500).json({ error: "Failed to store signal" }); return; }

  res.json(formatSignal(signal));

  // Fire-and-forget: place the trade on Public.com without blocking the response
  placeOrderForSignal(signal.id, {
    ticker: signal.ticker, action: signal.action,
    price: signal.price != null ? Number(signal.price) : null,
    quantity: signal.quantity != null ? Number(signal.quantity) : null,
  }).catch(() => { /* errors logged inside */ });
});

export function formatSignal(s: typeof signalsTable.$inferSelect) {
  return {
    id: s.id, ticker: s.ticker, action: s.action,
    price: s.price != null ? Number(s.price) : null,
    open: s.open != null ? Number(s.open) : null,
    high: s.high != null ? Number(s.high) : null,
    low: s.low != null ? Number(s.low) : null,
    volume: s.volume != null ? Number(s.volume) : null,
    quantity: s.quantity != null ? Number(s.quantity) : null,
    strategy: s.strategy, message: s.message, exchange: s.exchange,
    interval: s.interval, currency: s.currency, basecurrency: s.basecurrency,
    alertTime: s.alertTime, timenow: s.timenow,
    positionSize: s.positionSize != null ? Number(s.positionSize) : null,
    orderPrice: s.orderPrice != null ? Number(s.orderPrice) : null,
    orderId: s.orderId, orderComment: s.orderComment,
    receivedAt: s.receivedAt.toISOString(),
    raw: s.raw,
  };
}

export default router;

--- FILE: artifacts/api-server/src/lib/public-com.ts ---
import { db, settingsTable, executionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { logger } from "./logger";

const PUBLIC_API_BASE = "https://api.public.com";

export async function getSettings() {
  const rows = await db.select().from(settingsTable).limit(1);
  return rows[0] ?? null;
}

export async function placeOrderForSignal(
  signalId: number,
  opts: { ticker: string; action: string; price: number | null; quantity: number | null }
) {
  const settings = await getSettings();

  if (!settings?.publicApiToken || !settings.publicAccountId) {
    await db.insert(executionsTable).values({
      signalId, status: "skipped",
      errorMessage: "Public.com API token or account ID not configured",
    });
    return;
  }

  if (!settings.autoExecute) {
    await db.insert(executionsTable).values({
      signalId, status: "skipped",
      errorMessage: "Auto-execute is disabled",
    });
    return;
  }

  const side = opts.action.toLowerCase().includes("sell") ? "SELL" : "BUY";
  const qty = String(opts.quantity ?? settings.defaultQuantity ?? "1");
  const orderType = settings.orderType ?? "MARKET";
  const limitPrice = orderType === "LIMIT" && opts.price ? String(opts.price) : undefined;
  const clientOrderId = randomUUID();

  const body: Record<string, unknown> = {
    orderId: clientOrderId,
    instrument: { symbol: opts.ticker, type: settings.instrumentType ?? "EQUITY" },
    side, type: orderType, quantity: qty,
    expiration: { timeInForce: settings.timeInForce ?? "DAY" },
  };
  if (limitPrice) body["limitPrice"] = limitPrice;

  const [execution] = await db.insert(executionsTable).values({
    signalId, status: "pending", orderType, side, quantity: qty,
    limitPrice: limitPrice ?? null, publicOrderId: clientOrderId,
  }).returning();

  try {
    const res = await fetch(
      `${PUBLIC_API_BASE}/userapigateway/trading/${settings.publicAccountId}/order`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${settings.publicApiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    const responseJson = await res.json().catch(() => null) as Record<string, unknown> | null;

    if (res.ok) {
      await db.update(executionsTable)
        .set({ status: "submitted", responseRaw: responseJson, updatedAt: new Date() })
        .where(eq(executionsTable.id, execution!.id));
    } else {
      const errMsg = (responseJson?.["message"] as string) ?? `HTTP ${res.status}`;
      await db.update(executionsTable)
        .set({ status: "failed", errorMessage: errMsg, responseRaw: responseJson, updatedAt: new Date() })
        .where(eq(executionsTable.id, execution!.id));
      logger.error({ signalId, error: errMsg }, "Public.com order failed");
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await db.update(executionsTable)
      .set({ status: "failed", errorMessage: msg, updatedAt: new Date() })
      .where(eq(executionsTable.id, execution!.id));
    logger.error({ signalId, err: msg }, "Public.com order error");
  }
}

--- FILE: artifacts/api-server/src/routes/settings.ts ---
// Handles GET/PUT /settings, POST /settings/test-connection, GET /executions,
// and GET /signals/:id/execution
//
// IMPORTANT: Never return the raw publicApiToken in any response.
// Always return hasApiToken: boolean instead.
//
// PUT /settings only updates the token if publicApiToken is explicitly provided
// in the request body. Pass null to clear it, omit the field to keep the existing value.
//
// POST /settings/test-connection calls:
//   GET https://api.public.com/userapigateway/trading/{accountId}/portfolio/v2
// and returns { ok, accountId, accountType, buyingPower } on success
// or { ok: false, error } on failure.

--- FILE: artifacts/api-server/src/routes/signals.ts ---
// Handles GET /signals, GET /signals/stats, GET /signals/:id
//
// /signals/stats must be defined BEFORE /signals/:id or Express will treat
// "stats" as an :id parameter.
//
// Stats counts:
//   total: count all rows
//   buys: count where action contains "buy" (case-insensitive)
//   sells: count where action contains "sell" (case-insensitive)
//   tickerBreakdown: top 10 tickers by signal count

--- FILE: artifacts/api-server/src/routes/guide-assets.ts ---
import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { guideAssets } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/guide-assets", async (req: Request, res: Response) => {
  const { assetType } = req.query as { assetType?: string };
  const rows = await db.select().from(guideAssets).orderBy(guideAssets.uploadedAt);
  res.json(assetType ? rows.filter((r) => r.assetType === assetType) : rows);
});

router.post("/guide-assets", async (req: Request, res: Response) => {
  const { name, label, description, objectPath, contentType, size, assetType } = req.body;
  const [row] = await db.insert(guideAssets)
    .values({ name, label, description, objectPath, contentType, size, assetType })
    .returning();
  res.status(201).json(row);
});

router.delete("/guide-assets/:id", async (req: Request, res: Response) => {
  await db.delete(guideAssets).where(eq(guideAssets.id, Number(req.params.id)));
  res.status(204).end();
});

export default router;

--- FILE: artifacts/api-server/src/routes/index.ts ---
import { Router, type IRouter } from "express";
import healthRouter from "./health";
import webhookRouter from "./webhook";
import signalsRouter from "./signals";
import settingsRouter from "./settings";
import storageRouter from "./storage";    // from object storage setup — see Section 5
import guideAssetsRouter from "./guide-assets";

const router: IRouter = Router();
router.use(healthRouter);
router.use(webhookRouter);
router.use(settingsRouter);
router.use(signalsRouter);
router.use(storageRouter);
router.use(guideAssetsRouter);

export default router;
```

---

## SECTION 4 — FRONTEND: React Dashboard

```
Build the artifacts/trade-receiver frontend with React 19, Vite, Tailwind CSS, shadcn/ui,
wouter for routing, and @tanstack/react-query with the generated hooks.

Theme: white background, orange primary accent (#F97316 / Tailwind orange-500), dark text.
The app name displayed in the header is "TRD_REQ_RCVR" in a monospace font.

--- ROUTE STRUCTURE (App.tsx) ---
/ ................ Home dashboard
/signals/:id ..... Signal detail
/settings ........ Settings page
/guides .......... Guide assets manager

--- PAGE: / (Home) ---
Header:
  - App name "TRD_REQ_RCVR" with a terminal icon
  - Subtitle: "Live monitoring dashboard for TradingView webhook signals."
  - Buttons: "Guide Assets" (links to /guides) and "Settings" (links to /settings)

TradingView Setup card (orange-tinted):
  - Displays webhook URL: window.location.origin + "/api/webhook/tradingview"
  - One-click copy button for the URL
  - Collapsible section showing the JSON alert message template (with copy button):

    {
      "action": "{{strategy.order.action}}",
      "ticker": "{{ticker}}",
      "exchange": "{{exchange}}",
      "interval": "{{interval}}",
      "price": {{close}},
      "open": {{open}},
      "high": {{high}},
      "low": {{low}},
      "volume": {{volume}},
      "time": "{{time}}",
      "timenow": "{{timenow}}",
      "currency": "{{syminfo.currency}}",
      "basecurrency": "{{syminfo.basecurrency}}",
      "position_size": {{strategy.position_size}},
      "order_price": {{strategy.order.price}},
      "order_id": "{{strategy.order.id}}",
      "order_comment": "{{strategy.order.comment}}"
    }

  - Note: "strategy placeholders like {{strategy.order.action}} only work in Strategy alerts"

Stats cards (4 cards in a row):
  - Total Signals (with activity icon)
  - Buy Signals (green, trending up icon)
  - Sell Signals (red, trending down icon)
  - Last Signal (relative time, e.g. "about 2 minutes ago")

Live Feed table (auto-refreshes every 5 seconds using refetchInterval: 5000):
  Columns: TIME | TICKER | ACTION | PRICE | SIZE | EXCHANGE | ORDER | (details link)

  ACTION badge: green background for buy, red for sell
  ORDER badge colors:
    submitted = blue
    filled = green
    failed = red
    pending = yellow/amber
    skipped = gray
  Each row has a "Details →" link to /signals/:id

--- PAGE: /signals/:id (Signal Detail) ---
- Back link to home
- Full signal data in labeled sections:
  - Core fields: Ticker, Action, Exchange, Interval, Strategy
  - OHLCV section (if price data available): Open, High, Low, Close, Volume
  - Order details: Position Size, Order Price, Order ID, Order Comment
  - Execution card: shows status badge, order type, side, quantity, error if failed
  - Raw JSON payload in a collapsible code block

--- PAGE: /settings ---
- Back link to home
- Settings icon and "Bot Settings" heading

Form sections:

1. Public.com API:
   - API Token: password input, masked. Placeholder text when token is saved.
     Show eye icon to toggle visibility. Leave blank to keep existing token.
     Show "Connected ✓" badge when hasApiToken is true.
   - Account ID: text input
   - "Test Connection" button: calls POST /api/settings/test-connection
     Show result inline (buying power and account type on success, error on failure)

2. Order Settings:
   - Order Type: select (MARKET / LIMIT)
   - Instrument Type: select (EQUITY / CRYPTO)
   - Default Quantity: number input
   - Time In Force: select (DAY / GTC)

3. Automation:
   - Auto-Execute toggle (boolean switch)
   - Description: "When enabled, every incoming signal automatically places an order on Public.com"

Save button: calls PUT /api/settings

--- PAGE: /guides (Guide Assets Manager) ---
Header: "Guide Assets" with book icon, back link to home, asset count

Upload panels (side by side):
  Left panel — Downloadable File:
    - Accepts: .pdf,.zip,.txt,.md,.py,.ts,.json,.csv,.xlsx,.docx
    - Dashed drop zone with upload icon, click to select
    - Label input (required), Description textarea (optional)
    - Upload button (orange)
    - Flow: POST /api/storage/uploads/request-url → PUT presigned URL → POST /api/guide-assets

  Right panel — Screenshot / Image:
    - Accepts: .png,.jpg,.jpeg,.gif,.webp,.svg
    - Same flow as above
    - Shows image preview after file selection

Info box explaining guide symbols:
  [IMG:/objects/abc123|Alt text]
  [DOWNLOAD:/objects/abc123|Button label]

Asset lists:
  Downloadable Files section: list view with file icon, label, description, filename, size, upload time
  Screenshots section: grid preview (4 columns) + list view below

Each asset row (visible on hover):
  - File type badge
  - Copy symbol button (copies [IMG:...] or [DOWNLOAD:...] to clipboard)
  - Download/open link
  - Delete button
```

---

## SECTION 5 — OBJECT STORAGE SETUP

```
Set up Replit object storage for file uploads. This provides presigned URL uploads
directly to Google Cloud Storage.

Step 1: Provision storage
  Run this in the Replit code execution sandbox:
  const result = await setupObjectStorage();
  console.log(result);
  // Sets env vars: DEFAULT_OBJECT_STORAGE_BUCKET_ID, PUBLIC_OBJECT_SEARCH_PATHS, PRIVATE_OBJECT_DIR

Step 2: Install server dependencies
  pnpm --filter @workspace/api-server add @google-cloud/storage google-auth-library

Step 3: Copy the object storage templates from the skill
  cp .local/skills/object-storage/templates/api-server/src/lib/objectStorage.ts artifacts/api-server/src/lib/
  cp .local/skills/object-storage/templates/api-server/src/lib/objectAcl.ts artifacts/api-server/src/lib/
  cp .local/skills/object-storage/templates/api-server/src/routes/storage.ts artifacts/api-server/src/routes/
  mkdir -p lib/object-storage-web
  cp -r .local/skills/object-storage/templates/lib/object-storage-web/* lib/object-storage-web/

Step 4: Fix the objectStorage.ts type error on the signed URL response:
  Change:
    const { signed_url: signedURL } = await response.json();
  To:
    const data = await response.json() as { signed_url: string };
    const signedURL = data.signed_url;

Step 5: Install client packages
  pnpm --filter @workspace/trade-receiver add @uppy/aws-s3@^5.0.0 @uppy/core@^5.0.0 @uppy/dashboard@^5.0.0 @uppy/react@^5.0.0

Step 6: Add React version overrides to root package.json to prevent duplicate React installs:
  "pnpm": {
    "overrides": {
      "react": "19.1.0",
      "react-dom": "19.1.0"
    }
  }

Step 7: Make object-storage-web a composite lib.
  Add to lib/object-storage-web/tsconfig.json compilerOptions:
    "composite": true,
    "declarationMap": true,
    "emitDeclarationOnly": true

  Add to root tsconfig.json references:
    { "path": "./lib/object-storage-web" }

  Add to artifacts/trade-receiver/tsconfig.json references:
    { "path": "../../lib/object-storage-web" }

  Add to artifacts/trade-receiver/package.json devDependencies:
    "@workspace/object-storage-web": "workspace:*"

Step 8: Wire the storage router in artifacts/api-server/src/routes/index.ts
  import storageRouter from "./storage";
  router.use(storageRouter);

Step 9: Run pnpm install to apply overrides
  pnpm install
```

---

## SECTION 6 — VERIFICATION CHECKLIST

```
After building, verify each item:

API server (port 8080, served at /api):
  curl localhost:80/api/healthz
  → { "status": "ok" }

  curl -X POST localhost:80/api/webhook/tradingview \
    -H "Content-Type: application/json" \
    -d '{"ticker":"AAPL","action":"buy","price":175.50}'
  → Returns signal object with id, ticker, action, receivedAt

  curl localhost:80/api/signals
  → Returns array of signals (most recent first)

  curl localhost:80/api/signals/stats
  → Returns { total, buys, sells, lastSignalAt, tickerBreakdown }

  curl localhost:80/api/settings
  → Returns { hasApiToken: false, orderType: "MARKET", autoExecute: true, ... }

Frontend (auto-refreshes every 5s):
  - Dashboard shows signal count cards and live feed table
  - TradingView setup card displays the deployed webhook URL
  - Settings page has Test Connection button
  - Guide Assets page has upload panels for files and images
  - Every asset row shows a copy button that copies the [IMG:...|...] or [DOWNLOAD:...|...] symbol

TypeScript:
  pnpm run typecheck
  → Must exit clean with no errors

Codegen:
  pnpm --filter @workspace/api-spec run codegen
  → Must exit clean. Re-run this any time you change openapi.yaml.
```

---

## IMPORTANT NOTES FOR THE AI

1. **Fire-and-forget pattern**: The webhook handler must respond to TradingView BEFORE calling
   Public.com. Respond with res.json(formatSignal(signal)) first, then call placeOrderForSignal
   with .catch() so any error doesn't crash the request handler.

2. **Token security**: The API token stored in the settings table must NEVER be sent to the
   browser. GET /settings always returns hasApiToken: boolean, never the token itself.
   PUT /settings only updates the token if the field is explicitly present in the request body
   (undefined = keep existing, null = clear, string = set new value).

3. **Text/plain parsing**: TradingView sends webhooks as Content-Type: text/plain containing
   JSON. The Express app must include express.text({ type: "text/plain" }) middleware, and
   the webhook handler must attempt JSON.parse on string bodies.

4. **Route order matters**: In signals.ts, define GET /signals/stats BEFORE GET /signals/:id.
   Express matches routes in order — if :id is first, the string "stats" matches as an id.

5. **Codegen barrel fix**: Orval generates both Zod schemas and TypeScript types. The Zod
   schemas live in lib/api-zod/src/generated/api.ts. The codegen script must overwrite
   lib/api-zod/src/index.ts after running orval to contain only:
   export * from './generated/api';

6. **Object storage paths**: When serving an uploaded file, the URL is:
   /api/storage/objects{objectPath}
   where objectPath comes from the upload response (e.g. /objects/uuid-here).
   Full example: /api/storage/objects/objects/550e8400-e29b-41d4-a716-446655440000
