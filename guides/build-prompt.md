[PAGE:1|AI Build Prompt — TRD_REQ_RCVR Trading Bot]

This document is the complete prompt set for rebuilding the TRD_REQ_RCVR app from scratch using an AI coding assistant (Replit Agent, Cursor, Claude Code, etc.). Work through each section in order. Every PROMPT block is meant to be pasted directly into your AI coder. Every CMD block is run in your terminal.

[NOTE]
You can paste the entire document at once into Replit Agent, or hand each section one at a time for more control. Either approach works.
[/NOTE]

---

[SECTION:Step 1 — Project Scaffold]

Start by giving your AI coder the full project overview. This sets the stack, folder structure, and ground rules before any code is written.

[PROMPT:Project Scaffold]
Build a full-stack trading bot dashboard called "TRD_REQ_RCVR" using a pnpm monorepo on Node.js 24 and TypeScript 5.

The app does three things:
1. Receives TradingView webhook signals via a POST endpoint and stores them in PostgreSQL
2. Displays incoming signals in a live-updating React dashboard (auto-refreshes every 5 seconds)
3. Automatically executes trades on Public.com via their REST API when a signal arrives

Use this exact monorepo structure:
- lib/db               — shared Drizzle ORM + PostgreSQL database library
- lib/api-spec         — OpenAPI 3.1 spec + Orval codegen config
- lib/api-client-react — generated React Query hooks (do not edit manually)
- lib/api-zod          — generated Zod validation schemas (do not edit manually)
- artifacts/api-server      — Express 5 backend, reads PORT from environment, logs with pino
- artifacts/trade-receiver  — React 19 + Vite + Tailwind CSS + shadcn/ui frontend

Root package.json scripts must include:
  "typecheck:libs": "tsc --build"
  "typecheck": "pnpm run typecheck:libs && pnpm -r --filter ./artifacts/** --if-present run typecheck"

Rules:
- Strict TypeScript throughout
- DATABASE_URL environment variable for the Postgres connection string
- Never use console.log in server code — use req.log in route handlers and a pino logger singleton elsewhere
- All traffic is proxied through a shared reverse proxy at localhost:80 — the api-server serves /api, the frontend serves /
[/PROMPT]

[/SECTION]

---

[SECTION:Step 2 — Database Schema]

[STEP:1|Create the signals table]

[PROMPT:signals.ts schema]
Create lib/db/src/schema/signals.ts with this exact content:

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
[/PROMPT]

[/STEP]

[STEP:2|Create the settings table]

[PROMPT:settings.ts schema]
Create lib/db/src/schema/settings.ts:

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
[/PROMPT]

[/STEP]

[STEP:3|Create the executions table]

[PROMPT:executions.ts schema]
Create lib/db/src/schema/executions.ts:

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
[/PROMPT]

[/STEP]

[STEP:4|Create the guide assets table]

[PROMPT:guide-assets.ts schema]
Create lib/db/src/schema/guide-assets.ts:

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
[/PROMPT]

[/STEP]

[STEP:5|Create the schema barrel and push to the database]

[PROMPT:schema/index.ts barrel]
Create lib/db/src/schema/index.ts:

export * from "./signals";
export * from "./settings";
export * from "./executions";
export * from "./guide-assets";
[/PROMPT]

Then push the schema to your Postgres database:

[CMD]
pnpm --filter @workspace/db run push
[/CMD]

[/STEP]

[/SECTION]

---

[SECTION:Step 3 — OpenAPI Spec and Codegen]

[STEP:1|Create the OpenAPI spec]

[PROMPT:openapi.yaml]
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
[/PROMPT]

[/STEP]

[STEP:2|Configure Orval codegen and run it]

[PROMPT:orval.config.ts + codegen script]
Configure Orval in lib/api-spec/orval.config.ts to generate:
- React Query hooks into lib/api-client-react/src/generated/
- Zod validation schemas into lib/api-zod/src/generated/api.ts
  Use mode: "split" and do NOT enable a separate schemas output block — this causes duplicate export errors.

