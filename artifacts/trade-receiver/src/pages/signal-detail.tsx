import { useParams, Link } from "wouter";
import { useGetSignal } from "@workspace/api-client-react";
import { format } from "date-fns";
import { ArrowLeft, Terminal, Server, Clock, Activity, FileJson } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export default function SignalDetail() {
  const params = useParams();
  const id = Number(params.id);

  const { data: signal, isLoading } = useGetSignal(id, {
    query: { enabled: !!id, queryKey: ['/api/signals', id] } // Fallback key if needed
  });

  const getActionColor = (action: string) => {
    const lower = action.toLowerCase();
    if (lower.includes('buy')) return 'bg-green-500/10 text-green-500 border-green-500/20';
    if (lower.includes('sell')) return 'bg-red-500/10 text-red-500 border-red-500/20';
    return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6 md:p-12">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (!signal) {
    return (
      <div className="min-h-screen bg-background p-6 flex flex-col items-center justify-center">
        <Terminal className="w-16 h-16 text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">Signal Not Found</h1>
        <p className="text-muted-foreground mb-6">The signal you are looking for does not exist or has been deleted.</p>
        <Link href="/" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans p-6 md:p-12">
      <div className="max-w-5xl mx-auto space-y-6">
        
        <div className="flex items-center gap-4">
          <Link href="/" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-transparent shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-white font-mono flex items-center gap-3">
            SIGNAL_{signal.id.toString().padStart(6, '0')}
            <Badge variant="outline" className={`font-mono uppercase text-sm ${getActionColor(signal.action)}`}>
              {signal.action}
            </Badge>
          </h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Main Info Card */}
          <Card className="bg-card border-border/50 md:col-span-2">
            <CardHeader className="border-b border-border/50 pb-4">
              <CardTitle className="text-lg flex items-center gap-2 font-mono">
                <Activity className="w-4 h-4 text-primary" />
                Execution Details
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 grid grid-cols-2 gap-6">
              
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-mono">TICKER</p>
                <p className="text-2xl font-bold text-white font-mono">{signal.ticker || "—"}</p>
              </div>
              
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-mono">PRICE</p>
                <p className="text-2xl font-bold text-white font-mono">
                  {signal.price ? signal.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 }) : "MARKET"}
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-mono">SIZE / QUANTITY</p>
                <p className="text-xl font-mono text-white">
                  {signal.quantity ? signal.quantity.toLocaleString() : "DEFAULT"}
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-mono">STRATEGY</p>
                <p className="text-xl font-mono text-white truncate" title={signal.strategy || ""}>
                  {signal.strategy || "—"}
                </p>
              </div>

              {signal.message && (
                <div className="col-span-2 space-y-1 pt-4 border-t border-border/30">
                  <p className="text-xs text-muted-foreground font-mono">MESSAGE</p>
                  <p className="text-sm text-foreground/90 whitespace-pre-wrap">{signal.message}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Meta Card */}
          <Card className="bg-card border-border/50">
            <CardHeader className="border-b border-border/50 pb-4">
              <CardTitle className="text-lg flex items-center gap-2 font-mono">
                <Server className="w-4 h-4 text-primary" />
                Metadata
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-mono flex items-center gap-1">
                  <Clock className="w-3 h-3" /> RECEIVED AT
                </p>
                <p className="text-sm font-mono text-white">
                  {format(new Date(signal.receivedAt), "yyyy-MM-dd HH:mm:ss.SSS")}
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-mono">EXCHANGE</p>
                <p className="text-sm font-mono text-white">{signal.exchange || "—"}</p>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-mono">INTERVAL</p>
                <p className="text-sm font-mono text-white">{signal.interval || "—"}</p>
              </div>

            </CardContent>
          </Card>

          {/* Raw JSON Card */}
          <Card className="bg-card border-border/50 md:col-span-3">
            <CardHeader className="border-b border-border/50 pb-4">
              <CardTitle className="text-lg flex items-center gap-2 font-mono">
                <FileJson className="w-4 h-4 text-primary" />
                Raw Payload
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <pre className="p-6 overflow-x-auto text-xs font-mono text-blue-300 bg-[#0a0d14] rounded-b-lg">
                {JSON.stringify(signal.raw, null, 2)}
              </pre>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
