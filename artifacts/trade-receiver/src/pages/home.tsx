import { useState } from "react";
import { Link } from "wouter";
import { useListSignals, useGetSignalStats, useListExecutions, getGetSignalStatsQueryKey, getListSignalsQueryKey, getListExecutionsQueryKey } from "@workspace/api-client-react";
import { formatDistanceToNow, format } from "date-fns";
import { Copy, Activity, TrendingUp, TrendingDown, Clock, Terminal, ChevronDown, ChevronUp, Settings2 } from "lucide-react";
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

  const { data: executions } = useListExecutions(
    { limit: 50 },
    { query: { queryKey: getListExecutionsQueryKey({ limit: 50 }), refetchInterval: 5000 } }
  );

  // Build a map of signalId -> execution status for quick lookup
  const execBySignalId = new Map(
    (executions ?? []).map((e) => [e.signalId, e])
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
    if (lower.includes("buy")) return "bg-green-100 text-green-700 border-green-200";
    if (lower.includes("sell")) return "bg-red-100 text-red-700 border-red-200";
    return "bg-yellow-100 text-yellow-700 border-yellow-200";
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans p-6 md:p-12 selection:bg-primary/30">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Terminal className="w-8 h-8 text-primary" />
              <h1 className="text-3xl font-bold tracking-tight text-foreground font-mono">TRD_REQ_RCVR</h1>
            </div>
            <p className="text-muted-foreground text-sm max-w-xl">
              Live monitoring dashboard for TradingView webhook signals.
            </p>
          </div>
          <Link
            href="/settings"
            className="inline-flex items-center gap-2 rounded-md text-sm font-medium border border-input bg-white shadow-sm hover:bg-orange-50 hover:border-primary/30 h-9 px-4 py-2 shrink-0"
          >
            <Settings2 className="w-4 h-4 text-primary" />
            Settings
          </Link>
        </div>

        {/* Setup Card */}
        <Card className="bg-orange-50 border-orange-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-mono text-orange-800 tracking-widest uppercase">
              TradingView Setup
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">

            {/* Step 1 — Webhook URL */}
            <div className="space-y-2">
              <p className="text-xs font-mono text-orange-900/80">
                <span className="text-primary font-bold">STEP 1</span> — In TradingView, open your alert &rarr; Notifications tab &rarr; paste this into the <em>Webhook URL</em> field:
              </p>
              <div className="bg-white border border-orange-200 shadow-sm rounded-md p-3 flex items-center gap-3">
                <code className="text-sm font-mono text-gray-800 flex-1 break-all select-all">
                  {webhookUrl}
                </code>
                <Button size="sm" variant="secondary" onClick={copyWebhookUrl} className="shrink-0 bg-orange-100 text-orange-800 hover:bg-orange-200 border-0">
                  <Copy className="w-3.5 h-3.5 mr-1.5" />
                  Copy
                </Button>
              </div>
            </div>

            {/* Step 2 — Message template */}
            <div className="space-y-2">
              <p className="text-xs font-mono text-orange-900/80">
                <span className="text-primary font-bold">STEP 2</span> — Paste this into the alert <em>Message</em> box. It uses TradingView placeholders that get filled in when the alert fires:
              </p>
              <div className="bg-white border border-orange-200 shadow-sm rounded-md overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 border-b border-orange-100 bg-orange-50/50">
                  <span className="text-xs font-mono text-orange-800">Alert Message Template</span>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="secondary" onClick={copyTemplate} className="h-7 text-xs bg-orange-100 text-orange-800 hover:bg-orange-200 border-0">
                      <Copy className="w-3 h-3 mr-1.5" />
                      Copy Template
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs text-orange-700 hover:bg-orange-100 hover:text-orange-900"
                      onClick={() => setTemplateOpen((v) => !v)}
                    >
                      {templateOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      {templateOpen ? "Hide" : "Preview"}
                    </Button>
                  </div>
                </div>
                {templateOpen && (
                  <pre className="p-4 text-xs font-mono text-gray-800 bg-gray-50 overflow-x-auto leading-relaxed border-t border-orange-100">
                    {TV_TEMPLATE}
                  </pre>
                )}
              </div>
              <p className="text-xs text-orange-800/60 font-mono">
                Note: strategy placeholders like <code className="text-orange-700 font-bold bg-orange-100 px-1 rounded">{"{{strategy.order.action}}"}</code> only work in Strategy alerts, not indicator alerts. For indicator alerts, replace them with hard-coded values like <code className="text-orange-700 font-bold bg-orange-100 px-1 rounded">"buy"</code>.
              </p>
            </div>

          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-card shadow-sm border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-medium text-muted-foreground">Total Signals</p>
                <Activity className="w-4 h-4 text-primary" />
              </div>
              {statsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <p className="text-3xl font-mono font-bold text-foreground">{stats?.total ?? 0}</p>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card shadow-sm border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-medium text-muted-foreground">Buy Signals</p>
                <TrendingUp className="w-4 h-4 text-primary" />
              </div>
              {statsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <p className="text-3xl font-mono font-bold text-green-600">{stats?.buys ?? 0}</p>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card shadow-sm border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-medium text-muted-foreground">Sell Signals</p>
                <TrendingDown className="w-4 h-4 text-primary" />
              </div>
              {statsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <p className="text-3xl font-mono font-bold text-red-600">{stats?.sells ?? 0}</p>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card shadow-sm border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-medium text-muted-foreground">Last Signal</p>
                <Clock className="w-4 h-4 text-primary" />
              </div>
              {statsLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div className="h-9 flex items-center">
                  <p className="text-lg font-mono text-foreground truncate">
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
            <h2 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(249,115,22,0.6)]" />
              Live Feed
            </h2>
          </div>

          <Card className="border-border bg-card shadow-sm overflow-hidden">
            {signalsLoading ? (
              <div className="p-6 space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : !signals || signals.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center border-dashed border-2 border-border/50 m-4 rounded-lg bg-muted/50">
                <Terminal className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
                <h3 className="text-lg font-medium text-foreground mb-2">No signals received yet</h3>
                <p className="text-muted-foreground text-sm max-w-md">
                  Complete the setup steps above, then trigger a TradingView alert. Signals appear here automatically every 5 seconds.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground bg-muted/50 border-b border-border">
                    <tr>
                      <th className="px-6 py-4 font-mono font-medium">TIME</th>
                      <th className="px-6 py-4 font-mono font-medium">TICKER</th>
                      <th className="px-6 py-4 font-mono font-medium">ACTION</th>
                      <th className="px-6 py-4 font-mono font-medium text-right">PRICE</th>
                      <th className="px-6 py-4 font-mono font-medium text-right">SIZE</th>
                      <th className="px-6 py-4 font-mono font-medium">EXCHANGE</th>
                      <th className="px-6 py-4 font-mono font-medium">ORDER</th>
                      <th className="px-6 py-4 font-mono font-medium text-right"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border font-mono">
                    {signals.map((signal) => (
                      <tr key={signal.id} className="hover:bg-orange-50/60 transition-colors group">
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
                        <td className="px-6 py-4 whitespace-nowrap font-bold text-foreground">
                          {signal.ticker ?? "UNKNOWN"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge
                            variant="outline"
                            className={`font-mono uppercase font-bold ${getActionColor(signal.action)}`}
                          >
                            {signal.action ?? "UNKNOWN"}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-foreground font-medium">
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
                        <td className="px-6 py-4 whitespace-nowrap">
                          {(() => {
                            const exec = execBySignalId.get(signal.id);
                            if (!exec) return <span className="text-muted-foreground text-xs">—</span>;
                            const styles: Record<string, string> = {
                              submitted: "bg-blue-100 text-blue-700 border-blue-200",
                              filled: "bg-green-100 text-green-700 border-green-200",
                              failed: "bg-red-100 text-red-700 border-red-200",
                              pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
                              skipped: "bg-gray-100 text-gray-500 border-gray-200",
                            };
                            return (
                              <Badge variant="outline" className={`font-mono text-xs uppercase ${styles[exec.status] ?? "bg-gray-100 text-gray-500"}`}>
                                {exec.status}
                              </Badge>
                            );
                          })()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <Link
                            href={`/signals/${signal.id}`}
                            className="text-primary hover:text-primary/80 opacity-0 group-hover:opacity-100 transition-opacity font-medium"
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