In lib/api-spec/package.json, the codegen script must overwrite the api-zod barrel after orval runs:

"codegen": "orval --config ./orval.config.ts && printf \"export * from './generated/api';\\n\" > ../api-zod/src/index.ts && pnpm -w run typecheck:libs"

This prevents a known Orval bug where it generates duplicate exports in the barrel file.
[/PROMPT]

[WARN]
Do NOT add a separate [KEY]schemas[/KEY] output block to [KEY]orval.config.ts[/KEY]. Orval generates both types and Zod schemas from a single output block when you set [KEY]client: "zod"[/KEY] — a second schemas block creates conflicting exports that break compilation.
[/WARN]

Then run codegen:

[CMD]
pnpm --filter @workspace/api-spec run codegen
[/CMD]

[/STEP]

[/SECTION]

---

[SECTION:Step 4 — Backend: Express Server and Routes]

[STEP:1|Create the Express app entry point]

[PROMPT:app.ts]
Create artifacts/api-server/src/app.ts:

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
app.use(express.text({ type: "text/plain" }));
app.use(express.urlencoded({ extended: true }));
app.use("/api", router);

export default app;
[/PROMPT]

[NOTE]
[KEY]express.text({ type: "text/plain" })[/KEY] is required. TradingView sends webhook payloads as [KEY]Content-Type: text/plain[/KEY] even though the body is JSON. Without this middleware, [KEY]req.body[/KEY] will be undefined for TradingView alerts.
[/NOTE]

[/STEP]

[STEP:2|Create the webhook route]

[PROMPT:routes/webhook.ts]
Create artifacts/api-server/src/routes/webhook.ts:

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
    strategy: toStr(raw["strategy"]),   message: toStr(raw["message"]),
    exchange: toStr(raw["exchange"]),   interval: toStr(raw["interval"]),
    currency: toStr(raw["currency"]),   basecurrency: toStr(raw["basecurrency"]),
    alertTime: toStr(raw["time"]),      timenow: toStr(raw["timenow"]),
    positionSize: toNum(raw["position_size"]),
    orderPrice: toNum(raw["order_price"]),
    orderId: toStr(raw["order_id"]),
    orderComment: toStr(raw["order_comment"]),
    raw,
  }).returning();

  if (!signal) { res.status(500).json({ error: "Failed to store signal" }); return; }

  // Respond to TradingView FIRST, then fire the trade in the background
  res.json(formatSignal(signal));

  placeOrderForSignal(signal.id, {
    ticker: signal.ticker, action: signal.action,
    price: signal.price != null ? Number(signal.price) : null,
    quantity: signal.quantity != null ? Number(signal.quantity) : null,
  }).catch(() => { /* errors are logged inside placeOrderForSignal */ });
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
    strategy: s.strategy,   message: s.message,
    exchange: s.exchange,   interval: s.interval,
    currency: s.currency,   basecurrency: s.basecurrency,
    alertTime: s.alertTime, timenow: s.timenow,
    positionSize: s.positionSize != null ? Number(s.positionSize) : null,
    orderPrice: s.orderPrice != null ? Number(s.orderPrice) : null,
    orderId: s.orderId,     orderComment: s.orderComment,
    receivedAt: s.receivedAt.toISOString(),
    raw: s.raw,
  };
}

export default router;
[/PROMPT]

[WARN]
Always call [KEY]res.json(formatSignal(signal))[/KEY] BEFORE calling [KEY]placeOrderForSignal[/KEY]. TradingView has a short timeout and will retry the webhook if your server doesn't respond quickly. The trade goes out in the background after the response is sent.
[/WARN]

[/STEP]

[STEP:3|Create the Public.com integration library]

[PROMPT:lib/public-com.ts]
Create artifacts/api-server/src/lib/public-com.ts:

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
[/PROMPT]

[NOTE]
Public.com API base URL: [KEY]https://api.public.com[/KEY]

Place order endpoint: [KEY]POST /userapigateway/trading/{accountId}/order[/KEY]

Test connection endpoint: [KEY]GET /userapigateway/trading/{accountId}/portfolio/v2[/KEY]

