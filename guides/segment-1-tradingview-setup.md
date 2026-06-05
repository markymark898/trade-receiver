# How to Create a Trading Bot with Public.com
## Segment 1: Receiving Trade Signals from TradingView

---

### What You're Building

TradingView is a charting platform where you write trading strategies in a language called Pine Script. When your strategy detects a trade opportunity — a "signal" — TradingView can fire an HTTP request called a **webhook** to any URL you give it. Your app receives that request, records the signal, and passes it to your broker.

This segment covers everything you need to do inside TradingView.

---

### Step 1 — Write or Upload a Pine Script Strategy

Pine Script is TradingView's built-in scripting language. A **strategy** (as opposed to an indicator) is what generates buy/sell signals that can trigger alerts.

**Option A — Write one from scratch:**

1. Open any chart on TradingView
2. At the bottom of the screen, click **Pine Editor**
3. Click **Open** → **New blank strategy**
4. Write your logic. A minimal working example:

```pine
//@version=5
strategy("My Bot Strategy", overlay=true)

longCondition = ta.crossover(ta.sma(close, 14), ta.sma(close, 28))
shortCondition = ta.crossunder(ta.sma(close, 14), ta.sma(close, 28))

if (longCondition)
    strategy.entry("Long", strategy.long)

if (shortCondition)
    strategy.entry("Short", strategy.short)
```

5. Click **Add to chart** — you'll see the strategy appear on the chart with trade markers

**Option B — Paste an existing strategy:**

1. Open the Pine Editor
2. Select all the existing code and delete it
3. Paste your strategy code
4. Click **Add to chart**

> **For your agentic coder:** Ask it to "write a Pine Script v5 strategy that [describe your logic, e.g. 'buys when RSI crosses above 30 and sells when RSI crosses below 70']. It should use `strategy.entry()` to open positions and `strategy.close()` to exit. The strategy name should be `My Bot Strategy`."

---

### Step 2 — Create an Alert on Your Strategy

Once your strategy is on the chart:

1. Click the **alarm clock icon** in the top toolbar (or press `Alt+A`)
2. Click **Create Alert**
3. In the alert dialog, configure the **Condition** tab:
   - **First dropdown:** Select your strategy name (e.g. `My Bot Strategy`)
   - **Second dropdown:** Select `Order fills` — this fires the alert every time your strategy places an order
4. Set **Expiration** — choose a date far in the future, or select "Open-ended" if available on your plan

---

### Step 3 — Configure the Webhook URL

This is where you connect TradingView to your app.

1. In the alert dialog, click the **Notifications** tab
2. Check the box next to **Webhook URL**
3. Paste your app's webhook URL:

```
https://your-app.replit.app/api/webhook/tradingview
```

*(Copy this from the TradingView Setup card on your dashboard — it is shown there automatically based on your deployed domain)*

---

### Step 4 — Write the Alert Message

TradingView sends **exactly what you write** in the Message box. It supports special `{{placeholder}}` variables that get filled in with live data when the alert fires.

In the **Message** box, paste this complete template:

```json
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
```

**Key placeholders explained:**

| Placeholder | What it sends |
|---|---|
| `{{strategy.order.action}}` | `"buy"` or `"sell"` |
| `{{ticker}}` | Symbol, e.g. `AAPL` or `BTCUSD` |
| `{{exchange}}` | Exchange name, e.g. `BINANCE` or `NASDAQ` |
| `{{interval}}` | Chart timeframe, e.g. `60` for 1h, `D` for daily |
| `{{close}}` | Closing price of the bar at alert time |
| `{{open}}` / `{{high}}` / `{{low}}` | OHLC bar data |
| `{{volume}}` | Bar volume |
| `{{time}}` | UTC timestamp the alert fired |
| `{{strategy.position_size}}` | Your current position size |
| `{{strategy.order.price}}` | Fill price of the order |
| `{{strategy.order.id}}` | Order identifier string |

**Important formatting rules:**

- Numeric placeholders (`{{close}}`, `{{volume}}`, `{{strategy.position_size}}`, etc.) must **not** be wrapped in quotes — they need to be raw numbers so the JSON stays valid
- String placeholders like `{{ticker}}` and `{{time}}` must be wrapped in `"quotes"`

> **For indicator alerts (not strategy alerts):** The `{{strategy.*}}` placeholders will not work. Replace `{{strategy.order.action}}` with a hard-coded value like `"buy"` or `"sell"` depending on what condition you are alerting on. Everything else (`{{ticker}}`, `{{close}}`, etc.) still works normally.

---

### Step 5 — Save and Test the Alert

1. Click **Create** to save the alert
2. Open your dashboard and watch the **Live Feed** — it auto-refreshes every 5 seconds
3. When the alert condition triggers on the chart, you will see the signal appear within seconds

**To trigger a test immediately** without waiting for your real strategy to fire:

- Set the alert condition to something that is currently true (e.g. `close > 0`)
- On a 1-minute chart, set frequency to **Once Per Bar**
- It will fire every minute — once you see a signal appear on the dashboard, your connection is confirmed
- Switch the condition back to your real strategy logic when you are done testing

---

### Monitoring Delivery

TradingView logs every alert firing. To check if webhooks are reaching your app:

1. Go to **Alerts** in the right sidebar
2. Find your alert and click it
3. Check the **Alert Log** — there is a **Webhook Status** column that shows whether each delivery succeeded or failed

---

### TradingView Rate Limits

- Alerts fire at most **once per bar** — on a 1-minute chart that is once per minute, a 4-hour chart is once per 4 hours
- If a script alert fires more than **15 times in 3 minutes**, TradingView pauses it automatically
- Free TradingView accounts are limited to a small number of active alerts — paid plans allow more

---

**Next:** Segment 2 covers building the receiver app — the server and dashboard that captures these signals and stores them.
