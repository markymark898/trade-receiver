[PAGE:3|The Public.com API]

# How to Create a Trading Bot with Public.com
## Segment 3: The Public.com Trading API

[SECTION:What Is the Public.com API?]

Public.com is a commission-free brokerage that offers a full trading API open to all members — no separate application or approval required. The API supports US stocks and ETFs, options, crypto, bonds, fractional shares, and extended hours trading up to 16 hours a day for equities. There are no extra charges for API access. Trading fees are the same as using the Public.com app.

[COPY]
https://api.public.com
[/COPY]

This is the base URL for all API requests.

[/SECTION]

---

[SECTION:Step 1 — Generate Your API Token]

[STEP:1|Generate Your API Token]

1. Log into your Public.com account
2. Go to **Account Settings** — click your profile icon
3. Click **Security**
4. Scroll to the **API** section
5. Click **Generate API Token**
6. Copy the token immediately — it will not be shown again

[WARN]
Never share your API token publicly or commit it to a code repository. In your app, paste it into the Settings page — it is stored securely on your server and never exposed to the browser.
[/WARN]

[/STEP]

[/SECTION]

---

[SECTION:Step 2 — Find Your Account ID]

[STEP:2|Find Your Account ID]

Your account ID is required for every trading and portfolio API call. It looks like [KEY]DW1234567890[/KEY].

**Option A — Check the Public.com app:**
Go to your account details in the app or website. It may be listed under account information or your profile.

**Option B — Call the accounts API:**

[CMD]
curl https://api.public.com/userapigateway/trading/accounts \
  -H "Authorization: Bearer YOUR_API_TOKEN"
[/CMD]

The [KEY]accountId[/KEY] field in the response is what you need. Copy it and paste it into your app's Settings page.

[/STEP]

[/SECTION]

---

[SECTION:How Authentication Works]

Every API request requires a Bearer token in the Authorization header:

[COPY]
Authorization: Bearer YOUR_API_TOKEN
[/COPY]

[NOTE]
That is all the authentication required. No signatures, no OAuth flow, no expiration to manage. The token you generate in account settings works indefinitely until you revoke it.
[/NOTE]

[/SECTION]

---

[SECTION:Order Types]

[TABLE]
| Order Type | What it does | Best for |
|---|---|---|
| MARKET | Executes immediately at the best available price | Liquid stocks and ETFs where speed matters |
| LIMIT | Only executes at the exact price you specify | Price-sensitive entries where you can wait |
[/TABLE]

**MARKET order body — what your app sends:**

[COPY]
{
  "orderId": "a-unique-uuid-you-generate",
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
[/COPY]

**LIMIT order body — what your app sends:**

[COPY]
{
  "orderId": "a-unique-uuid-you-generate",
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
[/COPY]

[/SECTION]

---

[SECTION:Order Parameters Explained]

[TABLE]
| Parameter | Example value | Description |
|---|---|---|
| orderId | "550e8400-..." | A unique UUID per order. Use crypto.randomUUID() in Node.js |
| instrument.symbol | "AAPL" | Ticker symbol from your TradingView signal |
| instrument.type | "EQUITY" or "CRYPTO" | Set in your app Settings page |
| side | "BUY" or "SELL" | Derived from the signal's action field |
| type | "MARKET" or "LIMIT" | Set in your app Settings page |
| limitPrice | "175.50" | Only used when type is LIMIT — comes from signal price |
| quantity | "1" | Shares or units. Falls back to your default quantity setting |
| timeInForce | "DAY" or "GTC" | DAY cancels at close. GTC stays open until filled |
[/TABLE]

[/SECTION]

---

[SECTION:Instrument Types]

**EQUITY** — US stocks and ETFs
- Symbols: [KEY]AAPL[/KEY], [KEY]SPY[/KEY], [KEY]TSLA[/KEY], etc.
- Quantity is in whole or fractional shares

**CRYPTO** — Cryptocurrency
- Symbols: [KEY]BTC[/KEY], [KEY]ETH[/KEY], [KEY]SOL[/KEY] — not trading pair format like BTCUSD
- Quantity supports decimal precision (e.g. [KEY]0.001[/KEY])

[WARN]
Crypto symbols on Public.com use the base currency only (BTC, not BTCUSD). If your TradingView signal sends BTCUSD, your app needs to strip the USD suffix before sending the order.
[/WARN]

[/SECTION]

---

[SECTION:Time In Force Options]

[TABLE]
| Option | What it does | Recommendation |
|---|---|---|
| DAY | Order cancels at market close if unfilled | Use for automated bots — safest option |
| GTC | Order stays open until filled or cancelled | Can fill unexpectedly days later |
[/TABLE]

[/SECTION]

---

[SECTION:Checking Portfolio and Buying Power]

Your app's Test Connection feature calls this endpoint:

[CMD]
GET https://api.public.com/userapigateway/trading/{accountId}/portfolio/v2
Authorization: Bearer YOUR_API_TOKEN
[/CMD]

**Example response (simplified):**

[COPY]
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
[/COPY]

[/SECTION]

---

[SECTION:Execution Status Tracking]

Your app records every order attempt with one of these statuses:

[TABLE]
| Status | Meaning |
|---|---|
| pending | Order is being prepared to send |
| submitted | Public.com accepted the order (HTTP 200) |
| filled | Order has been filled |
| failed | Public.com rejected the order — error message is stored |
| skipped | Auto-execute was disabled or no credentials configured |
[/TABLE]

[/SECTION]

---

[SECTION:API Rate Limits]

[TABLE]
| Operation | Limit |
|---|---|
| Place order | 600 requests per minute |
| Modify order | 600 requests per minute |
| Portfolio / account data | Standard REST limits |
[/TABLE]

[NOTE]
A signal-driven bot receiving a few signals per minute from TradingView is far below these limits under normal use.
[/NOTE]

[/SECTION]

---

[SECTION:Official Resources]

[TABLE]
| Resource | URL |
|---|---|
| API Documentation | https://public.com/api/docs |
| Quickstart Guide | https://public.com/api/docs/quickstart |
| Endpoint Reference | https://public.com/api/docs/resources |
| Python SDK | pip install publicdotcom |
| CLI Tool | pipx install publicdotcom-cli |
[/TABLE]

[/SECTION]

[NAV:Segment 2 — Building the App|Segment 4 — Connecting to Public.com]

[/PAGE]
