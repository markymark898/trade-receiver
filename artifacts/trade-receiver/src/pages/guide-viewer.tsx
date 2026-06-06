import { useState, useEffect } from "react";
import { Link, useParams } from "wouter";
import { ArrowLeft, FileText, BookOpen, Loader2, AlertCircle } from "lucide-react";
import { parseGuide } from "@/lib/guideParser";
import { GuideRenderer } from "@/components/GuideRenderer";

const GUIDE_LABELS: Record<string, string> = {
  "build-prompt": "AI Build Prompt",
  "SYMBOL-KEY": "Symbol Key",
  "segment-1-introduction": "Guide: Introduction",
  "segment-2-building-the-app": "Guide: Building the App",
  "segment-3-tradingview-setup": "Guide: TradingView Setup",
  "segment-4-going-live": "Guide: Going Live",
};

function GuideList({ onSelect }: { onSelect: (slug: string) => void }) {
  const [files, setFiles] = useState<{ name: string; slug: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/guide-files")
      .then((r) => r.json())
      .then((data: unknown) => {
        if (Array.isArray(data)) {
          setFiles(data as { name: string; slug: string }[]);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Available Guides</h2>
      <div className="space-y-2">
        {files.map((f) => (
          <button
            key={f.slug}
            onClick={() => onSelect(f.slug)}
            className="w-full flex items-center gap-3 p-4 rounded-lg border border-gray-200 bg-white hover:bg-orange-50 hover:border-orange-300 transition-colors text-left group"
          >
            <FileText className="w-5 h-5 text-orange-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="font-medium text-gray-900 group-hover:text-orange-700">
                {GUIDE_LABELS[f.slug] ?? f.slug}
              </div>
              <div className="text-xs text-gray-400 font-mono mt-0.5">{f.name}</div>
            </div>
          </button>
        ))}
        {files.length === 0 && (
          <p className="text-sm text-gray-500 py-4 text-center">No guide files found.</p>
        )}
      </div>
    </div>
  );
}

function GuideView({ slug }: { slug: string }) {
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/guide-files/${encodeURIComponent(slug)}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`File not found`);
        return r.text();
      })
      .then(setContent)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
      </div>
    );
  }

  if (error || !content) {
    return (
      <div className="flex items-center justify-center py-24 gap-3 text-red-600">
        <AlertCircle className="w-5 h-5" />
        <span className="text-sm">{error ?? "No content"}</span>
      </div>
    );
  }

  const nodes = parseGuide(content);
  return <GuideRenderer nodes={nodes} />;
}

export default function GuideViewerPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug;
  const [selected, setSelected] = useState<string | null>(slug ?? null);

  const label = selected ? (GUIDE_LABELS[selected] ?? selected) : null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center gap-4">
          {selected ? (
            <button
              onClick={() => setSelected(null)}
              className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-orange-600 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              All Guides
            </button>
          ) : (
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-orange-600 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Dashboard
            </Link>
          )}

          <div className="h-4 w-px bg-gray-200" />

          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-orange-500" />
            <span className="text-sm font-medium text-gray-900">
              {label ?? "Guides"}
            </span>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        {selected ? (
          <GuideView slug={selected} />
        ) : (
          <GuideList onSelect={setSelected} />
        )}
      </div>
    </div>
  );
}
