# How to Create a Trading Bot with Public.com
## Segment 3: The Public.com Trading API

---

### What Is the Public.com API?

Public.com is a commission-free brokerage that offers a full trading API open to all members — no separate application or approval required. The API supports:

- US stocks and ETFs
- Options (single-leg and multi-leg spreads)
- Crypto
- Bonds
- Fractional shares
- Extended hours trading (up to 16 hours a day for equities)

There are no extra charges for API access itself. Trading fees are the same as using the Public.com app.

**Base URL for all requests:**
```
https://api.public.com
```

---

### Step 1 — Generate Your API Token

1. Log into your Public.com account
2. Go to **Account Settings** (click your profile icon)
3. Click **Security**
4. Scroll to the **API** section
5. Click **Generate API Token**
6. Copy the token immediately — it will not be shown again

Store this token somewhere safe. Never share it publicly or commit it to a code repository. In your app, you will paste it into the Settings page.

---

### Step 2 — Find Your Account ID

Your account ID is required for every trading and portfolio API call. It looks something like `DW1234567890`.

**Option A — Find it in the Public.com app:**
- Go to your account details in the Public.com app or website
- It may be listed under account information or your profile

**Option B — Call the accounts API:**
```bash
curl https://api.public.com/userapigateway/trading/accounts \
  -H "Authorization: Bearer YOUR_API_TOKEN"
```

The response includes your `accountId`. Copy it and paste it into your app's Settings page.

---

### How Authentication Works

Every API request requires a Bearer token in the Authorization header:

```
Authorization: Bearer YOUR_API_TOKEN
```

That is all. No signatures, no OAuth flow, no expiration to manage. The token you generate in account settings works indefinitely until you revoke it.

---

### Understanding Order Types

When your app places an order based on an incoming signal, it uses one of these order types — you choose in your app's Settings:

**MARKET order**
- Executes immediately at the best available price
- You get filled right away but the exact price may differ slightly from the signal price
- Best for: liquid stocks and ETFs where speed matters more than precision

**LIMIT order**
- Only executes at the price you specify (the signal's price)
- May not fill if the market moves away from your price
- Best for: situations where you want price control and are willing to wait

**What the app sends (MARKET example):**
```json
{
  "orderId": "a unique UUID you generate",
  "instrument": {
    "symbol": "AAPL",
    "type": "EQUITY"
  },
  "side": "BUY",
  "type": "MARKET",
  "quantity": "1",
  "expiration": {
    "timeInForce": "DAY"
  }
}
```

**What the app sends (LIMIT example):**
```json
{
  "orderId": "a unique UUID you generate",
  "instrument": {
    "symbol": "AAPL",
    "type": "EQUITY"
  },
  "side": "BUY",
  "type": "LIMIT",
  "limitPrice": "175.50",
  "quantity": "1",
  "expiration": {
    "timeInForce": "DAY"
  }
}
```

---

### Order Parameters Explained

| Parameter | Value | Description |
|---|---|---|
| `orderId` | UUID string | A unique ID you generate for each order. Use `crypto.randomUUID()` in Node.js |
| `instrument.symbol` | `"AAPL"` | The ticker symbol from your TradingView signal |
| `instrument.type` | `"EQUITY"` or `"CRYPTO"` | Set in your app's Settings page |
| `side` | `"BUY"` or `"SELL"` | Derived from the signal's `action` field |
| `type` | `"MARKET"` or `"LIMIT"` | Set in your app's Settings page |
| `limitPrice` | `"175.50"` | Only used when type is LIMIT. Comes from the signal's price |
| `quantity` | `"1"` | Number of shares/units. Falls back to your default quantity setting |
| `timeInForce` | `"DAY"` or `"GTC"` | DAY cancels at market close. GTC stays open until filled or cancelled |

---

### Instrument Types

**EQUITY** — for US stocks and ETFs
- Symbols: `AAPL`, `SPY`, `TSLA`, etc.
- Quantity is in whole or fractional shares

**CRYPTO** — for cryptocurrency
- Symbols: `BTC`, `ETH`, `SOL`, etc. (not trading pair format like `BTCUSD`)
- Quantity supports decimal precision (e.g. `"0.001"`)
- Check Public.com's instruments endpoint for the exact decimal precision supported per coin

---

### Time In Force Options

**DAY** — The order is active for the current trading session only. If it does not fill by market close, it is automatically cancelled.

**GTC (Good Till Cancelled)** — The order stays open until it is filled or you manually cancel it. Can span multiple trading sessions.

For automated trading, **DAY** is typically safer — it prevents stale unfilled orders from sitting open and unexpectedly filling days later.

---

### Checking Your Portfolio and Buying Power

Your app's Test Connection feature calls this endpoint to verify your credentials and show your current buying power:

```
GET /userapigateway/trading/{accountId}/portfolio/v2
Authorization: Bearer YOUR_API_TOKEN
```

**Example response (simplified):**
```json
{
  "accountId": "DW1234567890",
  "accountType": "BROKERAGE",
  "buyingPower": {
    "buyingPower": "5000.00",
    "cashOnlyBuyingPower": "5000.00",
    "optionsBuyingPower": "5000.00"
  },
  "positions": [
    {
      "instrument": { "symbol": "AAPL", "type": "EQUITY" },
      "quantity": "10",
      "currentValue": "1750.00"
    }
  ]
}
```

---

### API Rate Limits

| Operation | Limit |
|---|---|
| Place order | 600 requests per minute |
| Modify order | 600 requests per minute |
| Portfolio / account data | Standard REST limits |

For a signal-driven bot that receives at most a few signals per minute from TradingView, you are nowhere near these limits.

---

### What Happens When an Order Is Placed

Your app records every order attempt in the `executions` table with a status:

| Status | Meaning |
|---|---|
| `pending` | Order is being prepared to send |
| `submitted` | Public.com accepted the order (HTTP 200) |
| `filled` | Order has been filled (requires listening to order events — not in basic setup) |
| `failed` | Public.com rejected the order (bad symbol, insufficient funds, market closed, etc.) |
| `skipped` | Auto-execute was disabled, or no API credentials are configured |

When an order fails, the error message from Public.com is stored and shown in the dashboard so you can diagnose what went wrong.

---

### Official Resources

- **API Documentation:** https://public.com/api/docs
- **Quickstart Guide:** https://public.com/api/docs/quickstart
- **Endpoint Reference:** https://public.com/api/docs/resources
- **Python SDK:** `pip install publicdotcom`
- **CLI Tool:** `pipx install publicdotcom-cli` (lets you place trades from your terminal)
- **Postman Collection:** Available in the docs for testing endpoints without code

---

**Next:** Segment 4 covers connecting your app to your Public.com account — step by step through the Settings page, testing your connection, and verifying your first automated trade.
