import { useState } from "react";
import { Link } from "wouter";
import {
  useGetSettings,
  useUpdateSettings,
  useTestPublicConnection,
  getGetSettingsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Settings2, Zap, CheckCircle2, XCircle, Loader2, Eye, EyeOff, Link2, Unlink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

function SecretInput({
  value,
  onChange,
  placeholder,
  id,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  id?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        id={id}
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-10 rounded-md border border-input bg-background px-3 pr-10 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

export default function Settings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useGetSettings({
    query: { queryKey: getGetSettingsQueryKey() },
  });

  // Public.com
  const [publicToken, setPublicToken] = useState("");
  const [publicAccountId, setPublicAccountId] = useState("");

  // Robinhood
  const [robinhoodToken, setRobinhoodToken] = useState("");

  // Webull
  const [webullAppKey, setWebullAppKey] = useState("");
  const [webullAppSecret, setWebullAppSecret] = useState("");
  const [webullAccountId, setWebullAccountId] = useState("");

  // Order settings
  const [orderType, setOrderType] = useState<"MARKET" | "LIMIT">("MARKET");
  const [instrumentType, setInstrumentType] = useState<"EQUITY" | "CRYPTO">("EQUITY");
  const [defaultQuantity, setDefaultQuantity] = useState("1");
  const [timeInForce, setTimeInForce] = useState<"DAY" | "GTC">("DAY");
  const [autoExecute, setAutoExecute] = useState(true);
  const [buyFraction, setBuyFraction] = useState("1");
  const [neverSellAtLoss, setNeverSellAtLoss] = useState(false);
  const [initialized, setInitialized] = useState(false);

  if (settings && !initialized) {
    setPublicAccountId(settings.publicAccountId ?? "");
    setWebullAccountId(settings.webullAccountId ?? "");
    setOrderType(settings.orderType as "MARKET" | "LIMIT");
    setInstrumentType(settings.instrumentType as "EQUITY" | "CRYPTO");
    setDefaultQuantity(settings.defaultQuantity);
    setTimeInForce(settings.timeInForce as "DAY" | "GTC");
    setAutoExecute(settings.autoExecute);
    setBuyFraction(settings.buyFraction ?? "1");
    setNeverSellAtLoss(settings.neverSellAtLoss ?? false);
    setInitialized(true);
  }

  const { mutate: save, isPending: saving } = useUpdateSettings({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
        toast({ title: "Settings saved", description: "Your configuration has been updated." });
        setPublicToken("");
        setRobinhoodToken("");
        setWebullAppKey("");
        setWebullAppSecret("");
      },
      onError: () => {
        toast({ title: "Save failed", description: "Could not save settings.", variant: "destructive" });
      },
    },
  });

  const { mutate: testConn, isPending: testing, data: testResult } = useTestPublicConnection();

  const handleSave = () => {
    save({
      data: {
        publicApiToken: publicToken || undefined,
        publicAccountId: publicAccountId || null,
        robinhoodBearerToken: robinhoodToken || undefined,
        webullAppKey: webullAppKey || undefined,
        webullAppSecret: webullAppSecret || undefined,
        webullAccountId: webullAccountId || null,
        orderType,
        instrumentType,
        defaultQuantity,
        timeInForce,
        autoExecute,
        buyFraction,
        neverSellAtLoss,
      },
    });
  };

  const handleTestPublic = () => {
    testConn({
      data: {
        publicApiToken: publicToken || undefined,
        publicAccountId: publicAccountId || undefined,
      },
    });
  };

  const fractionPct = Math.round(Number(buyFraction) * 100);
  const buyQty = (Number(defaultQuantity) * Number(buyFraction)).toFixed(3).replace(/\.?0+$/, "");

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const connectedCount = [settings?.hasApiToken, settings?.hasRobinhoodToken, settings?.hasWebullKey].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-background text-foreground font-sans p-6 md:p-12">
      <div className="max-w-2xl mx-auto space-y-6">

        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-transparent shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight font-mono flex items-center gap-2">
              <Settings2 className="w-6 h-6 text-primary" />
              Settings
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {connectedCount === 0
                ? "Connect a broker to start auto-executing trades"
                : `${connectedCount} broker${connectedCount > 1 ? "s" : ""} connected — signals execute on all of them`}
            </p>
          </div>
        </div>

        {/* ── PUBLIC.COM ─────────────────────────────────────────── */}
        <Card className="border-border">
          <CardHeader className="border-b border-border pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
                  <span className="text-primary text-xs font-bold">PB</span>
                </div>
                <div>
                  <CardTitle className="text-base font-semibold">Public.com</CardTitle>
                  <CardDescription className="mt-0.5 text-xs">
                    REST API · API Key + Account ID ·{" "}
                    <a href="https://public.com/api/docs/quickstart" target="_blank" rel="noreferrer" className="text-primary underline underline-offset-2">
                      Get credentials
                    </a>
                  </CardDescription>
                </div>
              </div>
              {settings?.hasApiToken ? (
                <Badge className="bg-green-100 text-green-700 border-green-200 font-mono text-xs shrink-0">
                  <Link2 className="w-3 h-3 mr-1" />Connected
                </Badge>
              ) : (
                <Badge variant="outline" className="text-muted-foreground text-xs shrink-0">
                  <Unlink className="w-3 h-3 mr-1" />Not connected
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-mono font-medium tracking-widest text-muted-foreground uppercase">API Token</label>
              <SecretInput
                value={publicToken}
                onChange={setPublicToken}
                placeholder={settings?.hasApiToken ? "••••••••••  (leave blank to keep current)" : "Paste your Public.com API token"}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-mono font-medium tracking-widest text-muted-foreground uppercase">Account ID</label>
              <input
                type="text"
                value={publicAccountId}
                onChange={(e) => setPublicAccountId(e.target.value)}
                placeholder="e.g. DW1234567890"
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
            {settings?.hasApiToken && (
              <div className="pt-1">
                <Button variant="outline" size="sm" onClick={handleTestPublic} disabled={testing} className="gap-2">
                  {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                  Test Connection
                </Button>
                {testResult && (
                  <div className={`mt-3 flex items-start gap-2 text-sm rounded-md p-3 ${testResult.ok ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
                    {testResult.ok ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /> : <XCircle className="w-4 h-4 mt-0.5 shrink-0" />}
                    <div>
                      {testResult.ok ? (
                        <>
                          <p className="font-medium">Connected successfully</p>
                          {testResult.accountType && <p className="text-xs mt-0.5">Account type: {testResult.accountType}</p>}
                          {testResult.buyingPower && <p className="text-xs">Buying power: ${Number(testResult.buyingPower).toLocaleString()}</p>}
                        </>
                      ) : (
                        <p>{testResult.error ?? "Connection failed"}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── ROBINHOOD ──────────────────────────────────────────── */}
        <Card className="border-border">
          <CardHeader className="border-b border-border pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-md bg-green-500/10 flex items-center justify-center">
                  <span className="text-green-600 text-xs font-bold">RH</span>
                </div>
                <div>
                  <CardTitle className="text-base font-semibold">Robinhood</CardTitle>
                  <CardDescription className="mt-0.5 text-xs">
                    MCP · OAuth bearer token ·{" "}
                    <a href="https://robinhood.com/us/en/support/articles/agentic-trading-overview/" target="_blank" rel="noreferrer" className="text-primary underline underline-offset-2">
                      Open Agentic account
                    </a>
                  </CardDescription>
                </div>
              </div>
              {settings?.hasRobinhoodToken ? (
                <Badge className="bg-green-100 text-green-700 border-green-200 font-mono text-xs shrink-0">
                  <Link2 className="w-3 h-3 mr-1" />Connected
                </Badge>
              ) : (
                <Badge variant="outline" className="text-muted-foreground text-xs shrink-0">
                  <Unlink className="w-3 h-3 mr-1" />Not connected
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-mono font-medium tracking-widest text-muted-foreground uppercase">Bearer Token</label>
              <SecretInput
                value={robinhoodToken}
                onChange={setRobinhoodToken}
                placeholder={settings?.hasRobinhoodToken ? "••••••••••  (leave blank to keep current)" : "Paste your Robinhood OAuth bearer token"}
              />
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Requires a{" "}
              <a href="https://robinhood.com/us/en/support/articles/agentic-trading-overview/#OpenanAgenticaccount" target="_blank" rel="noreferrer" className="text-primary underline underline-offset-2">
                Robinhood Agentic account
              </a>
              . Authenticate via Claude Desktop or another MCP client to get your bearer token, then paste it here. Trades execute via Robinhood's MCP server at{" "}
              <code className="text-[11px] bg-muted px-1 rounded">agent.robinhood.com/mcp/trading</code>.
            </p>
          </CardContent>
        </Card>

        {/* ── WEBULL ─────────────────────────────────────────────── */}
        <Card className="border-border">
          <CardHeader className="border-b border-border pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-md bg-blue-500/10 flex items-center justify-center">
                  <span className="text-blue-600 text-xs font-bold">WB</span>
                </div>
                <div>
                  <CardTitle className="text-base font-semibold">Webull</CardTitle>
                  <CardDescription className="mt-0.5 text-xs">
                    OpenAPI · App Key + App Secret ·{" "}
                    <a href="https://developer.webull.com/apis/docs/Getting-Started/individual-application" target="_blank" rel="noreferrer" className="text-primary underline underline-offset-2">
                      Apply for API access
                    </a>
                  </CardDescription>
                </div>
              </div>
              {settings?.hasWebullKey ? (
                <Badge className="bg-green-100 text-green-700 border-green-200 font-mono text-xs shrink-0">
                  <Link2 className="w-3 h-3 mr-1" />Connected
                </Badge>
              ) : (
                <Badge variant="outline" className="text-muted-foreground text-xs shrink-0">
                  <Unlink className="w-3 h-3 mr-1" />Not connected
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-medium tracking-widest text-muted-foreground uppercase">App Key</label>
                <SecretInput
                  value={webullAppKey}
                  onChange={setWebullAppKey}
                  placeholder={settings?.hasWebullKey ? "•••• (keep current)" : "App Key"}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-medium tracking-widest text-muted-foreground uppercase">App Secret</label>
                <SecretInput
                  value={webullAppSecret}
                  onChange={setWebullAppSecret}
                  placeholder={settings?.hasWebullKey ? "•••• (keep current)" : "App Secret"}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-mono font-medium tracking-widest text-muted-foreground uppercase">Account ID <span className="normal-case font-normal text-muted-foreground">(optional)</span></label>
              <input
                type="text"
                value={webullAccountId}
                onChange={(e) => setWebullAccountId(e.target.value)}
                placeholder="Your Webull account ID"
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Apply for Webull OpenAPI credentials at{" "}
              <a href="https://developer.webull.com" target="_blank" rel="noreferrer" className="text-primary underline underline-offset-2">developer.webull.com</a>
              . Individual accounts need to apply; institutional accounts can use sandbox credentials for testing.
            </p>
          </CardContent>
        </Card>

        {/* ── ORDER SETTINGS ─────────────────────────────────────── */}
        <Card className="border-border">
          <CardHeader className="border-b border-border pb-4">
            <CardTitle className="text-base font-semibold">Order Settings</CardTitle>
            <CardDescription>Applied to all connected brokers when a signal fires</CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-5">

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-medium tracking-widest text-muted-foreground uppercase">Order Type</label>
                <select
                  value={orderType}
                  onChange={(e) => setOrderType(e.target.value as "MARKET" | "LIMIT")}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                >
                  <option value="MARKET">Market — execute at best price</option>
                  <option value="LIMIT">Limit — use signal price</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono font-medium tracking-widest text-muted-foreground uppercase">Instrument Type</label>
                <select
                  value={instrumentType}
                  onChange={(e) => setInstrumentType(e.target.value as "EQUITY" | "CRYPTO")}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                >
                  <option value="EQUITY">Equity (Stocks &amp; ETFs)</option>
                  <option value="CRYPTO">Crypto</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono font-medium tracking-widest text-muted-foreground uppercase">Default Quantity</label>
                <input
                  type="number"
                  min="0.001"
                  step="0.001"
                  value={defaultQuantity}
                  onChange={(e) => setDefaultQuantity(e.target.value)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
                <p className="text-xs text-muted-foreground">Max shares per buy signal</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono font-medium tracking-widest text-muted-foreground uppercase">Time In Force</label>
                <select
                  value={timeInForce}
                  onChange={(e) => setTimeInForce(e.target.value as "DAY" | "GTC")}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                >
                  <option value="DAY">DAY — cancel at end of day</option>
                  <option value="GTC">GTC — good till cancelled</option>
                </select>
              </div>
            </div>

            {/* Buy Fraction slider */}
            <div className="pt-2 border-t border-border space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Buy position size</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Fraction of Default Quantity used for each buy order.
                  </p>
                </div>
                <div className="text-right shrink-0 ml-4">
                  <span className="text-2xl font-mono font-bold text-primary">{fractionPct}%</span>
                  <p className="text-xs text-muted-foreground font-mono">{buyQty} shares / buy</p>
                </div>
              </div>
              <input
                type="range" min="0.01" max="1" step="0.01"
                value={buyFraction}
                onChange={(e) => setBuyFraction(e.target.value)}
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-xs text-muted-foreground font-mono">
                <span>1%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span>
              </div>
            </div>

            <div className="pt-2 border-t border-border space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <div
                  onClick={() => setAutoExecute((v) => !v)}
                  className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${autoExecute ? "bg-primary" : "bg-muted-foreground/30"}`}
                >
                  <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${autoExecute ? "translate-x-6" : "translate-x-1"}`} />
                </div>
                <div>
                  <p className="text-sm font-medium">Auto-execute on every signal</p>
                  <p className="text-xs text-muted-foreground">
                    {autoExecute
                      ? "Orders placed on all connected brokers automatically when a signal arrives"
                      : "Signals recorded but no orders placed on any broker"}
                  </p>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <div
                  onClick={() => setNeverSellAtLoss((v) => !v)}
                  className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${neverSellAtLoss ? "bg-primary" : "bg-muted-foreground/30"}`}
                >
                  <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${neverSellAtLoss ? "translate-x-6" : "translate-x-1"}`} />
                </div>
                <div>
                  <p className="text-sm font-medium">Never sell at a loss</p>
                  <p className="text-xs text-muted-foreground">
                    {neverSellAtLoss
                      ? "Sell signals are blocked across all brokers if current price is below your buy price"
                      : "All sell signals are executed regardless of P&L"}
                  </p>
                </div>
              </label>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving} className="gap-2 px-8">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Save Settings
          </Button>
        </div>

      </div>
    </div>
  );
}
