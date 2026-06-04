import { useState } from "react";
import { Link } from "wouter";
import { useListSignals, useGetSignalStats } from "@workspace/api-client-react";
import { formatDistanceToNow, format } from "date-fns";
import { Copy, Activity, TrendingUp, TrendingDown, Clock, Terminal } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";

export default function Home() {
  const { toast } = useToast();
  
  const { data: stats, isLoading: statsLoading } = useGetSignalStats({ 
    query: { refetchInterval: 5000 } 
  });
  
  const { data: signals, isLoading: signalsLoading } = useListSignals(
    { limit: 50 }, 
    { query: { refetchInterval: 5000 } }
  );

  const webhookUrl = typeof window !== 'undefined' ? `${window.location.origin}/api/webhook/tradingview` : '';

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    toast({
      title: "Webhook URL Copied",
      description: "Paste this into your TradingView alert webhook URL field.",
    });
  };

  const getActionColor = (action: string) => {
    const lower = action.toLowerCase();
    if (lower.includes('buy')) return 'bg-green-500/10 text-green-500 border-green-500/20';
    if (lower.includes('sell')) return 'bg-red-500/10 text-red-500 border-red-500/20';
    return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans p-6 md:p-12 selection:bg-primary/30">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header & Webhook Box */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Terminal className="w-8 h-8 text-primary" />
              <h1 className="text-3xl font-bold tracking-tight text-white font-mono">TRD_REQ_RCVR</h1>
            </div>
            <p className="text-muted-foreground text-sm max-w-xl">
              Live monitoring dashboard for TradingView webhook signals. 
              Configure your alerts to send JSON payloads to the endpoint below.
            </p>
          </div>
          
          <div className="bg-card border border-border p-1 pl-4 pr-1 rounded-md flex items-center gap-4 w-full md:w-auto shadow-sm">
            <code className="text-xs font-mono text-muted-foreground truncate max-w-[200px] md:max-w-md">
              {webhookUrl}
            </code>
            <Button size="sm" variant="secondary" onClick={copyWebhookUrl} className="shrink-0 group">
              <Copy className="w-4 h-4 mr-2 group-hover:text-primary transition-colors" />
              Copy URL
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-medium text-muted-foreground">Total Signals</p>
                <Activity className="w-4 h-4 text-primary" />
              </div>
              {statsLoading ? <Skeleton className="h-8 w-16" /> : (
                <p className="text-3xl font-mono font-bold text-white">{stats?.total || 0}</p>
              )}
            </CardContent>
          </Card>
          
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-medium text-muted-foreground">Buy Signals</p>
                <TrendingUp className="w-4 h-4 text-green-500" />
              </div>
              {statsLoading ? <Skeleton className="h-8 w-16" /> : (
                <p className="text-3xl font-mono font-bold text-green-500">{stats?.buys || 0}</p>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-medium text-muted-foreground">Sell Signals</p>
                <TrendingDown className="w-4 h-4 text-red-500" />
              </div>
              {statsLoading ? <Skeleton className="h-8 w-16" /> : (
                <p className="text-3xl font-mono font-bold text-red-500">{stats?.sells || 0}</p>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-medium text-muted-foreground">Last Signal</p>
                <Clock className="w-4 h-4 text-blue-400" />
              </div>
              {statsLoading ? <Skeleton className="h-8 w-24" /> : (
                <div className="h-9 flex items-center">
                  <p className="text-lg font-mono text-white truncate">
                    {stats?.lastSignalAt ? formatDistanceToNow(new Date(stats.lastSignalAt), { addSuffix: true }) : 'Never'}
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
                {[1, 2, 3, 4, 5].map(i => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : !signals || signals.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center border-dashed border-2 border-border/50 m-4 rounded-lg bg-background/50">
                <Terminal className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
                <h3 className="text-lg font-medium text-white mb-2">No signals received yet</h3>
                <p className="text-muted-foreground text-sm max-w-md">
                  Configure a TradingView alert with a webhook action pointing to the URL above.
                  When the alert triggers, it will appear here instantly.
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
                      <th className="px-6 py-4 font-mono font-normal">STRATEGY</th>
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
                          {signal.ticker || "UNKNOWN"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant="outline" className={`font-mono uppercase ${getActionColor(signal.action)}`}>
                            {signal.action || "UNKNOWN"}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-white">
                          {signal.price ? signal.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 }) : "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-muted-foreground">
                          {signal.quantity ? signal.quantity.toLocaleString() : "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-muted-foreground truncate max-w-[200px]">
                          {signal.strategy || "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <Link href={`/signals/${signal.id}`} className="text-primary hover:text-primary/80 opacity-0 group-hover:opacity-100 transition-opacity">
                            Details →
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
