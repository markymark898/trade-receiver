import { useState } from "react";
import { Link } from "wouter";
import { useListStrategies, useCreateStrategy, useUpdateStrategy, useDeleteStrategy, getListStrategiesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, FlaskConical, Pencil, Trash2, ChevronDown, ChevronUp, TrendingUp, TrendingDown, BarChart3, Tag, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import type { StrategyInput, StrategyWithStats } from "@workspace/api-client-react";

const emptyForm: StrategyInput = {
  name: "",
  description: null,
  ticker: null,
  signalTag: null,
  pineScript: null,
  alertMessageTemplate: null,
};

function PnLBadge({ value }: { value: string }) {
  const n = parseFloat(value);
  const isPos = n > 0;
  const isNeg = n < 0;
  return (
    <span
      className={`text-sm font-semibold tabular-nums ${isPos ? "text-green-600" : isNeg ? "text-red-500" : "text-muted-foreground"}`}
    >
      {isPos ? "+" : ""}{n.toFixed(2)}
    </span>
  );
}

interface FormModalProps {
  initial?: StrategyWithStats | null;
  onClose: () => void;
}

function FormModal({ initial, onClose }: FormModalProps) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [form, setForm] = useState<StrategyInput>(
    initial
      ? {
          name: initial.name,
          description: initial.description ?? null,
          ticker: initial.ticker ?? null,
          signalTag: initial.signalTag ?? null,
          pineScript: initial.pineScript ?? null,
          alertMessageTemplate: initial.alertMessageTemplate ?? null,
        }
      : { ...emptyForm },
  );
  const [tab, setTab] = useState<"info" | "pine" | "alert">("info");

  const create = useCreateStrategy({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListStrategiesQueryKey() });
        toast({ title: "Strategy saved" });
        onClose();
      },
      onError: () => toast({ title: "Failed to save", variant: "destructive" }),
    },
  });

  const update = useUpdateStrategy({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListStrategiesQueryKey() });
        toast({ title: "Strategy updated" });
        onClose();
      },
      onError: () => toast({ title: "Failed to update", variant: "destructive" }),
    },
  });

  const isPending = create.isPending || update.isPending;

  function handleSave() {
    if (!form.name?.trim()) { toast({ title: "Name is required", variant: "destructive" }); return; }
    const payload: StrategyInput = {
      name: form.name.trim(),
      description: form.description?.trim() || null,
      ticker: form.ticker?.trim().toUpperCase() || null,
      signalTag: form.signalTag?.trim() || null,
      pineScript: form.pineScript?.trim() || null,
      alertMessageTemplate: form.alertMessageTemplate?.trim() || null,
    };
    if (initial) {
      update.mutate({ id: initial.id, data: payload });
    } else {
      create.mutate({ data: payload });
    }
  }

  function set(k: keyof StrategyInput, v: string | null) {
    setForm((f) => ({ ...f, [k]: v || null }));
  }

  const tabCls = (t: typeof tab) =>
    `px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? "border-orange-500 text-orange-600" : "border-transparent text-muted-foreground hover:text-foreground"}`;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="text-lg font-semibold">{initial ? "Edit Strategy" : "New Strategy"}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl leading-none">✕</button>
        </div>

        <div className="flex border-b px-5">
          <button className={tabCls("info")} onClick={() => setTab("info")}>Info</button>
          <button className={tabCls("pine")} onClick={() => setTab("pine")}>Pine Script</button>
          <button className={tabCls("alert")} onClick={() => setTab("alert")}>Alert Message</button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {tab === "info" && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="name">Strategy Name <span className="text-red-500">*</span></Label>
                <Input id="name" placeholder="e.g. BTC RSI Scalper v2" value={form.name ?? ""} onChange={(e) => set("name", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ticker">Ticker</Label>
                <Input id="ticker" placeholder="e.g. BTCUSD" value={form.ticker ?? ""} onChange={(e) => set("ticker", e.target.value)} />
                <p className="text-xs text-muted-foreground">Signals with this ticker will be matched to this strategy for P&L tracking.</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="signalTag">Signal Tag</Label>
                <Input id="signalTag" placeholder="e.g. BTC RSI Scalper v2" value={form.signalTag ?? ""} onChange={(e) => set("signalTag", e.target.value)} />
                <p className="text-xs text-muted-foreground">
                  If your TradingView alert includes <code className="bg-muted px-1 rounded text-xs">{"{{strategy.title}}"}</code>, paste its value here to match signals by strategy name.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="description">Notes</Label>
                <Textarea id="description" rows={4} placeholder="Describe the strategy, conditions, or anything worth noting..." value={form.description ?? ""} onChange={(e) => set("description", e.target.value)} />
              </div>
            </>
          )}
          {tab === "pine" && (
            <div className="space-y-1.5">
              <Label htmlFor="pineScript">Pine Script</Label>
              <Textarea
                id="pineScript"
                rows={20}
                className="font-mono text-xs"
                placeholder={`//@version=5\nstrategy("My Strategy", overlay=true)\n// paste your Pine Script here...`}
                value={form.pineScript ?? ""}
                onChange={(e) => set("pineScript", e.target.value)}
              />
            </div>
          )}
          {tab === "alert" && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="alertMessageTemplate">TradingView Alert Message</Label>
                <Textarea
                  id="alertMessageTemplate"
                  rows={12}
                  className="font-mono text-xs"
                  placeholder={`{\n  "action": "{{strategy.order.action}}",\n  "ticker": "{{ticker}}",\n  "price": {{close}},\n  "strategy": "{{strategy.title}}"\n}`}
                  value={form.alertMessageTemplate ?? ""}
                  onChange={(e) => set("alertMessageTemplate", e.target.value)}
                />
              </div>
              <div className="rounded-lg bg-orange-50 border border-orange-200 p-3 text-xs text-orange-800 space-y-1">
                <p className="font-medium">Tip: include the strategy title for automatic P&L matching</p>
                <p>Add <code className="bg-orange-100 px-1 rounded">{"\"strategy\": \"{{strategy.title}}\""}</code> to your alert message, then set the <strong>Signal Tag</strong> on the Info tab to the same value as your TradingView strategy title.</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 p-5 border-t">
          <Button variant="outline" onClick={onClose} disabled={isPending}>Cancel</Button>
          <Button onClick={handleSave} disabled={isPending} className="bg-orange-500 hover:bg-orange-600 text-white">
            {isPending ? "Saving…" : "Save Strategy"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function StrategyCard({ strategy, onEdit, onDelete }: { strategy: StrategyWithStats; onEdit: () => void; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const stats = strategy.stats;
  const pnlNum = stats ? parseFloat(stats.totalPnL ?? "0") : 0;
  const isPos = pnlNum > 0;
  const isNeg = pnlNum < 0;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <CardTitle className="text-base">{strategy.name}</CardTitle>
              {strategy.ticker && (
                <Badge variant="outline" className="text-xs font-mono border-orange-300 text-orange-700 bg-orange-50">
                  {strategy.ticker}
                </Badge>
              )}
              {strategy.signalTag && (
                <Badge variant="outline" className="text-xs border-slate-300 text-slate-600 bg-slate-50 flex items-center gap-1">
                  <Tag className="w-3 h-3" />
                  {strategy.signalTag}
                </Badge>
              )}
            </div>
            {strategy.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">{strategy.description}</p>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={onEdit} className="p-1.5 rounded hover:bg-orange-50 text-muted-foreground hover:text-orange-600 transition-colors">
              <Pencil className="w-4 h-4" />
            </button>
            <button onClick={onDelete} className="p-1.5 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-3">
        {stats && (
          <div className="grid grid-cols-4 gap-2">
            <div className="rounded-lg bg-muted/50 px-3 py-2 text-center">
              <div className="text-xs text-muted-foreground mb-0.5">Signals</div>
              <div className="text-sm font-semibold">{stats.signalCount}</div>
            </div>
            <div className="rounded-lg bg-muted/50 px-3 py-2 text-center">
              <div className="text-xs text-muted-foreground mb-0.5">Trades</div>
              <div className="text-sm font-semibold">{stats.pairs}</div>
            </div>
            <div className="rounded-lg bg-muted/50 px-3 py-2 text-center">
              <div className="text-xs text-muted-foreground mb-0.5">Win Rate</div>
              <div className="text-sm font-semibold">{stats.pairs > 0 ? `${stats.winRate}%` : "—"}</div>
            </div>
            <div className="rounded-lg bg-muted/50 px-3 py-2 text-center">
              <div className="text-xs text-muted-foreground mb-0.5">P&L</div>
              {stats.pairs > 0 ? (
                <PnLBadge value={stats.totalPnL ?? "0"} />
              ) : (
                <div className="text-sm font-semibold text-muted-foreground">—</div>
              )}
            </div>
          </div>
        )}

        {stats && stats.pairs > 0 && (
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-green-500" />
              {stats.wins} wins
            </span>
            <span className="flex items-center gap-1">
              <TrendingDown className="w-3 h-3 text-red-400" />
              {stats.losses} losses
            </span>
          </div>
        )}

        {(strategy.pineScript || strategy.alertMessageTemplate) && (
          <div>
            <button
              onClick={() => setExpanded((e) => !e)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              {expanded ? "Hide" : "Show"} script &amp; alert
            </button>

            {expanded && (
              <div className="mt-3 space-y-3">
                {strategy.pineScript && (
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <BarChart3 className="w-3.5 h-3.5 text-orange-500" />
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Pine Script</span>
                    </div>
                    <pre className="bg-slate-950 text-slate-100 text-xs rounded-lg p-3 overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto font-mono">
                      {strategy.pineScript}
                    </pre>
                  </div>
                )}
                {strategy.alertMessageTemplate && (
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-orange-500" />
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Alert Message Template</span>
                    </div>
                    <pre className="bg-slate-950 text-slate-100 text-xs rounded-lg p-3 overflow-x-auto whitespace-pre-wrap leading-relaxed font-mono">
                      {strategy.alertMessageTemplate}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function StrategiesPage() {
  const { data: strategies, isLoading } = useListStrategies();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<StrategyWithStats | null>(null);

  const del = useDeleteStrategy({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListStrategiesQueryKey() });
        toast({ title: "Strategy deleted" });
      },
      onError: () => toast({ title: "Failed to delete", variant: "destructive" }),
    },
  });

  function handleDelete(s: StrategyWithStats) {
    if (!confirm(`Delete "${s.name}"? This cannot be undone.`)) return;
    del.mutate({ id: s.id });
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/">
            <button className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Dashboard
            </button>
          </Link>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FlaskConical className="w-6 h-6 text-orange-500" />
              Strategies
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Save your Pine Script strategies and alert messages. P&L is computed from matched signals.
            </p>
          </div>
          <Button
            onClick={() => { setEditing(null); setShowModal(true); }}
            className="bg-orange-500 hover:bg-orange-600 text-white flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Strategy
          </Button>
        </div>

        {isLoading && (
          <div className="grid gap-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-40 rounded-xl bg-muted/50 animate-pulse" />
            ))}
          </div>
        )}

        {!isLoading && (!strategies || strategies.length === 0) && (
          <div className="text-center py-20 space-y-3">
            <FlaskConical className="w-12 h-12 text-muted-foreground/30 mx-auto" />
            <p className="text-muted-foreground font-medium">No strategies yet</p>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              Save your first Pine Script strategy along with its TradingView alert message to track its P&L.
            </p>
            <Button
              onClick={() => { setEditing(null); setShowModal(true); }}
              variant="outline"
              className="mt-2"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Add your first strategy
            </Button>
          </div>
        )}

        {!isLoading && strategies && strategies.length > 0 && (
          <div className="grid gap-4">
            {strategies.map((s) => (
              <StrategyCard
                key={s.id}
                strategy={s}
                onEdit={() => { setEditing(s); setShowModal(true); }}
                onDelete={() => handleDelete(s)}
              />
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <FormModal
          initial={editing}
          onClose={() => { setShowModal(false); setEditing(null); }}
        />
      )}
    </div>
  );
}
