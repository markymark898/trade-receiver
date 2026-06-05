[PAGE:2|Building the Receiver App]

# How to Create a Trading Bot with Public.com
## Segment 2: Building the Signal Receiver App

[SECTION:What You're Building]

The receiver app has two parts:

1. **A backend API server** — receives POST requests from TradingView, stores signals in a database, and sends orders to your broker
2. **A frontend dashboard** — a live-updating UI where you can see every incoming signal and its execution status

The tech stack is Node.js, Express, PostgreSQL, React, and TypeScript running in a pnpm monorepo. You do not need to understand all of this upfront. Your agentic coder handles the setup. You just need to paste the prompts below in order.

[/SECTION]

---

[SECTION:Step 1 — Set Up Your Coding Environment]

[STEP:1|Set Up Your Coding Environment]

This guide is written for **Replit**, which gives you a cloud development environment, a built-in database, and one-click publishing. Create a free account at replit.com if you do not have one.

1. Create a new Replit project
2. Choose the **Node.js** template, or start blank
3. Open the AI agent in your project

[TIP]
You can use any agentic coder that can access your file system and run terminal commands — Cursor, Windsurf, or Claude Code also work. The prompts below are identical regardless of which tool you use.
[/TIP]

[/STEP]

[/SECTION]

---

[SECTION:Step 2 — Prompt 1: Project Scaffold]

[STEP:2|Paste Prompt 1 into Your Agentic Coder]

[PROMPT:Project Scaffold]
Create a pnpm monorepo project for a trading signal receiver app with the following structure:

- lib/db — a shared database library using Drizzle ORM with PostgreSQL
- lib/api-spec — an OpenAPI spec file (openapi.yaml) with Orval codegen config
- lib/api-client-react — generated React Query hooks from the OpenAPI spec (do not edit manually)
- lib/api-zod — generated Zod validation schemas from the OpenAPI spec (do not edit manually)
- artifacts/api-server — an Express 5 backend server that reads PORT from environment
- artifacts/trade-receiver — a React + Vite frontend dashboard

The root package.json should have:
- "typecheck:libs": "tsc --build"
- "typecheck": runs typecheck:libs then typechecks each artifact

Use TypeScript 5, Node.js 24, and strict mode. The api-server should log using pino.
The database should connect via the DATABASE_URL environment variable.
[/PROMPT]

[/STEP]

[/SECTION]

---

[SECTION:Step 3 — Prompt 2: Database Schema]

[STEP:3|Paste Prompt 2 into Your Agentic Coder]

[PROMPT:Database Schema]
In lib/db/src/schema/, create the following tables using Drizzle ORM:

1. signals — stores incoming TradingView webhook payloads:
   id (serial PK), ticker (text, not null), action (text, not null),
   price, open, high, low, volume, quantity (all numeric, nullable),
   strategy, message, exchange, interval, currency, basecurrency,
   alert_time, timenow, order_id, order_comment (all text, nullable),
   position_size, order_price (numeric, nullable),
   raw (jsonb, not null), received_at (timestamp with timezone, default now)

2. settings — stores user configuration:
   id (serial PK), public_api_token (text), public_account_id (text),
   order_type (text, default 'MARKET'), instrument_type (text, default 'EQUITY'),
   default_quantity (text, default '1'), time_in_force (text, default 'DAY'),
   auto_execute (boolean, default true), updated_at (timestamp with timezone)

3. executions — stores order execution results per signal:
   id (serial PK), signal_id (integer FK to signals.id),
   status (text: pending/submitted/filled/failed/skipped),
   public_order_id, order_type, side, quantity, limit_price,
   error_message (all text), response_raw (jsonb),
   created_at, updated_at (timestamp with timezone)

Export everything from lib/db/src/schema/index.ts and lib/db/src/index.ts.
Run the schema push after creating it.
[/PROMPT]

[/STEP]

[/SECTION]

---

[SECTION:Step 4 — Prompt 3: API Spec]

[STEP:4|Paste Prompt 3 into Your Agentic Coder]

[PROMPT:OpenAPI Spec]
Create lib/api-spec/openapi.yaml defining these endpoints under /api:

GET  /healthz                     — returns { status: string }
POST /webhook/tradingview         — accepts JSON or text/plain webhook payload, returns TradeSignal
GET  /signals                     — list signals, params: limit (int), action (string)
GET  /signals/stats               — returns { total, buys, sells, lastSignalAt, tickerBreakdown }
GET  /signals/{id}                — returns single TradeSignal or 404
GET  /signals/{id}/execution      — returns Execution or 404
GET  /executions                  — list executions, param: limit (int)
GET  /settings                    — returns Settings (never returns the raw API token)
PUT  /settings                    — saves settings, accepts SettingsInput
POST /settings/test-connection    — tests Public.com API connectivity

Define schemas for: TradeSignal (all signal fields), SignalStats, Execution,
Settings (hasApiToken: bool instead of the actual token), SettingsInput, ConnectionTestResult.

After creating the spec, run: pnpm --filter @workspace/api-spec run codegen
[/PROMPT]

[/STEP]

[/SECTION]

---

[SECTION:Step 5 — Prompt 4: Backend Routes]

[STEP:5|Paste Prompt 4 into Your Agentic Coder]

[PROMPT:Backend Routes and Public.com Integration]
In artifacts/api-server/src/routes/, create:

1. webhook.ts — POST /webhook/tradingview
   - Parse both JSON and text/plain bodies (text/plain should be JSON.parsed)
   - Insert signal into the signals table
   - After responding, fire-and-forget: call placeOrderForSignal() from lib/public-com.ts
   - Export a formatSignal() helper that maps DB row to API response shape

2. signals.ts — GET /signals, GET /signals/stats, GET /signals/:id
   - /stats counts totals, buy signals (action contains 'buy'), sell signals (action contains 'sell')
   - All routes return formatted signal objects

3. settings.ts — GET/PUT /settings, POST /settings/test-connection, GET /executions, GET /signals/:id/execution
   - PUT /settings upserts a single row (there is only ever one settings row)
   - Never return the raw publicApiToken in GET /settings — return hasApiToken: boolean instead
   - POST /settings/test-connection calls GET /userapigateway/trading/{accountId}/portfolio/v2 on Public.com

4. Create artifacts/api-server/src/lib/public-com.ts:
   - placeOrderForSignal(signalId, { ticker, action, price, quantity })
   - Reads settings from DB, checks autoExecute flag
   - POSTs to https://api.public.com/userapigateway/trading/{accountId}/order
   - Uses Bearer token auth
   - Creates an execution row with status 'pending', updates to 'submitted' or 'failed'
   - If no token configured, creates execution with status 'skipped'

Also add express.text({ type: 'text/plain' }) middleware to app.ts so TradingView plain-text payloads are parsed.
[/PROMPT]

[/STEP]

[/SECTION]

---

[SECTION:Step 6 — Prompt 5: Frontend Dashboard]

[STEP:6|Paste Prompt 5 into Your Agentic Coder]

[PROMPT:Frontend Dashboard]
Build the artifacts/trade-receiver frontend with React, Vite, Tailwind CSS, and shadcn/ui.
Use wouter for routing and @tanstack/react-query with the generated hooks from @workspace/api-client-react.

Pages:
1. / (Home) — Main dashboard with:
   - Header with app name and a link to /settings
   - TradingView Setup card showing the webhook URL (window.location.origin + '/api/webhook/tradingview')
     with a one-click copy button, and a collapsible JSON message template to copy
   - Stats cards: Total Signals, Buy Signals, Sell Signals, Last Signal
   - Live feed table: Time, Ticker, Action badge (green=buy, red=sell), Price, Size, Exchange, Order status badge, Details link
   - Auto-refresh every 5 seconds using refetchInterval: 5000

2. /signals/:id (Signal Detail) — Full detail view showing all signal fields,
   OHLCV bar data section if available, and raw JSON payload

3. /settings (Settings) — Form with:
   - API Token field (password input, masked, leave blank to keep existing)
   - Account ID field
   - Test Connection button that calls POST /api/settings/test-connection
   - Order Type dropdown: MARKET or LIMIT
   - Instrument Type dropdown: EQUITY or CRYPTO
   - Default Quantity number input
   - Time In Force dropdown: DAY or GTC
   - Auto-Execute toggle
   - Save button

Theme: white background, orange primary accent (#F97316), dark text.
Order status badge colors: submitted=blue, filled=green, failed=red, pending=yellow, skipped=gray.
[/PROMPT]

[/STEP]

[/SECTION]

---

[SECTION:Step 7 — Deploy the App]

[STEP:7|Deploy the App]

Once your agentic coder has built everything:

1. Click **Deploy** or **Publish** in your environment
2. You will receive a permanent public URL, for example:

[COPY]
https://my-trading-bot.replit.app
[/COPY]

3. Your webhook URL will be:

[COPY]
https://my-trading-bot.replit.app/api/webhook/tradingview
[/COPY]

Copy that URL and paste it into your TradingView alert (covered in Segment 1).

[/STEP]

[/SECTION]

---

[SECTION:How It All Connects]

[NOTE]
End-to-end flow: TradingView alert fires → POST /api/webhook/tradingview → signal stored in database → response sent back to TradingView → placeOrderForSignal() fires in background → order sent to Public.com API → execution record updated → dashboard reflects new signal and order status within 5 seconds.
[/NOTE]

[/SECTION]

[NAV:Segment 1 — TradingView Setup|Segment 3 — The Public.com API]

[/PAGE]
