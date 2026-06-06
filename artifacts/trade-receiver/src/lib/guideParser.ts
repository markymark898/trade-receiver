export type GuideNode =
  | { type: "page"; n: number; title: string; children: GuideNode[] }
  | { type: "section"; title: string; children: GuideNode[] }
  | { type: "step"; n: number; title: string; children: GuideNode[] }
  | { type: "copy"; content: string }
  | { type: "cmd"; content: string }
  | { type: "prompt"; label: string; content: string }
  | { type: "note"; content: string }
  | { type: "warn"; content: string }
  | { type: "tip"; content: string }
  | { type: "table"; content: string }
  | { type: "nav"; prev: string; next: string }
  | { type: "text"; content: string };

interface Frame {
  tag: string;
  attrs: string;
  children: GuideNode[];
}

function makeTagRe() {
  return /\[((?:\/)?(?:PAGE|SECTION|STEP|COPY|CMD|PROMPT|NOTE|WARN|TIP|TABLE|NAV))(?::([^\]]*))?\]/g;
}

function buildNode(tag: string, attrs: string, children: GuideNode[]): GuideNode {
  const leafText = children
    .filter((c) => c.type === "text")
    .map((c) => (c as { type: "text"; content: string }).content)
    .join("\n\n");

  switch (tag) {
    case "PAGE": {
      const pipe = attrs.indexOf("|");
      const n = pipe >= 0 ? parseInt(attrs.slice(0, pipe), 10) || 1 : 1;
      const title = pipe >= 0 ? attrs.slice(pipe + 1) : attrs;
      return { type: "page", n, title, children };
    }
    case "SECTION":
      return { type: "section", title: attrs, children };
    case "STEP": {
      const pipe = attrs.indexOf("|");
      const n = pipe >= 0 ? parseInt(attrs.slice(0, pipe), 10) || 1 : 1;
      const title = pipe >= 0 ? attrs.slice(pipe + 1) : attrs;
      return { type: "step", n, title, children };
    }
    case "COPY":
      return { type: "copy", content: leafText };
    case "CMD":
      return { type: "cmd", content: leafText };
    case "PROMPT": {
      const allContent = children
        .map((c) => (c.type === "text" ? c.content : ""))
        .join("\n\n");
      return { type: "prompt", label: attrs, content: allContent };
    }
    case "NOTE":
      return { type: "note", content: leafText };
    case "WARN":
      return { type: "warn", content: leafText };
    case "TIP":
      return { type: "tip", content: leafText };
    case "TABLE":
      return { type: "table", content: leafText };
    default:
      return { type: "text", content: leafText };
  }
}

function pushText(frame: Frame, raw: string) {
  const trimmed = raw.replace(/^\n+|\n+$/g, "");
  if (!trimmed) return;
  const last = frame.children[frame.children.length - 1];
  if (last && last.type === "text") {
    (last as { type: "text"; content: string }).content += "\n\n" + trimmed;
  } else {
    frame.children.push({ type: "text", content: trimmed });
  }
}

export function parseGuide(text: string): GuideNode[] {
  const TAG_RE = makeTagRe();
  const root: Frame = { tag: "ROOT", attrs: "", children: [] };
  const stack: Frame[] = [root];
  let lastIndex = 0;

  let match: RegExpExecArray | null;

  while ((match = TAG_RE.exec(text)) !== null) {
    const before = text.slice(lastIndex, match.index);
    lastIndex = match.index + match[0].length;

    const tagFull = match[1] ?? "";
    const attrs = match[2] ?? "";
    const current = stack[stack.length - 1];

    if (before) pushText(current, before);

    if (tagFull === "NAV") {
      const [prev = "", next = ""] = attrs.split("|");
      current.children.push({ type: "nav", prev: prev.trim(), next: next.trim() });
    } else if (tagFull.startsWith("/")) {
      const frame = stack.pop()!;
      const parent = stack[stack.length - 1];
      parent.children.push(buildNode(frame.tag, frame.attrs, frame.children));
    } else {
      stack.push({ tag: tagFull, attrs, children: [] });
    }
  }

  const remaining = text.slice(lastIndex);
  const current = stack[stack.length - 1];
  if (remaining) pushText(current, remaining);

  // Flush any unclosed frames so all content reaches root
  while (stack.length > 1) {
    const frame = stack.pop()!;
    const parent = stack[stack.length - 1];
    parent.children.push(buildNode(frame.tag, frame.attrs, frame.children));
  }

  return root.children;
}
