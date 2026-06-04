import { useState } from "react";
import { Link } from "wouter";
import { useListSignals, useGetSignalStats, getGetSignalStatsQueryKey, getListSignalsQueryKey } from "@workspace/api-client-react";
import { formatDistanceToNow, format } from "date-fns";
import { Copy, Activity, TrendingUp, TrendingDown, Clock, Terminal, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";

const TV_TEMPLATE = `{
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
}`;

export default function Home() {
  const { toast } = useToast();
  const [templateOpen, setTemplateOpen] = useState(false);

  const { data: stats, isLoading: statsLoading } = useGetSignalStats({
    query: { queryKey: getGetSignalStatsQueryKey(), refetchInterval: 5000 },
  });

  const { data: signals, isLoading: signalsLoading } = useListSignals(
    { limit: 50 },
    { query: { queryKey: getListSignalsQueryKey({ limit: 50 }), refetchInterval: 5000 } }
  );

  const webhookUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/webhook/tradingview`
      : "";

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    toast({
      title: "Webhook URL Copied",
      description: "Paste this into your TradingView alert webhook URL field.",
    });
  };

  const copyTemplate = () => {
    navigator.clipboard.writeText(TV_TEMPLATE);
    toast({
      title: "Message Template Copied",
      description: "Paste this into the TradingView alert Message box.",
    });
  };

  const getActionColor = (action: string) => {
    const lower = action.toLowerCase();
    if (lower.includes("buy")) return "bg-green-500/10 text-green-500 border-green-500/20";
    if (lower.includes("sell")) return "bg-red-500/10 text-red-500 border-red-500/20";
    return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans p-6 md:p-12 selection:bg-primary/30">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Terminal className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight text-white font-mono">TRD_REQ_RCVR</h1>
          </div>
          <p className="text-muted-foreground text-sm max-w-xl">
            Live monitoring dashboard for TradingView webhook signals.
          </p>
        </div>

        {/* Setup Card */}
        <Card className="border-primary/20 bg-card/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-mono text-muted-foreground tracking-widest uppercase">
              TradingView Setup
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">

            {/* Step 1 — Webhook URL */}
            <div className="space-y-2">
              <p className="text-xs font-mono text-muted-foreground">
                <span className="text-primary font-bold">STEP 1</span> — In TradingView, open your alert &rarr; Notifications tab &rarr; paste this into the <em>Webhook URL</em> field:
              </p>
              <div className="bg-[#0a0d14] border border-border rounded-md p-3 flex items-center gap-3">
                <code className="text-sm font-mono text-green-400 flex-1 break-all select-all">
                  {webhookUrl}
                </code>
                <Button size="sm" variant="secondary" onClick={copyWebhookUrl} className="shrink-0">
                  <Copy className="w-3.5 h-3.5 mr-1.5" />
                  Copy
                </Button>
              </div>
            </div>

            {/* Step 2 — Message template */}
            <div className="space-y-2">
              <p className="text-xs font-mono text-muted-foreground">
                <span className="text-primary font-bold">STEP 2</span> — Paste this into the alert <em>Message</em> box. It uses TradingView placeholders that get filled in when the alert fires:
              </p>
              <div className="bg-[#0a0d14] border border-border rounded-md overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 border-b border-border/60">
                  <span className="text-xs font-mono text-muted-foreground">Alert Message Template</span>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="secondary" onClick={copyTemplate} className="h-7 text-xs">
                      <Copy className="w-3 h-3 mr-1.5" />
                      Copy Template
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs text-muted-foreground"
                      onClick={() => setTemplateOpen((v) => !v)}
                    >
                      {templateOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      {templateOpen ? "Hide" : "Preview"}
                    </Button>
                  </div>
                </div>
                {templateOpen && (
                  <pre className="p-4 text-xs font-mono text-blue-300 overflow-x-auto leading-relaxed">
                    {TV_TEMPLATE}
                  </pre>
                )}
              </div>
              <p className="text-xs text-muted-foreground/70 font-mono">
                Note: strategy placeholders like <code className="text-yellow-500">{"{{strategy.order.action}}"}</code> only work in Strategy alerts, not indicator alerts. For indicator alerts, replace them with hard-coded values like <code className="text-yellow-500">"buy"</code>.
              </p>
            </div>

          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-medium text-muted-foreground">Total Signals</p>
                <Activity className="w-4 h-4 text-primary" />
              </div>
              {statsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <p className="text-3xl font-mono font-bold text-white">{stats?.total ?? 0}</p>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-medium text-muted-foreground">Buy Signals</p>
                <TrendingUp className="w-4 h-4 text-green-500" />
              </div>
              {statsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <p className="text-3xl font-mono font-bold text-green-500">{stats?.buys ?? 0}</p>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-medium text-muted-foreground">Sell Signals</p>
                <TrendingDown className="w-4 h-4 text-red-500" />
              </div>
              {statsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <p className="text-3xl font-mono font-bold text-red-500">{stats?.sells ?? 0}</p>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-medium text-muted-foreground">Last Signal</p>
                <Clock className="w-4 h-4 text-blue-400" />
              </div>
              {statsLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div className="h-9 flex items-center">
                  <p className="text-lg font-mono text-white truncate">
                    {stats?.lastSignalAt
                      ? formatDistanceToNow(new Date(stats.lastSignalAt), { addSuffix: true })
                      : "Never"}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Live Feed */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              Live Feed
            </h2>
          </div>

          <Card className="border-border/50 bg-card overflow-hidden">
            {signalsLoading ? (
              <div className="p-6 space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : !signals || signals.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center border-dashed border-2 border-border/50 m-4 rounded-lg bg-background/50">
                <Terminal className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
                <h3 className="text-lg font-medium text-white mb-2">No signals received yet</h3>
                <p className="text-muted-foreground text-sm max-w-md">
                  Complete the setup steps above, then trigger a TradingView alert. Signals appear here automatically every 5 seconds.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground bg-muted/30 border-b border-border">
                    <tr>
                      <th className="px-6 py-4 font-mono font-normal">TIME</th>
                      <th className="px-6 py-4 font-mono font-normal">TICKER</th>
                      <th className="px-6 py-4 font-mono font-normal">ACTION</th>
                      <th className="px-6 py-4 font-mono font-normal text-right">PRICE</th>
                      <th className="px-6 py-4 font-mono font-normal text-right">SIZE</th>
                      <th className="px-6 py-4 font-mono font-normal">EXCHANGE</th>
                      <th className="px-6 py-4 font-mono font-normal">INTERVAL</th>
                      <th className="px-6 py-4 font-mono font-normal text-right"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50 font-mono">
                    {signals.map((signal) => (
                      <tr key={signal.id} className="hover:bg-muted/20 transition-colors group">
                        <td className="px-6 py-4 whitespace-nowrap text-muted-foreground">
                          <Tooltip>
                            <TooltipTrigger className="cursor-default">
                              {formatDistanceToNow(new Date(signal.receivedAt), { addSuffix: true })}
                            </TooltipTrigger>
                            <TooltipContent>
                              {format(new Date(signal.receivedAt), "PPpp")}
                            </TooltipContent>
                          </Tooltip>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap font-bold text-white">
                          {signal.ticker ?? "UNKNOWN"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge
                            variant="outline"
                            className={`font-mono uppercase ${getActionColor(signal.action)}`}
                          >
                            {signal.action ?? "UNKNOWN"}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-white">
                          {signal.price != null
                            ? signal.price.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 6,
                              })
                            : "—"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-muted-foreground">
                          {signal.quantity != null ? signal.quantity.toLocaleString() : "—"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-muted-foreground">
                          {signal.exchange ?? "—"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-muted-foreground">
                          {signal.interval ?? "—"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <Link
                            href={`/signals/${signal.id}`}
                            className="text-primary hover:text-primary/80 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            Details &rarr;
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
