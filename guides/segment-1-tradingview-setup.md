[PAGE:1|TradingView Setup]

# How to Create a Trading Bot with Public.com
## Segment 1: Receiving Trade Signals from TradingView

[SECTION:What You're Building]

TradingView is a charting platform where you write trading strategies in a language called Pine Script. When your strategy detects a trade opportunity — called a signal — TradingView can fire an HTTP request called a **webhook** to any URL you give it. Your app receives that request, records the signal, and passes it to your broker.

This segment covers everything you need to do inside TradingView before your app ever sees a trade.

[/SECTION]

---

[SECTION:Step 1 — Write or Upload a Pine Script Strategy]

[STEP:1|Write or Upload a Pine Script Strategy]

Pine Script is TradingView's built-in scripting language. A **strategy** (as opposed to an indicator) is what generates buy and sell orders that can trigger alerts.

**Option A — Write one from scratch:**

1. Open any chart on TradingView
2. At the bottom of the screen, click **Pine Editor**
3. Click **Open** → **New blank strategy**
4. Paste this minimal working example:

[COPY]
//@version=5
strategy("My Bot Strategy", overlay=true)

longCondition = ta.crossover(ta.sma(close, 14), ta.sma(close, 28))
shortCondition = ta.crossunder(ta.sma(close, 14), ta.sma(close, 28))

if (longCondition)
    strategy.entry("Long", strategy.long)

if (shortCondition)
    strategy.entry("Short", strategy.short)
[/COPY]

5. Click **Add to chart** — you will see the strategy appear on the chart with trade markers

**Option B — Paste an existing strategy:**

1. Open the Pine Editor
2. Select all the existing code and delete it
3. Paste your strategy code
4. Click **Add to chart**

[TIP]
For your agentic coder: paste this prompt — "Write a Pine Script v5 strategy that [describe your logic, e.g. 'buys when RSI crosses above 30 and sells when RSI crosses below 70']. Use strategy.entry() to open positions and strategy.close() to exit. Name the strategy My Bot Strategy."
[/TIP]

[/STEP]

[/SECTION]

---

[SECTION:Step 2 — Create an Alert on Your Strategy]

[STEP:2|Create an Alert on Your Strategy]

Once your strategy is on the chart:

1. Click the **alarm clock icon** in the top toolbar (or press [KEY]Alt+A[/KEY])
2. Click **Create Alert**
3. In the alert dialog, configure the **Condition** tab:
   - **First dropdown:** Select your strategy name — e.g. [KEY]My Bot Strategy[/KEY]
   - **Second dropdown:** Select [KEY]Order fills[/KEY] — this fires the alert every time your strategy places an order
4. Set **Expiration** — choose a date far in the future, or select Open-ended if available on your plan

[/STEP]

[/SECTION]

---

[SECTION:Step 3 — Configure the Webhook URL]

[STEP:3|Configure the Webhook URL]

1. In the alert dialog, click the **Notifications** tab
2. Check the box next to **Webhook URL**
3. Paste your app's webhook URL into the field:

[COPY]
https://your-app.replit.app/api/webhook/tradingview
[/COPY]

[NOTE]
Copy this URL from the TradingView Setup card on your dashboard. It displays your exact deployed domain automatically — you do not need to type it manually.
[/NOTE]

[/STEP]

[/SECTION]

---

[SECTION:Step 4 — Write the Alert Message]

[STEP:4|Write the Alert Message]

TradingView sends exactly what you write in the Message box. It replaces [KEY]{{placeholder}}[/KEY] variables with live data when the alert fires.

In the **Message** box, paste this complete template:

[COPY]
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
[/COPY]

[TABLE]
| Placeholder | What it sends |
|---|---|
| `{{strategy.order.action}}` | "buy" or "sell" |
| `{{ticker}}` | Symbol, e.g. AAPL or BTCUSD |
| `{{exchange}}` | Exchange name, e.g. NASDAQ or BINANCE |
| `{{interval}}` | Chart timeframe, e.g. 60 for 1h, D for daily |
| `{{close}}` | Closing price at alert time |
| `{{open}}` / `{{high}}` / `{{low}}` | OHLC bar data |
| `{{volume}}` | Bar volume |
| `{{time}}` | UTC timestamp the alert fired |
| `{{strategy.position_size}}` | Current position size |
| `{{strategy.order.price}}` | Fill price of the order |
| `{{strategy.order.id}}` | Order identifier string |
[/TABLE]

[WARN]
Numeric placeholders like {{close}}, {{volume}}, and {{strategy.position_size}} must NOT be wrapped in quotes. They need to be raw numbers so the JSON stays valid. Only string placeholders like {{ticker}} and {{time}} go inside quotes.
[/WARN]

[NOTE]
For indicator alerts (not strategy alerts): the {{strategy.*}} placeholders will not work. Replace {{strategy.order.action}} with a hard-coded value like "buy" or "sell" depending on what condition you are alerting on. All other placeholders like {{ticker}} and {{close}} still work normally.
[/NOTE]

[/STEP]

[/SECTION]

---

[SECTION:Step 5 — Save and Test the Alert]

[STEP:5|Save and Test the Alert]

1. Click **Create** to save the alert
2. Open your dashboard and watch the **Live Feed** — it auto-refreshes every 5 seconds
3. When the alert condition triggers on the chart, you will see the signal appear within seconds

**To trigger a test immediately** without waiting for your real strategy to fire:

1. Set the alert condition to something currently true (e.g. [KEY]close > 0[/KEY])
2. On a 1-minute chart, set frequency to **Once Per Bar**
3. A signal will arrive every minute
4. Once you see it on the dashboard, your connection is working — switch back to your real strategy condition

**To check if TradingView is successfully delivering webhooks:**

1. Go to **Alerts** in the right sidebar
2. Find your alert and click it
3. Check the **Alert Log** — there is a Webhook Status column that shows success or failure for each delivery

[/STEP]

[/SECTION]

---

[SECTION:TradingView Rate Limits]

[NOTE]
Alerts fire at most once per bar. On a 1-minute chart that is once per minute. On a 4-hour chart, once per 4 hours. If an alert fires more than 15 times in 3 minutes, TradingView pauses it automatically. Free accounts are limited to a small number of active alerts — paid plans allow more.
[/NOTE]

[/SECTION]

[NAV:none|Segment 2 — Building the App]

[/PAGE]
