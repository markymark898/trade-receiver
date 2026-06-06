import { useState, useCallback } from "react";
import {
  Copy, Check, Terminal, Bot, Info, AlertTriangle, Lightbulb,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import type { GuideNode } from "@/lib/guideParser";

/* ─── inline text renderer ─────────────────────────────────────────────── */

function renderInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const re = /(\*\*([^*]+)\*\*|`([^`]+)`|\[KEY\](.*?)\[\/KEY\])/gs;
  let last = 0;
  let i = 0;
  let m: RegExpExecArray | null;

  const codeStyle = "px-1.5 py-0.5 bg-gray-100 text-gray-800 rounded text-xs font-mono border border-gray-200 align-baseline";

  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      parts.push(<span key={i++}>{text.slice(last, m.index)}</span>);
    }
    if (m[2] !== undefined) {
      parts.push(<strong key={i++} className="font-semibold text-gray-900">{m[2]}</strong>);
    } else if (m[3] !== undefined) {
      parts.push(<code key={i++} className={codeStyle}>{m[3]}</code>);
    } else if (m[4] !== undefined) {
      parts.push(<code key={i++} className={codeStyle}>{m[4]}</code>);
    }
    last = m.index + m[0].length;
  }

  if (last < text.length) {
    parts.push(<span key={i++}>{text.slice(last)}</span>);
  }
  return parts;
}

/* ─── block text renderer ───────────────────────────────────────────────── */

function Prose({ children: raw }: { children: string }) {
  const blocks = raw.split(/\n{2,}/);
  return (
    <div className="space-y-2">
      {blocks.map((block, bi) => {
        const t = block.trim();
        if (!t || t === "---") {
          return t === "---" ? <hr key={bi} className="my-3 border-gray-200" /> : null;
        }

        // Heading
        const hm = t.match(/^(#{1,3})\s+(.+)$/);
        if (hm) {
          const cls = hm[1].length === 1
            ? "text-xl font-bold text-gray-900 mt-3"
            : hm[1].length === 2
            ? "text-lg font-semibold text-gray-900 mt-3"
            : "text-base font-semibold text-gray-800 mt-2";
          return <p key={bi} className={cls}>{hm[2]}</p>;
        }

        // Ordered list
        const lines = t.split("\n");
        const isOl = lines.every((l) => /^\d+\.\s/.test(l.trim()) || !l.trim());
        if (isOl && lines.some((l) => /^\d+\.\s/.test(l.trim()))) {
          return (
            <ol key={bi} className="list-decimal list-outside pl-5 space-y-0.5 text-sm text-gray-700">
              {lines.filter((l) => /^\d+\.\s/.test(l.trim())).map((l, li) => (
                <li key={li}>{renderInline(l.replace(/^\d+\.\s/, ""))}</li>
              ))}
            </ol>
          );
        }

        // Unordered list
        const isUl = lines.some((l) => /^[-*]\s/.test(l.trim()));
        if (isUl) {
          const items = lines.filter((l) => /^[-*]\s/.test(l.trim()));
          return (
            <ul key={bi} className="list-disc list-outside pl-5 space-y-0.5 text-sm text-gray-700">
              {items.map((l, li) => (
                <li key={li}>{renderInline(l.replace(/^[-*]\s/, ""))}</li>
              ))}
            </ul>
          );
        }

        // Paragraph — join lines
        const joined = lines.join(" ");
        return (
          <p key={bi} className="text-sm text-gray-700 leading-relaxed">
            {renderInline(joined)}
          </p>
        );
      })}
    </div>
  );
}

/* ─── copy button ──────────────────────────────────────────────────────── */

function CopyButton({ text, className = "" }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(() => {
    void navigator.clipboard.writeText(text.trim()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className={`inline-flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium transition-colors ${className}`}
    >
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

/* ─── pipe table ──────────────────────────────────────────────────────── */

function PipeTable({ raw }: { raw: string }) {
  const lines = raw.trim().split("\n").filter(Boolean);
  if (lines.length < 2) return <Prose>{raw}</Prose>;
  const parseRow = (l: string) => l.split("|").slice(1, -1).map((c) => c.trim());
  const isSep = (l: string) => !/[a-zA-Z0-9]/.test(l);
  const [hdr, ...rest] = lines;
  const headers = parseRow(hdr ?? "");
  const rows = rest.filter((l) => !isSep(l)).map(parseRow);

  return (
    <div className="overflow-x-auto rounded-md border border-gray-200 my-3">
      <table className="min-w-full text-sm">
        <thead className="bg-orange-50">
          <tr>
            {headers.map((h, i) => (
              <th key={i} className="px-4 py-2 text-left font-semibold text-orange-900 border-b border-orange-200">
                {renderInline(h)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className={ri % 2 === 0 ? "bg-white" : "bg-gray-50"}>
              {row.map((cell, ci) => (
                <td key={ci} className="px-4 py-2 border-b border-gray-100 text-gray-700 text-sm">
                  {renderInline(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─── leaf block renderers ─────────────────────────────────────────────── */

function CopyBlock({ content }: { content: string }) {
  return (
    <div className="relative rounded-md border border-gray-200 bg-gray-50 my-3 group">
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <CopyButton
          text={content}
          className="bg-white border border-gray-200 text-gray-600 hover:bg-orange-50 hover:text-orange-700 hover:border-orange-300 shadow-sm"
        />
      </div>
      <pre className="p-4 pr-20 text-xs font-mono text-gray-800 overflow-x-auto whitespace-pre leading-relaxed">
        {content.trim()}
      </pre>
    </div>
  );
}

function CmdBlock({ content }: { content: string }) {
  return (
    <div className="relative rounded-md bg-gray-950 my-3 group">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-800">
        <Terminal className="w-3 h-3 text-gray-500" />
        <span className="text-xs text-gray-500 font-mono">Terminal</span>
        <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
          <CopyButton text={content} className="text-gray-400 hover:text-green-400 hover:bg-gray-800" />
        </div>
      </div>
      <pre className="p-4 text-xs font-mono text-green-400 overflow-x-auto whitespace-pre leading-relaxed">
        {content.trim()}
      </pre>
    </div>
  );
}

function PromptBlock({ label, content }: { label: string; content: string }) {
  return (
    <div className="rounded-lg border-2 border-orange-300 bg-orange-50 my-4">
      <div className="flex items-center justify-between px-4 py-3 bg-orange-100 border-b border-orange-200 rounded-t-md">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-orange-600 shrink-0" />
          <span className="text-sm font-semibold text-orange-800">AI Prompt</span>
          {label && (
            <>
              <span className="text-orange-400 text-sm">·</span>
              <span className="text-sm text-orange-700 truncate max-w-xs">{label}</span>
            </>
          )}
        </div>
        <CopyButton
          text={content}
          className="bg-orange-500 text-white hover:bg-orange-600 shadow-sm px-3 py-1.5 shrink-0 ml-2"
        />
      </div>
      <pre className="p-4 text-xs font-mono text-gray-800 overflow-x-auto whitespace-pre leading-relaxed">
        {content.trim()}
      </pre>
    </div>
  );
}

function Callout({
  variant, content,
}: {
  variant: "note" | "warn" | "tip";
  content: string;
}) {
  const cfg = {
    note:  { wrap: "bg-blue-50 border border-blue-200", icon: <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />, text: "" },
    warn:  { wrap: "bg-amber-50 border border-amber-200", icon: <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />, text: "" },
    tip:   { wrap: "bg-green-50 border border-green-200", icon: <Lightbulb className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />, text: "" },
  }[variant];

  return (
    <div className={`flex gap-3 p-4 rounded-md my-3 ${cfg.wrap}`}>
      {cfg.icon}
      <div className="flex-1 min-w-0 text-sm leading-relaxed text-gray-800">
        <Prose>{content}</Prose>
      </div>
    </div>
  );
}

/* ─── container renderers ──────────────────────────────────────────────── */

function StepBlock({ n, title, children }: { n: number; title: string; children: GuideNode[] }) {
  return (
    <div className="flex gap-4 my-5">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center text-sm font-bold shadow-sm">
        {n}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-gray-900 mb-3">{title}</h4>
        <RenderNodes nodes={children} />
      </div>
    </div>
  );
}

function SectionBlock({ title, children }: { title: string; children: GuideNode[] }) {
  return (
    <div className="my-8">
      <h3 className="text-lg font-semibold text-gray-900 mb-1 pb-2 border-b-2 border-orange-200">
        {title}
      </h3>
      <div className="mt-4">
        <RenderNodes nodes={children} />
      </div>
    </div>
  );
}

function NavBlock({ prev, next }: { prev: string; next: string }) {
  const hasPrev = prev && prev.toLowerCase() !== "none";
  const hasNext = next && next.toLowerCase() !== "none";
  if (!hasPrev && !hasNext) return null;
  return (
    <div className="flex justify-between items-center mt-10 pt-4 border-t border-gray-200">
      {hasPrev ? (
        <button className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-orange-600 font-medium transition-colors">
          <ChevronLeft className="w-4 h-4" />{prev}
        </button>
      ) : <div />}
      {hasNext ? (
        <button className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-orange-600 font-medium transition-colors">
          {next}<ChevronRight className="w-4 h-4" />
        </button>
      ) : <div />}
    </div>
  );
}

/* ─── recursive renderer ───────────────────────────────────────────────── */

function RenderNode({ node }: { node: GuideNode }) {
  switch (node.type) {
    case "page":
      return (
        <div>
          <div className="mb-8 pb-5 border-b-2 border-orange-300">
            <p className="text-xs text-orange-500 font-mono mb-1 tracking-widest">PAGE {node.n}</p>
            <h1 className="text-2xl font-bold text-gray-900">{node.title}</h1>
          </div>
          <RenderNodes nodes={node.children} />
        </div>
      );
    case "section":
      return <SectionBlock title={node.title} children={node.children} />;
    case "step":
      return <StepBlock n={node.n} title={node.title} children={node.children} />;
    case "copy":
      return <CopyBlock content={node.content} />;
    case "cmd":
      return <CmdBlock content={node.content} />;
    case "prompt":
      return <PromptBlock label={node.label} content={node.content} />;
    case "note":
      return <Callout variant="note" content={node.content} />;
    case "warn":
      return <Callout variant="warn" content={node.content} />;
    case "tip":
      return <Callout variant="tip" content={node.content} />;
    case "table":
      return <PipeTable raw={node.content} />;
    case "nav":
      return <NavBlock prev={node.prev} next={node.next} />;
    case "text":
      return <Prose>{node.content}</Prose>;
    default:
      return null;
  }
}

function RenderNodes({ nodes }: { nodes: GuideNode[] }) {
  return <>{nodes.map((n, i) => <RenderNode key={i} node={n} />)}</>;
}

export function GuideRenderer({ nodes }: { nodes: GuideNode[] }) {
  return (
    <div className="max-w-4xl mx-auto">
      <RenderNodes nodes={nodes} />
    </div>
  );
}