All requests use [KEY]Authorization: Bearer {token}[/KEY] headers.
[/NOTE]

[/STEP]

[STEP:4|Create the settings, signals, and guide assets routes]

[PROMPT:routes/settings.ts]
Create artifacts/api-server/src/routes/settings.ts.

This file handles: GET /settings, PUT /settings, POST /settings/test-connection, GET /executions, GET /signals/:id/execution.

Critical rules:
- GET /settings must NEVER return the raw publicApiToken — return hasApiToken: boolean instead
- PUT /settings: only update the token when publicApiToken is explicitly present in the body
  (undefined = keep existing value, null = clear the token, any string = set new value)
- POST /settings/test-connection calls GET https://api.public.com/userapigateway/trading/{accountId}/portfolio/v2
  and returns { ok: true, accountId, accountType, buyingPower } on success or { ok: false, error } on failure
- The settings table always has at most one row — use upsert logic (check if row exists, then update or insert)

The formatExecution helper returns:
{ id, signalId, status, publicOrderId, orderType, side, quantity, limitPrice, errorMessage, createdAt, updatedAt }
(all timestamps as ISO strings)
[/PROMPT]

[PROMPT:routes/signals.ts]
Create artifacts/api-server/src/routes/signals.ts.

Handles: GET /signals/stats, GET /signals, GET /signals/:id

IMPORTANT: Define GET /signals/stats BEFORE GET /signals/:id in the file.
Express matches routes top-to-bottom. If :id comes first, the literal string "stats" will be
parsed as an id value and the stats endpoint will never be reached.

Stats counts:
- total: count(*) all rows in signals table
- buys: count where action LIKE '%buy%' (case-insensitive)
- sells: count where action LIKE '%sell%' (case-insensitive)
- lastSignalAt: receivedAt of the most recent signal
- tickerBreakdown: top 10 tickers by signal count, returned as [{ ticker, count }]
[/PROMPT]

[PROMPT:routes/guide-assets.ts]
Create artifacts/api-server/src/routes/guide-assets.ts:

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
[/PROMPT]

[PROMPT:routes/index.ts]
Create artifacts/api-server/src/routes/index.ts that mounts all routers:

import { Router, type IRouter } from "express";
import healthRouter from "./health";
import webhookRouter from "./webhook";
import signalsRouter from "./signals";
import settingsRouter from "./settings";
import storageRouter from "./storage";
import guideAssetsRouter from "./guide-assets";

const router: IRouter = Router();
router.use(healthRouter);
router.use(webhookRouter);
router.use(settingsRouter);
router.use(signalsRouter);
router.use(storageRouter);
router.use(guideAssetsRouter);

export default router;
[/PROMPT]

[/STEP]

[/SECTION]

---

[SECTION:Step 5 — Object Storage for File Uploads]

[STEP:1|Provision the storage bucket]

Run this once in the Replit code execution sandbox to provision a GCS bucket and set the required environment variables:

[PROMPT:Provision storage]
In the Replit code execution sandbox, run:

const result = await setupObjectStorage();
console.log(result);

This sets three environment variables automatically:
- DEFAULT_OBJECT_STORAGE_BUCKET_ID
- PUBLIC_OBJECT_SEARCH_PATHS
- PRIVATE_OBJECT_DIR
[/PROMPT]

[/STEP]

[STEP:2|Install server dependencies for storage]

[CMD]
pnpm --filter @workspace/api-server add @google-cloud/storage google-auth-library
[/CMD]

[/STEP]

[STEP:3|Copy the object storage templates]

[PROMPT:Object storage template setup]
Copy the Replit object storage templates into the project:

cp .local/skills/object-storage/templates/api-server/src/lib/objectStorage.ts artifacts/api-server/src/lib/
cp .local/skills/object-storage/templates/api-server/src/lib/objectAcl.ts artifacts/api-server/src/lib/
cp .local/skills/object-storage/templates/api-server/src/routes/storage.ts artifacts/api-server/src/routes/

