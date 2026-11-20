/** Journal post blocks. Pure helpers shared by the editor, the public page and the SEO scorer. */

export type Block =
  | { id: string; type: "heading"; level: 2 | 3; text: string }
  | { id: string; type: "paragraph"; text: string }
  | { id: string; type: "list"; style: "bullet" | "number"; items: string[] }
  | { id: string; type: "image"; url: string; alt: string; caption: string }
  | { id: string; type: "quote"; text: string; cite: string }
  | { id: string; type: "callout"; text: string }
  | { id: string; type: "faq"; question: string; answer: string }
  | { id: string; type: "button"; label: string; url: string }
  | { id: string; type: "video"; url: string }
  | { id: string; type: "divider" };

export type BlockType = Block["type"];

export const BLOCK_TYPES: { type: BlockType; label: string; hint: string }[] = [
  { type: "paragraph", label: "Text", hint: "Paragraph. **bold**, *italic*, [link](https://…)" },
  { type: "heading", label: "Heading", hint: "Section title (H2 or H3)" },
  { type: "list", label: "List", hint: "Bullets or numbered steps" },
  { type: "image", label: "Image", hint: "Upload or paste a URL, with alt text" },
  { type: "quote", label: "Quote", hint: "Pull quote with source" },
  { type: "callout", label: "Callout", hint: "Highlighted key point" },
  { type: "faq", label: "FAQ", hint: "Question and answer (marked up for search and AI)" },
  { type: "button", label: "Button", hint: "Call to action link" },
  { type: "video", label: "Video", hint: "YouTube or Vimeo link" },
  { type: "divider", label: "Divider", hint: "Section break" }
];

const MAX_TEXT = 8000;
const MAX_BLOCKS = 300;

export function blockId() {
  return Math.random().toString(36).slice(2, 10);
}

export function emptyBlock(type: BlockType): Block {
  const id = blockId();
  switch (type) {
    case "heading":
      return { id, type, level: 2, text: "" };
    case "list":
      return { id, type, style: "bullet", items: [""] };
    case "image":
      return { id, type, url: "", alt: "", caption: "" };
    case "quote":
      return { id, type, text: "", cite: "" };
    case "faq":
      return { id, type, question: "", answer: "" };
    case "button":
      return { id, type, label: "", url: "" };
    case "video":
      return { id, type, url: "" };
    case "divider":
      return { id, type };
    case "callout":
      return { id, type, text: "" };
    default:
      return { id, type: "paragraph", text: "" };
  }
}

function str(value: unknown, max = MAX_TEXT) {
  return typeof value === "string" ? value.slice(0, max) : "";
}

/** Allows https/http links, site-relative paths, mailto and tel. Anything else becomes empty. */
export function safeUrl(value: unknown) {
  const url = str(value, 2000).trim();
  if (!url) return "";
  if (url.startsWith("/") && !url.startsWith("//")) return url;
  if (/^(https?:\/\/|mailto:|tel:)/i.test(url)) return url;
  return "";
}

export function cleanBlocks(raw: unknown): Block[] {
  if (!Array.isArray(raw)) return [];
  const out: Block[] = [];
  for (const item of raw.slice(0, MAX_BLOCKS)) {
    if (!item || typeof item !== "object") continue;
    const b = item as Record<string, unknown>;
    const id = /^[a-z0-9]{1,16}$/i.test(String(b.id || "")) ? String(b.id) : blockId();
    switch (b.type) {
      case "heading":
        out.push({ id, type: "heading", level: b.level === 3 ? 3 : 2, text: str(b.text, 300) });
        break;
      case "paragraph":
        out.push({ id, type: "paragraph", text: str(b.text) });
        break;
      case "list": {
        const items = Array.isArray(b.items) ? b.items.slice(0, 60).map((value) => str(value, 1000)) : [];
        out.push({ id, type: "list", style: b.style === "number" ? "number" : "bullet", items });
        break;
      }
      case "image":
        out.push({ id, type: "image", url: safeUrl(b.url), alt: str(b.alt, 300), caption: str(b.caption, 500) });
        break;
      case "quote":
        out.push({ id, type: "quote", text: str(b.text, 2000), cite: str(b.cite, 200) });
        break;
      case "callout":
        out.push({ id, type: "callout", text: str(b.text, 2000) });
        break;
      case "faq":
        out.push({ id, type: "faq", question: str(b.question, 300), answer: str(b.answer, 3000) });
        break;
      case "button":
        out.push({ id, type: "button", label: str(b.label, 80), url: safeUrl(b.url) });
        break;
      case "video":
        out.push({ id, type: "video", url: safeUrl(b.url) });
        break;
      case "divider":
        out.push({ id, type: "divider" });
        break;
      default:
        break;
    }
  }
  return normalizeBlocks(out);
}

