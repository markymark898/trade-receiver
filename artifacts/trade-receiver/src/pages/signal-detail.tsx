import { useParams, Link } from "wouter";
import { useGetSignal, getGetSignalQueryKey } from "@workspace/api-client-react";
import { format, formatDistanceToNow } from "date-fns";
import { ArrowLeft, Terminal, Server, Clock, Activity, FileJson, BarChart2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

function Field({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground font-mono tracking-widest">{label}</p>
      <p className="text-sm font-mono text-white truncate" title={String(value ?? "")}>
        {value != null && value !== "" ? String(value) : "—"}
      </p>
    </div>
  );
}

export default function SignalDetail() {
  const params = useParams();
  const id = Number(params.id);

  const { data: signal, isLoading } = useGetSignal(id, {
    query: { queryKey: getGetSignalQueryKey(id), enabled: !!id },
  });

  const getActionColor = (action: string) => {
    const lower = action.toLowerCase();
    if (lower.includes("buy")) return "bg-green-500/10 text-green-500 border-green-500/20";
    if (lower.includes("sell")) return "bg-red-500/10 text-red-500 border-red-500/20";
    return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6 md:p-12">
        <div className="max-w-5xl mx-auto space-y-6">
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
        <p className="text-muted-foreground mb-6">
          The signal you are looking for does not exist.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2"
        >
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
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-transparent shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-white font-mono flex items-center gap-3">
            SIGNAL_{signal.id.toString().padStart(6, "0")}
            <Badge
              variant="outline"
              className={`font-mono uppercase text-sm ${getActionColor(signal.action)}`}
            >
              {signal.action}
            </Badge>
          </h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Execution Details */}
          <Card className="bg-card border-border/50 md:col-span-2">
            <CardHeader className="border-b border-border/50 pb-4">
              <CardTitle className="text-sm flex items-center gap-2 font-mono tracking-widest uppercase text-muted-foreground">
                <Activity className="w-4 h-4 text-primary" />
                Execution Details
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 grid grid-cols-2 gap-6">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-mono tracking-widest">TICKER</p>
                <p className="text-2xl font-bold text-white font-mono">{signal.ticker || "—"}</p>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-mono tracking-widest">PRICE (CLOSE)</p>
                <p className="text-2xl font-bold text-white font-mono">
                  {signal.price != null
                    ? signal.price.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 8,
                      })
                    : "MARKET"}
                </p>
              </div>

              <Field
                label="ORDER PRICE"
                value={
                  signal.orderPrice != null
                    ? signal.orderPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })
                    : null
                }
              />
              <Field label="POSITION SIZE" value={signal.positionSize} />
              <Field label="QUANTITY / CONTRACTS" value={signal.quantity} />
              <Field label="STRATEGY" value={signal.strategy} />
              <Field label="ORDER ID" value={signal.orderId} />
              <Field label="ORDER COMMENT" value={signal.orderComment} />

              {signal.message && (
                <div className="col-span-2 space-y-1 pt-4 border-t border-border/30">
                  <p className="text-xs text-muted-foreground font-mono tracking-widest">MESSAGE</p>
                  <p className="text-sm text-foreground/90 whitespace-pre-wrap">{signal.message}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Metadata */}
          <Card className="bg-card border-border/50">
            <CardHeader className="border-b border-border/50 pb-4">
              <CardTitle className="text-sm flex items-center gap-2 font-mono tracking-widest uppercase text-muted-foreground">
                <Server className="w-4 h-4 text-primary" />
                Metadata
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-5">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-mono flex items-center gap-1 tracking-widest">
                  <Clock className="w-3 h-3" /> RECEIVED AT
                </p>
                <p className="text-sm font-mono text-white">
                  {format(new Date(signal.receivedAt), "yyyy-MM-dd HH:mm:ss")}
                </p>
                <p className="text-xs text-muted-foreground font-mono">
                  {formatDistanceToNow(new Date(signal.receivedAt), { addSuffix: true })}
                </p>
              </div>
              <Field label="ALERT TIME ({{time}})" value={signal.alertTime} />
              <Field label="TIMENOW" value={signal.timenow} />
              <Field label="EXCHANGE" value={signal.exchange} />
              <Field label="INTERVAL" value={signal.interval} />
              <Field label="CURRENCY" value={signal.currency} />
              <Field label="BASE CURRENCY" value={signal.basecurrency} />
            </CardContent>
          </Card>

          {/* OHLCV */}
          {(signal.open != null || signal.high != null || signal.low != null || signal.volume != null) && (
            <Card className="bg-card border-border/50 md:col-span-3">
              <CardHeader className="border-b border-border/50 pb-4">
                <CardTitle className="text-sm flex items-center gap-2 font-mono tracking-widest uppercase text-muted-foreground">
                  <BarChart2 className="w-4 h-4 text-primary" />
                  Bar Data (OHLCV)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 grid grid-cols-2 md:grid-cols-4 gap-6">
                <Field
                  label="OPEN"
                  value={signal.open != null ? signal.open.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 }) : null}
                />
                <Field
                  label="HIGH"
                  value={signal.high != null ? signal.high.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 }) : null}
                />
                <Field
                  label="LOW"
                  value={signal.low != null ? signal.low.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 }) : null}
                />
                <Field
                  label="VOLUME"
                  value={signal.volume != null ? signal.volume.toLocaleString() : null}
                />
              </CardContent>
            </Card>
          )}

          {/* Raw Payload */}
          <Card className="bg-card border-border/50 md:col-span-3">
            <CardHeader className="border-b border-border/50 pb-4">
              <CardTitle className="text-sm flex items-center gap-2 font-mono tracking-widest uppercase text-muted-foreground">
                <FileJson className="w-4 h-4 text-primary" />
                Raw Payload
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <pre className="p-6 overflow-x-auto text-xs font-mono text-blue-300 bg-[#0a0d14] rounded-b-lg leading-relaxed">
                {JSON.stringify(signal.raw, null, 2)}
              </pre>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