mkdir -p lib/object-storage-web
cp -r .local/skills/object-storage/templates/lib/object-storage-web/* lib/object-storage-web/

Then fix a TypeScript error in objectStorage.ts — change:
  const { signed_url: signedURL } = await response.json();
to:
  const data = await response.json() as { signed_url: string };
  const signedURL = data.signed_url;
[/PROMPT]

[/STEP]

[STEP:4|Install client upload packages and fix React peer deps]

[CMD]
pnpm --filter @workspace/trade-receiver add @uppy/aws-s3@^5.0.0 @uppy/core@^5.0.0 @uppy/dashboard@^5.0.0 @uppy/react@^5.0.0
[/CMD]

Add React version overrides to the root [KEY]package.json[/KEY] to prevent duplicate React installs caused by Uppy's peer dependency declarations:

[COPY]
"pnpm": {
  "overrides": {
    "react": "19.1.0",
    "react-dom": "19.1.0"
  }
}
[/COPY]

Then reinstall to apply overrides:

[CMD]
pnpm install
[/CMD]

[/STEP]

[STEP:5|Wire object-storage-web as a composite lib]

[PROMPT:Composite lib wiring]
Make lib/object-storage-web a proper composite TypeScript lib so it can be shared across packages.

In lib/object-storage-web/tsconfig.json compilerOptions, add:
  "composite": true,
  "declarationMap": true,
  "emitDeclarationOnly": true

In the root tsconfig.json references array, add:
  { "path": "./lib/object-storage-web" }

In artifacts/trade-receiver/tsconfig.json references array, add:
  { "path": "../../lib/object-storage-web" }

In artifacts/trade-receiver/package.json devDependencies, add:
  "@workspace/object-storage-web": "workspace:*"
[/PROMPT]

[/STEP]

[/SECTION]

---

[SECTION:Step 6 — Frontend: React Dashboard]

[STEP:1|Set up routing and theme]

[PROMPT:Frontend scaffold]
Set up the artifacts/trade-receiver React app with:
- wouter for routing
- @tanstack/react-query with the generated hooks from @workspace/api-client-react
- Tailwind CSS with this theme override in tailwind.config.ts:
    primary: "#F97316"  (orange-500)
  White backgrounds, dark text, orange accents throughout.

App router (App.tsx):
  / ................ Home dashboard
  /signals/:id ..... Signal detail page
  /settings ........ Bot settings page
  /guides .......... Guide assets manager
[/PROMPT]

[/STEP]

[STEP:2|Build the Home dashboard page]

[PROMPT:pages/home.tsx]
Build the home dashboard page at /.

Header:
- App name "TRD_REQ_RCVR" in a monospace font with a terminal icon
- Subtitle: "Live monitoring dashboard for TradingView webhook signals."
- Two nav buttons top-right: "Guide Assets" (links to /guides) and "Settings" (links to /settings)

TradingView Setup card (orange-50 background, orange-200 border):
- Displays the webhook URL: window.location.origin + "/api/webhook/tradingview"
- One-click copy button for the URL
- Collapsible section with the JSON alert message template and a copy button:

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

- Note below: "strategy.* placeholders only work in Strategy alerts, not Basic alerts"

Stats row (4 cards):
- Total Signals — activity icon
- Buy Signals — green, trending-up icon
- Sell Signals — red, trending-down icon
- Last Signal — clock icon, shows relative time (e.g. "about 2 minutes ago")

Live Feed table — refetchInterval: 5000 (auto-refreshes every 5 seconds):
  Columns: TIME | TICKER | ACTION | PRICE | SIZE | EXCHANGE | ORDER | (link)
  ACTION badge: green for buy, red for sell
  ORDER badge colors:
    submitted → blue
    filled → green
    failed → red
    pending → amber/yellow
    skipped → gray
  Each row has a "Details →" link to /signals/:id
[/PROMPT]

[/STEP]

[STEP:3|Build the Signal Detail page]

[PROMPT:pages/signal-detail.tsx]
Build the signal detail page at /signals/:id.

- Back arrow link to home
- Page heading: ticker + action badge

Sections:
1. Core fields: Ticker, Action, Exchange, Interval, Strategy, Message
2. OHLCV (only show if any price data is present): Open, High, Low, Close/Price, Volume
3. Order fields: Position Size, Order Price, Order ID, Order Comment
4. Execution card: status badge, order type, side, quantity, limit price, error message (if failed)
5. Raw payload: collapsible code block showing the full JSON from the "raw" field
[/PROMPT]

[/STEP]

[STEP:4|Build the Settings page]

[PROMPT:pages/settings.tsx]
Build the settings page at /settings.

Header: back arrow, Settings2 icon, "Bot Settings" heading.

Form — three sections:

1. Public.com API:
   - API Token: password input, hidden by default, eye icon to toggle visibility
     Placeholder: "Enter new token to update" when hasApiToken is true
     Show a green "Connected ✓" badge when hasApiToken is true
   - Account ID: text input for the Public.com account ID
   - "Test Connection" button: calls POST /api/settings/test-connection
     On success: show account type and buying power inline
     On failure: show the error message inline in red

2. Order Defaults:
   - Order Type: select — MARKET or LIMIT
   - Instrument Type: select — EQUITY or CRYPTO
   - Default Quantity: number input (used when the signal doesn't include a quantity)
   - Time In Force: select — DAY or GTC

3. Automation:
   - Auto-Execute: boolean toggle switch
   - Description below toggle: "When enabled, every incoming signal automatically places an order on Public.com"

Save button (full width, orange): calls PUT /api/settings
[/PROMPT]

[/STEP]

[STEP:5|Build the Guide Assets page]

[PROMPT:pages/guides.tsx]
Build the guide assets manager page at /guides.

Header: back arrow, BookOpen icon, "Guide Assets" heading, asset count badge top-right.

Two upload panels side by side:

Left panel — Downloadable File:
  Accepts: .pdf, .zip, .txt, .md, .py, .ts, .json, .csv, .xlsx, .docx
  - Dashed drop zone, click to select file
  - Label input (required)
  - Description textarea (optional)
  - Orange Upload button
  Upload flow:
    1. POST /api/storage/uploads/request-url with { name, size, contentType }
    2. PUT the presigned URL with the file bytes
    3. POST /api/guide-assets to record { name, label, description, objectPath, contentType, size, assetType: "file" }

Right panel — Screenshot / Image:
  Accepts: .png, .jpg, .jpeg, .gif, .webp, .svg
  - Same upload flow, assetType: "image"
  - Shows image preview after file is selected

Info box below the panels:
  Explains the two guide symbols with copyable examples:
  [IMG:/objects/abc123|Screenshot of TradingView alert setup]
  [DOWNLOAD:/objects/abc123|Download Starter Pine Script]

Asset lists:

Downloadable Files section:
  List view: file icon, label, description, filename, file size, upload time
  On hover: show copy-symbol button, open/download link, delete button

Screenshots section:
  4-column image grid, then list below
  On hover: show copy-symbol button, open link, delete button

Copy-symbol button behavior:
  - For images: copies [IMG:{objectPath}|{label}] to clipboard
  - For files: copies [DOWNLOAD:{objectPath}|{label}] to clipboard
  Show a brief toast/confirmation after copying.
[/PROMPT]

[/STEP]

[/SECTION]

---

[SECTION:Step 7 — Verify Everything Works]

[STEP:1|Check the API is running]

[CMD]
curl localhost:80/api/healthz
[/CMD]

Expected: [KEY]{ "status": "ok" }[/KEY]

[/STEP]

[STEP:2|Send a test webhook]

[CMD]
curl -X POST localhost:80/api/webhook/tradingview \
  -H "Content-Type: application/json" \
  -d '{"ticker":"AAPL","action":"buy","price":175.50,"exchange":"NASDAQ"}'
[/CMD]

Expected: JSON object with [KEY]id[/KEY], [KEY]ticker[/KEY], [KEY]action[/KEY], [KEY]receivedAt[/KEY] fields.

[/STEP]

[STEP:3|Check signals and stats]

[CMD]
curl localhost:80/api/signals
[/CMD]

[CMD]
curl localhost:80/api/signals/stats
[/CMD]

Expected stats: [KEY]{ total, buys, sells, lastSignalAt, tickerBreakdown }[/KEY]

[/STEP]

[STEP:4|Confirm settings never leaks the API token]

[CMD]
curl localhost:80/api/settings
[/CMD]

Expected: [KEY]{ "hasApiToken": false, "orderType": "MARKET", "autoExecute": true, ... }[/KEY]

[TIP]
The response must contain [KEY]hasApiToken[/KEY] (a boolean), never [KEY]publicApiToken[/KEY] (the raw token). If you see the raw token in the response, the settings route has a bug.
[/TIP]

[/STEP]

[STEP:5|Run a full TypeScript check]

[CMD]
pnpm run typecheck
[/CMD]

Must exit clean with zero errors. If codegen output causes errors, re-run:

[CMD]
pnpm --filter @workspace/api-spec run codegen
[/CMD]

[/STEP]

[/SECTION]

---

[SECTION:Critical Notes for the AI]

These are the six most common mistakes when building this app. Review them before and after building.

[WARN]
**Fire-and-forget order**: The webhook handler must call [KEY]res.json()[/KEY] BEFORE calling [KEY]placeOrderForSignal()[/KEY]. TradingView has a strict response timeout. If the API call to Public.com runs before the response is sent, TradingView may mark your webhook as failed and retry it — firing duplicate trades.
[/WARN]

[WARN]
**Token security**: The [KEY]publicApiToken[/KEY] column must NEVER appear in any API response. [KEY]GET /settings[/KEY] returns [KEY]hasApiToken: boolean[/KEY] only. [KEY]PUT /settings[/KEY] only updates the token when the field is explicitly present in the request body — [KEY]undefined[/KEY] keeps the existing value, [KEY]null[/KEY] clears it, a string sets a new value.
[/WARN]

[WARN]
**Route order**: In [KEY]signals.ts[/KEY], always define [KEY]GET /signals/stats[/KEY] BEFORE [KEY]GET /signals/:id[/KEY]. Express matches routes top-to-bottom. If the [KEY]:id[/KEY] pattern comes first, the literal string "stats" will be parsed as an integer id — the stats endpoint becomes unreachable.
[/WARN]

[NOTE]
**text/plain middleware**: TradingView sends webhook bodies as [KEY]Content-Type: text/plain[/KEY] even when the content is JSON. The app needs both [KEY]express.json()[/KEY] (for normal JSON clients) and [KEY]express.text({ type: "text/plain" })[/KEY] (for TradingView). The webhook handler then tries [KEY]JSON.parse()[/KEY] on string bodies.
[/NOTE]

[NOTE]
**Codegen barrel fix**: Orval has a known issue where it generates duplicate named exports when you run it with certain config options. The fix is to overwrite [KEY]lib/api-zod/src/index.ts[/KEY] after running orval so it contains only [KEY]export * from './generated/api';[/KEY] — nothing else. This is done automatically by the codegen npm script.
[/NOTE]

[NOTE]
**Object storage paths**: Uploaded files are served at [KEY]/api/storage/objects{objectPath}[/KEY]. The [KEY]objectPath[/KEY] returned from the upload API already starts with [KEY]/objects/[/KEY], so the full URL becomes [KEY]/api/storage/objects/objects/{uuid}[/KEY]. This double "objects" in the URL is correct — do not remove one of them.
[/NOTE]

[TABLE]
| What to verify | Expected result |
|---|---|
| GET /api/healthz | { "status": "ok" } |
| POST /api/webhook/tradingview | Returns signal with id, ticker, action, receivedAt |
| GET /api/signals/stats | Returns total, buys, sells, lastSignalAt, tickerBreakdown |
| GET /api/settings | Contains hasApiToken (boolean), NOT publicApiToken |
| pnpm run typecheck | Exits clean, zero errors |
| pnpm --filter @workspace/api-spec run codegen | Exits clean, no duplicate export errors |
[/TABLE]

[/SECTION]

[NAV:none|none]

[/PAGE]
