[PAGE:1|Complete Guide]

# How to Create a Trading Bot with Public.com
## A Step-by-Step Guide — From Zero to Live Automated Trading

[SECTION:What You're Building]

By the end of this guide you will have:

- A live web app that receives trade signals from TradingView and executes them automatically on your Public.com brokerage account
- A dashboard where you can see every signal, every order, and every execution status in real time
- Full control over what gets traded — you can pause auto-execution at any time

The only things you type in this guide are: your Public.com credentials (once, into your app's Settings page), and the alert message in TradingView. Everything else is handled for you.

[/SECTION]

---

[SECTION:What You Need Before Starting]

[TABLE]
| Requirement | Where to get it |
|---|---|
| Replit account (free) | replit.com |
| TradingView account (free or paid) | tradingview.com |
| Public.com brokerage account | public.com |
[/TABLE]

[NOTE]
TradingView's free plan supports a limited number of active alerts. If you plan to run multiple strategies at once, a paid plan gives you more. Everything in this guide works on the free plan for getting started.
[/NOTE]

[/SECTION]

---

[SECTION:Step 1 — Build the App on Replit]

[STEP:1|Build the App on Replit]

The entire app — backend, database, and dashboard — is built for you by Replit's AI agent. You just hand it the build file.

1. Download the file **build-prompt.md** from the Guide Assets page of this app
2. Open **replit.com** and create a new project (choose any Node.js or blank template)
3. Open the AI agent inside your Replit project
4. Open the downloaded **build-prompt.md** file in any text editor, select all, and copy the entire contents
5. Paste it into the Replit agent chat and press send
6. The agent will build the complete app — this takes a few minutes. Do not interrupt it.

[TIP]
If the agent stops and asks you a question, answer it and let it continue. If it hits an error, tell it: "Fix the error and continue." It will sort itself out.
[/TIP]

[/STEP]

[/SECTION]

---

[SECTION:Step 2 — Deploy the App]

[STEP:2|Deploy the App and Get Your Webhook URL]

Once the agent finishes building:

1. Click **Deploy** (or **Publish**) in your Replit project
2. You will receive a permanent public URL that looks like:

[COPY]
https://your-app-name.replit.app
[/COPY]

3. Open your deployed app — you will see the dashboard
4. At the top of the dashboard is your **webhook URL**. It looks like this:

[COPY]
https://your-app-name.replit.app/api/webhook/tradingview
[/COPY]

Copy this URL — you will paste it into TradingView in the next step.

[NOTE]
The dashboard shows your exact deployed URL automatically. You do not need to construct it manually.
[/NOTE]

[/STEP]

[/SECTION]

---

[SECTION:Step 3 — Set Up TradingView]

[STEP:3|Add a Pine Script Strategy to Your Chart]

TradingView strategies generate buy and sell signals that trigger webhooks. If you already have a strategy you want to use, skip to Step 4.

To add a simple working strategy:

1. Open any chart on TradingView
2. At the bottom, click **Pine Editor**
3. Select all existing code, delete it, and paste this:

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

4. Click **Add to chart**

[/STEP]

[STEP:4|Create a Webhook Alert]

1. Click the **alarm clock icon** in the top toolbar (or press [KEY]Alt+A[/KEY])
2. Click **Create Alert**
3. In the **Condition** tab:
   - First dropdown: select your strategy name — e.g. [KEY]My Bot Strategy[/KEY]
   - Second dropdown: select [KEY]Order fills[/KEY]
4. Set **Expiration** to a date far in the future (or open-ended)
5. Click the **Notifications** tab
6. Check **Webhook URL** and paste your webhook URL from Step 2

[/STEP]

[STEP:5|Paste the Alert Message]

Still in the alert dialog, click into the **Message** box, clear it, and paste this exactly:

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

[WARN]
Do not add quotes around the numeric placeholders — {{close}}, {{volume}}, {{strategy.position_size}}, etc. must be bare numbers in the JSON or the webhook will fail.
[/WARN]

[NOTE]
TradingView replaces every {{placeholder}} with real data when the alert fires. The {{strategy.*}} placeholders only work with Strategy alerts, not indicator alerts.
[/NOTE]

Click **Create** to save the alert.

[/STEP]

[/SECTION]

---

[SECTION:Step 4 — Get Your Public.com Credentials]

[STEP:6|Generate Your API Token]

1. Log into **public.com**
2. Click your profile icon → **Account Settings** → **Security**
3. Scroll to the **API** section and click **Generate API Token**
4. Copy the token immediately — it will not be shown again

[WARN]
Keep this token private. Do not paste it anywhere except your app's Settings page.
[/WARN]

[/STEP]

[STEP:7|Find Your Account ID]

Your account ID looks like [KEY]DW1234567890[/KEY]. To find it, run this in your terminal (replace YOUR_TOKEN with the token you just copied):

[CMD]
curl https://api.public.com/userapigateway/trading/accounts \
  -H "Authorization: Bearer YOUR_TOKEN"
[/CMD]

Copy the [KEY]accountId[/KEY] value from the response.

[/STEP]

[/SECTION]

---

[SECTION:Step 5 — Connect Your App to Public.com]

[STEP:8|Enter Your Credentials in Settings]

1. Open your deployed app and click **Settings** in the top-right
2. Paste your **API Token** into the API Token field (click the eye icon to confirm it pasted)
3. Paste your **Account ID** into the Account ID field
4. Click **Test Connection** — you should see your account type and buying power appear

[TABLE]
| Test result | What to do |
|---|---|
| Shows buying power | You're connected — continue to next step |
| 401 Unauthorized | Token is wrong — regenerate it on public.com |
| 404 Not Found | Account ID is wrong — re-check it |
| Connection refused | Your server is not running — restart the Replit workflow |
[/TABLE]

[/STEP]

[STEP:9|Choose Your Order Settings]

Still on the Settings page, configure how orders are placed:

[TABLE]
| Setting | Recommendation for beginners |
|---|---|
| Order Type | Market — always fills immediately during market hours |
| Instrument Type | Equity for stocks/ETFs, Crypto for cryptocurrency |
| Default Quantity | Start with 1 share |
| Time In Force | DAY — cancels automatically at market close if unfilled |
[/TABLE]

[WARN]
Make sure your buying power covers your trades. If Default Quantity is 10 and the stock costs $500, each signal will attempt a $5,000 order.
[/WARN]

[TIP]
Turn **Auto-Execute OFF** the first time you test. Fire a few TradingView alerts, confirm they show up in your dashboard, then turn it back ON when you are ready to go live.
[/TIP]

[/STEP]

[STEP:10|Save and Go Live]

Click **Save Settings**. Auto-Execute is now on. Your bot is live.

[/STEP]

[/SECTION]

---

[SECTION:Step 6 — Verify Everything Is Working]

[STEP:11|Watch Your First Signal Come In]

1. Trigger a TradingView alert — either wait for your strategy condition to fire, or temporarily set the condition to something currently true (like [KEY]close > 0[/KEY])
2. Watch the **Live Feed** on your dashboard — it refreshes every 5 seconds
3. You should see a new row appear with your ticker, action, and an order status badge

**What the order status badges mean:**

[TABLE]
| Badge | Color | Meaning |
|---|---|---|
| submitted | Blue | Public.com accepted the order |
| filled | Green | Order has been fully filled |
| failed | Red | Public.com rejected it — click Details for the error |
| pending | Yellow | Being processed |
| skipped | Gray | Auto-execute is off, or no credentials saved |
[/TABLE]

Click **Details** on any row to see the full signal data and the exact response from Public.com.

[/STEP]

[/SECTION]

---

[SECTION:Troubleshooting]

[TABLE]
| Problem | Fix |
|---|---|
| No signals appear at all | Check that the webhook URL in TradingView exactly matches what your dashboard shows |
| Signal appears but ORDER column is empty | Go to Settings — confirm the Connected badge is showing and Auto-Execute is on |
| Order shows failed: Insufficient funds | Reduce Default Quantity in Settings or deposit more funds |
| Order shows failed: Market closed | Use GTC time-in-force, or limit your TradingView strategy to market hours |
| Order submitted but not visible in Public.com app | Wait 10–15 seconds — "submitted" means accepted, not yet necessarily shown in the app |
| Crypto symbol not recognized | Public.com uses base currency only — BTC not BTCUSD, ETH not ETHUSD |
[/TABLE]

[/SECTION]

---

[SECTION:You're Live]

[NOTE]
Once you see submitted or filled badges on your signals, the full pipeline is working:
TradingView strategy fires → webhook received → signal stored → order placed on Public.com → execution tracked on your dashboard.
[/NOTE]

From here you can refine your Pine Script strategy, adjust order sizing, and monitor everything through the Live Feed and signal detail views.

[/SECTION]

[NAV:none|none]

[/PAGE]
