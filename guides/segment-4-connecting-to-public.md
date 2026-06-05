[PAGE:4|Connecting to Public.com]

# How to Create a Trading Bot with Public.com
## Segment 4: Connecting Your App to Your Public.com Account

[SECTION:Before You Begin]

At this point you should have:

- A TradingView strategy with an alert configured (Segment 1)
- A deployed receiver app with a live webhook URL (Segment 2)
- Your Public.com API token and account ID (Segment 3)

This segment walks you through entering your credentials, testing the connection, choosing order settings, and verifying your first automated trade.

[/SECTION]

---

[SECTION:Step 1 — Open the Settings Page]

[STEP:1|Open the Settings Page]

In your deployed app, click the **Settings** button in the top-right corner of the dashboard.

You will see three sections:

- **Public.com API** — your credentials
- **Order Settings** — how orders are placed
- **Auto-Execute toggle** — whether to place live orders

[/STEP]

[/SECTION]

---

[SECTION:Step 2 — Enter Your API Token]

[STEP:2|Enter Your API Token]

1. Click the **API Token** field
2. Paste the token you generated from Public.com (Account Settings → Security → API)
3. The field is masked — click the eye icon to confirm it pasted correctly
4. You do not need to re-enter it on future visits. Once saved, the field shows placeholder dots and the status badge changes to **Connected**

[NOTE]
Your token is stored in the database on your server. It is never sent to the browser. The Settings page only ever receives a hasApiToken: true or false flag — not the token itself.
[/NOTE]

[/STEP]

[/SECTION]

---

[SECTION:Step 3 — Enter Your Account ID]

[STEP:3|Enter Your Account ID]

1. Paste your Public.com account ID into the **Account ID** field
2. It looks like [KEY]DW1234567890[/KEY]
3. If you are not sure what it is, run this command from your terminal:

[CMD]
curl https://api.public.com/userapigateway/trading/accounts \
  -H "Authorization: Bearer YOUR_API_TOKEN"
[/CMD]

The [KEY]accountId[/KEY] field in the response is what to paste.

[/STEP]

[/SECTION]

---

[SECTION:Step 4 — Test the Connection]

[STEP:4|Test the Connection]

Before saving, click **Test Connection**.

The app calls the Public.com portfolio endpoint using your token and account ID. If it succeeds, you will see your account type and buying power displayed.

If it fails, use this table to fix the issue:

[TABLE]
| Error message | Fix |
|---|---|
| 401 Unauthorized | Your token is wrong or expired — regenerate it in Public.com |
| 404 Not Found | Your account ID is wrong — double-check it |
| Connection refused | Your server is not running — restart it |
| 403 Forbidden | API access may not be enabled on your account |
[/TABLE]

Fix the error and test again before proceeding.

[/STEP]

[/SECTION]

---

[SECTION:Step 5 — Choose Your Order Settings]

[STEP:5|Choose Your Order Settings]

**Order Type**

[TABLE]
| Option | What it does | When to use |
|---|---|---|
| Market | Buys or sells immediately at the best available price | Always fills — best for beginners |
| Limit | Only fills at the exact price from the signal | Use when price precision matters |
[/TABLE]

[TIP]
Start with Market orders. They always fill during market hours, which makes it easier to verify that your end-to-end pipeline is working before optimizing for price.
[/TIP]

**Instrument Type**

[TABLE]
| Option | When to use |
|---|---|
| Equity | US stocks and ETFs — AAPL, SPY, QQQ, etc. |
| Crypto | Cryptocurrency — BTC, ETH, SOL, etc. |
[/TABLE]

[WARN]
This setting must match the type of assets your TradingView strategy trades. If you trade both stocks and crypto, you will need two separate strategies with two separate alert setups.
[/WARN]

**Default Quantity**

This is how many shares (or crypto units) to buy or sell per signal.

[TABLE]
| Value | What gets traded |
|---|---|
| 1 | One share per signal |
| 0.01 | Fractional share (e.g. ~$1.75 worth of AAPL) |
| 10 | Ten shares per signal |
[/TABLE]

[WARN]
Make sure your buying power covers the trade. If you set quantity to 10 and the stock is $500, each signal will attempt a $5,000 order.
[/WARN]

[NOTE]
If your TradingView alert message includes a quantity field, that value takes priority over your default. The default is only used when the signal does not include one.
[/NOTE]

**Time In Force**

[TABLE]
| Option | What it does |
|---|---|
| DAY | Order cancels automatically at market close if not filled |
| GTC | Order stays open until filled or manually cancelled |
[/TABLE]

[TIP]
Use DAY for automated trading. It prevents stale unfilled orders from sitting open and unexpectedly filling on a different day.
[/TIP]

[/STEP]

[/SECTION]

---

[SECTION:Step 6 — Configure Auto-Execute]

[STEP:6|Configure the Auto-Execute Toggle]

The **Auto-Execute** toggle controls whether the app places real orders on Public.com.

[TABLE]
| Toggle | What happens when a signal arrives |
|---|---|
| On | Signal is stored AND an order is placed on Public.com |
| Off | Signal is stored only — no order placed. Status shows as skipped. |
[/TABLE]

[TIP]
Turn Auto-Execute OFF while you are testing your TradingView setup. Fire some test alerts, confirm signals appear on your dashboard, then turn it back ON when you are ready to go live.
[/TIP]

[/STEP]

[/SECTION]

---

[SECTION:Step 7 — Save and Go Live]

[STEP:7|Save and Go Live]

Click **Save Settings**. You will see a confirmation message. Your settings are now stored and the bot is active.

[/STEP]

[/SECTION]

---

[SECTION:Step 8 — Verify Your First Automated Trade]

[STEP:8|Verify Your First Automated Trade]

1. Make sure **Auto-Execute** is on
2. Trigger a TradingView alert — either wait for your real strategy condition, or use a quick test condition
3. Watch the **Live Feed** on your dashboard — within seconds you should see a new row appear

**Order status badge meanings:**

[TABLE]
| Badge | Color | Meaning |
|---|---|---|
| submitted | Blue | Public.com accepted the order |
| filled | Green | Order has been filled |
| failed | Red | Public.com rejected the order — click Details for the error |
| pending | Yellow | Order is being processed |
| skipped | Gray | Auto-execute is off or no credentials configured |
[/TABLE]

Click **Details** on any signal row to see the full breakdown, including the exact error message from Public.com if anything went wrong.

[/STEP]

[/SECTION]

---

[SECTION:Troubleshooting Common Issues]

[TABLE]
| Issue | Fix |
|---|---|
| Order shows failed: Insufficient funds | Reduce Default Quantity in Settings, or deposit more funds |
| Order shows failed: Market closed | Use GTC so the order queues for next open, or restrict your strategy to market hours |
| Order submitted but not in Public.com | Wait a few seconds — submitted means accepted, not necessarily filled yet |
| ORDER column empty | Check Settings — confirm the Connected badge is showing and Auto-Execute is on |
| No signals appearing at all | Confirm the webhook URL in TradingView matches exactly what is shown on your dashboard |
[/TABLE]

[/SECTION]

---

[SECTION:You're Live]

[NOTE]
Once you see submitted badges appearing on your signals, the full pipeline is working: TradingView strategy fires → webhook received → signal stored → order placed on Public.com → execution status tracked on your dashboard.
[/NOTE]

From here you can refine your Pine Script strategy, adjust order sizing, and monitor performance through the Live Feed and signal detail views.

[/SECTION]

[NAV:Segment 3 — The Public.com API|none]

[/PAGE]