function splitParagraph(block: Extract<Block, { type: "paragraph" }>): Block[] {
  const text = block.text.trim();
  if (!text) return [block];

  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length >= 2) {
    const numbered = lines.map((line) => line.match(/^(\d{1,2})[.)]\s+(.+)$/));
    if (numbered.every(Boolean) && numbered.every((match, index) => Number(match?.[1]) === index + 1)) {
      return [{ id: block.id, type: "list", style: "number", items: numbered.map((match) => match?.[2] || "") }];
    }
    const bullets = lines.map((line) => line.match(/^[-•]\s+(.+)$/));
    if (bullets.every(Boolean)) {
      return [{ id: block.id, type: "list", style: "bullet", items: bullets.map((match) => match?.[1] || "") }];
    }
  }

  const markers = Array.from(text.matchAll(/(^|\s)(\d{1,2})[.)]\s+(?=[A-Z])/g));
  const sequential = markers.length >= 2 && markers.every((match, index) => Number(match[2]) === index + 1);
  if (!sequential) return [block];

  const first = markers[0];
  const lead = text.slice(0, first.index).trim();
  const items = markers.map((marker, index) => {
    const start = (marker.index || 0) + marker[0].length;
    const end = index + 1 < markers.length ? markers[index + 1].index : text.length;
    return text.slice(start, end).trim();
  }).filter(Boolean);
  if (items.length < 2) return [block];

  return [
    ...(lead ? [{ id: block.id, type: "paragraph" as const, text: lead }] : []),
    { id: blockId(), type: "list" as const, style: "number" as const, items }
  ];
}

/** Repairs pasted or AI-written paragraphs that contain list syntax. */
export function normalizeBlocks(blocks: Block[]) {
  return blocks.flatMap((block) => (block.type === "paragraph" ? splitParagraph(block) : [block]));
}

/** Older posts store plain text with blank lines between paragraphs. */
export function blocksFromBody(body: string): Block[] {
  const blocks = body
    .split(/\n\n+/)
    .map((text) => text.trim())
    .filter(Boolean)
    .map((text) => {
      const heading = text.match(/^(#{2,3})\s+(.+)$/);
      if (heading) return { id: blockId(), type: "heading" as const, level: heading[1].length === 3 ? 3 as const : 2 as const, text: heading[2] };
      return { id: blockId(), type: "paragraph" as const, text };
    });
  return normalizeBlocks(blocks);
}

/** Plain text version (used for the legacy body column, word counts and AI prompts). */
export function blocksToText(blocks: Block[]) {
  return blocks
    .map((block) => {
      switch (block.type) {
        case "heading":
        case "paragraph":
        case "callout":
          return stripInline(block.text);
        case "quote":
          return stripInline(block.text);
        case "list":
          return block.items.map(stripInline).join("\n");
        case "faq":
          return `${block.question}\n${stripInline(block.answer)}`;
        case "image":
          return block.caption;
        default:
          return "";
      }
    })
    .filter(Boolean)
    .join("\n\n");
}

export type Inline =
  | { kind: "text"; text: string }
  | { kind: "bold"; text: string }
  | { kind: "italic"; text: string }
  | { kind: "link"; text: string; url: string };

function bareLinkLabel(url: string) {
  try {
    const parsed = new URL(url);
    return `${parsed.hostname.replace(/^www\./, "")}${parsed.pathname === "/" ? "" : parsed.pathname.replace(/\/$/, "")}`;
  } catch {
    return url;
  }
}

/** Parses emphasis, Markdown links and bare web addresses. Unsafe targets render as plain text. */
export function parseInline(text: string): Inline[] {
  const out: Inline[] = [];
  const pattern = /\*\*([^*]+)\*\*|\*([^*]+)\*|\[([^\]]+)\]\(([^)\s]+)\)|\((https?:\/\/[^)\s]+)\)|(https?:\/\/[^\s<>()]+)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text))) {
    if (match.index > last) out.push({ kind: "text", text: text.slice(last, match.index) });
    if (match[1] !== undefined) out.push({ kind: "bold", text: match[1] });
    else if (match[2] !== undefined) out.push({ kind: "italic", text: match[2] });
    else if (match[3] !== undefined) {
      const url = safeUrl(match[4]);
      out.push(url ? { kind: "link", text: match[3], url } : { kind: "text", text: match[3] });
    } else {
      const raw = match[5] || match[6] || "";
      const trailing = raw.match(/[.,!?;:]+$/)?.[0] || "";
      const candidate = trailing ? raw.slice(0, -trailing.length) : raw;
      const url = safeUrl(candidate);
      out.push(url ? { kind: "link", text: bareLinkLabel(url), url } : { kind: "text", text: raw });
      if (trailing) out.push({ kind: "text", text: trailing });
    }
    last = pattern.lastIndex;
  }
  if (last < text.length) out.push({ kind: "text", text: text.slice(last) });
  return out;
}

export function stripInline(text: string) {
  return parseInline(text)
    .map((part) => part.text)
    .join("");
}

export function linksIn(blocks: Block[]) {
  const urls: string[] = [];
  for (const block of blocks) {
    const texts =
      block.type === "list" ? block.items : "text" in block ? [block.text] : block.type === "faq" ? [block.answer] : [];
    for (const text of texts) {
      for (const part of parseInline(text)) if (part.kind === "link") urls.push(part.url);
    }
    if (block.type === "button" && block.url) urls.push(block.url);
  }
  return urls;
}

export function videoEmbed(url: string) {
  const youtube = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{6,20})/);
  if (youtube) return `https://www.youtube-nocookie.com/embed/${youtube[1]}`;
  const vimeo = url.match(/vimeo\.com\/(\d{5,12})/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return "";
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

export function wordCount(text: string) {
  return (text.match(/[A-Za-z0-9’']+/g) || []).length;
}
