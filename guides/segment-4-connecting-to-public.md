# How to Create a Trading Bot with Public.com
## Segment 4: Connecting Your App to Your Public.com Account

---

### What This Segment Covers

At this point you have:
- A TradingView strategy with an alert configured (Segment 1)
- A deployed receiver app with a live webhook URL (Segment 2)
- An understanding of how the Public.com API works (Segment 3)

This segment walks you through entering your credentials into the app, testing the connection, choosing your order settings, and verifying that a real end-to-end trade fires correctly.

---

### Step 1 — Open the Settings Page

In your deployed app, click the **Settings** button in the top-right corner of the dashboard.

You will see the following sections:

- **Public.com API** — your credentials
- **Order Settings** — how orders are placed
- **Auto-Execute toggle** — whether to place orders at all

---

### Step 2 — Enter Your API Token

1. In the **API Token** field, paste the token you generated from Public.com (Account Settings → Security → API)
2. The field is masked by default — click the eye icon to reveal what you typed and confirm it pasted correctly
3. You do not need to re-enter the token on future visits. Once saved, the field will show placeholder dots and the status badge will change to **Connected**

> **Security note:** Your token is stored in the database on your server. It is never sent to the browser. The Settings page only ever receives a `hasApiToken: true/false` flag — not the token itself.

---

### Step 3 — Enter Your Account ID

1. Paste your Public.com account ID into the **Account ID** field
2. It looks something like `DW1234567890`
3. If you do not know it, call the accounts endpoint from your terminal:

```bash
curl https://api.public.com/userapigateway/trading/accounts \
  -H "Authorization: Bearer YOUR_API_TOKEN"
```

The `accountId` field in the response is what you need.

---

### Step 4 — Test the Connection

Before saving, click **Test Connection**.

The app will call the Public.com portfolio endpoint using your token and account ID. If it succeeds, you will see:

```
Connected successfully
Account type: BROKERAGE
Buying power: $5,000.00
```

If it fails, you will see an error message. Common causes:

| Error | Fix |
|---|---|
| `401 Unauthorized` | Your token is wrong or expired — regenerate it in Public.com |
| `404 Not Found` | Your account ID is wrong — double-check it |
| `Connection refused` | Your app cannot reach the Public.com API — check your server is running |
| `403 Forbidden` | Your account may not have API access enabled |

Fix the error and test again before proceeding.

---

### Step 5 — Choose Your Order Settings

**Order Type**

| Option | What it does |
|---|---|
| **Market** | Buys or sells immediately at the best available price. Fast, always fills during market hours. |
| **Limit** | Only fills at the exact price from the signal. May not fill if price moves away. |

*Recommendation for beginners: start with Market orders so you always get filled and can verify the pipeline works.*

**Instrument Type**

| Option | When to use |
|---|---|
| **Equity** | For US stocks and ETFs (AAPL, SPY, QQQ, etc.) |
| **Crypto** | For cryptocurrency (BTC, ETH, SOL, etc.) |

This must match the type of assets your TradingView strategy trades. If you trade both, you will need separate strategies and separate alert setups.

**Default Quantity**

This is the number of shares (or crypto units) to buy or sell per signal.

- Enter `1` to trade one share per signal
- Enter `0.01` for fractional shares (e.g. $1.75 worth of AAPL)
- Enter `10` to trade 10 shares per signal

If your TradingView alert message includes a `quantity` field (from `{{strategy.order.contracts}}`), that value takes priority over this default. The default is only used when the signal does not specify a quantity.

> **Important:** Make sure your buying power in Public.com can cover the trade. If you set quantity to 10 and the stock is $500, each signal will attempt to place a $5,000 order.

**Time In Force**

| Option | What it does |
|---|---|
| **DAY** | Order cancels automatically at market close if not filled. Safest for automation. |
| **GTC** | Order stays open until filled or manually cancelled. Can fill days later unexpectedly. |

*Recommendation: use DAY for automated trading.*

---

### Step 6 — Configure the Auto-Execute Toggle

The **Auto-Execute** toggle controls whether the app actually sends orders to Public.com.

| Toggle State | What happens when a signal arrives |
|---|---|
| **On** | Signal is stored AND an order is placed on Public.com automatically |
| **Off** | Signal is stored, but no order is placed. Status shows as `skipped`. |

Use the toggle to:
- **Test your TradingView setup** without risking real trades — turn it off, fire some test alerts, confirm signals appear, then turn it back on
- **Pause the bot** without deleting your credentials
- **Go live** when you are confident the end-to-end flow is working

---

### Step 7 — Save Your Settings

Click **Save Settings**. You will see a confirmation toast. Your settings are now stored and the bot is live.

---

### Step 8 — Verify Your First Automated Trade

1. Make sure **Auto-Execute** is on
2. Trigger a TradingView alert (either wait for your real strategy condition, or use a test condition)
3. Watch the **Live Feed** on your dashboard — within seconds you should see:
   - A new signal row appear
   - The **ORDER** column show a status badge

**Status badge meanings:**

| Badge | Color | Meaning |
|---|---|---|
| `submitted` | Blue | Public.com accepted the order |
| `filled` | Green | Order has been filled |
| `failed` | Red | Public.com rejected the order — check the signal detail for the error |
| `pending` | Yellow | Order is being processed |
| `skipped` | Gray | Auto-execute is off, or no credentials configured |

Click **Details** on any signal row to see the full breakdown — including the exact error message from Public.com if the order failed.

---

### Common Issues and Fixes

**Order shows `failed` with "Insufficient funds"**
- Your buying power is too low for the quantity and price
- Reduce your Default Quantity in Settings, or deposit more funds in your Public.com account

**Order shows `failed` with "Market closed"**
- Stocks trade 9:30am–4pm ET on weekdays
- Signals that arrive outside market hours will fail with a market order
- Either set Time In Force to GTC (so the order queues for the next open), or add logic to your Pine Script to only fire alerts during market hours

**Order shows `submitted` but nothing appears in Public.com**
- Wait a few seconds and refresh Public.com — submitted means accepted, not necessarily filled yet
- For market orders, a submitted order should fill within milliseconds during market hours

**Signal appears but ORDER column shows nothing**
- Your credentials may not be saved — go back to Settings and confirm the Connected badge is shown
- Auto-Execute may be off

**Signals are not appearing at all**
- Confirm your TradingView alert is using the correct webhook URL from the Setup card on the dashboard
- Check the TradingView alert log (Alerts panel → your alert → history) for webhook delivery failures
- Make sure your app is deployed and running — the webhook URL must be publicly reachable

---

### You're Live

Once you see `submitted` badges appearing on your signals, your full pipeline is working:

```
TradingView strategy fires
        ↓
Webhook received by your app
        ↓
Signal recorded in database
        ↓
Order placed on Public.com
        ↓
Execution status tracked on dashboard
```

From here, you can refine your Pine Script strategy, adjust order sizing, and monitor performance through the Live Feed and signal detail views.
