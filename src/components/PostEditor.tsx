"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { aiDraftPost, aiRewrite, aiSeoAdvice, type SeoAdvice } from "@/lib/ai-actions";
import { BLOCK_TYPES, blocksToText, emptyBlock, slugify, type Block, type BlockType } from "@/lib/blocks";
import { savePostEditor, uploadPostImage, type PostStatus } from "@/lib/post-actions";
import { scorePost } from "@/lib/seo-score";
import { BlockView } from "@/components/BlockView";

export type EditorPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  seoTitle: string;
  seoDescription: string;
  focusKeyword: string;
  coverUrl: string;
  authorName: string;
  blocks: Block[];
  status: PostStatus;
  publishAt: string | null;
  updatedAt: string;
};

const input = "w-full rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-moss focus:ring-2 focus:ring-moss/15";
const ghost = "rounded-full border border-ink/15 px-3 py-1.5 text-xs hover:bg-ink/5 disabled:opacity-40";

const REWRITES = [
  ["Improve", "Improve clarity and flow without changing the meaning."],
  ["Shorter", "Make it about 40% shorter."],
  ["Longer", "Expand with one more concrete example or detail."],
  ["Simpler", "Rewrite for a reader with no technical background."],
  ["Fix grammar", "Fix spelling and grammar only."],
  ["Direct answer", "Rewrite so the first sentence directly answers the question, suitable for AI answer engines to quote."]
] as const;

function localInput(iso: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function Ring({ value, label }: { value: number; label: string }) {
  const tone = value >= 80 ? "#0f7a56" : value >= 50 ? "#b7791f" : "#b42318";
  const circumference = 2 * Math.PI * 22;
  return (
    <div className="flex items-center gap-3">
      <svg width="56" height="56" viewBox="0 0 56 56" aria-hidden="true">
        <circle cx="28" cy="28" r="22" fill="none" stroke="currentColor" strokeOpacity="0.1" strokeWidth="6" />
        <circle
          cx="28" cy="28" r="22" fill="none" stroke={tone} strokeWidth="6" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={circumference * (1 - value / 100)} transform="rotate(-90 28 28)"
        />
        <text x="28" y="32" textAnchor="middle" fontSize="14" fontWeight="600" fill="currentColor">{value}</text>
      </svg>
      <span className="text-sm">{label}</span>
    </div>
  );
}

function Counter({ value, min, max }: { value: number; min: number; max: number }) {
  const ok = value >= min && value <= max;
  return <span className={`text-xs ${ok ? "text-moss" : "text-ink/45"}`}>{value} / {min}–{max}</span>;
}

export function PostEditor({ initial, authors, aiReady, siteUrl }: { initial: EditorPost; authors: string[]; aiReady: boolean; siteUrl: string }) {
  const [post, setPost] = useState<EditorPost>(initial);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [preview, setPreview] = useState(false);
  const [panel, setPanel] = useState<"seo" | "ai">("seo");
  const [scheduleAt, setScheduleAt] = useState(localInput(initial.publishAt));
  const [pending, startTransition] = useTransition();
  const [aiBusy, setAiBusy] = useState("");
  const [advice, setAdvice] = useState<SeoAdvice | null>(null);
  const [brief, setBrief] = useState({ brief: "", keyword: "", audience: "", length: "standard" as "short" | "standard" | "long" });
  const [dragId, setDragId] = useState<string | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [inserter, setInserter] = useState<number | null>(null);
  const slugTouched = useRef(Boolean(initial.slug));

  const update = useCallback((patch: Partial<EditorPost>) => {
    setPost((current) => {
      const next = { ...current, ...patch };
      if (patch.title !== undefined && !slugTouched.current) next.slug = slugify(patch.title);
      return next;
    });
    setDirty(true);
  }, []);

  const setBlocks = useCallback((fn: (blocks: Block[]) => Block[]) => {
    setPost((current) => ({ ...current, blocks: fn(current.blocks) }));
    setDirty(true);
  }, []);

  const patchBlock = (id: string, patch: Partial<Block>) =>
    setBlocks((blocks) => blocks.map((block) => (block.id === id ? ({ ...block, ...patch } as Block) : block)));

  const insertBlock = (type: BlockType, at: number) => {
    setBlocks((blocks) => [...blocks.slice(0, at), emptyBlock(type), ...blocks.slice(at)]);
    setInserter(null);
  };

  const move = (from: number, to: number) =>
    setBlocks((blocks) => {
      if (to < 0 || to >= blocks.length || from === to) return blocks;
      const next = [...blocks];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });

  const score = useMemo(
    () =>
      scorePost({
        title: post.title,
        seoTitle: post.seoTitle,
        seoDescription: post.seoDescription,
        slug: post.slug,
        focusKeyword: post.focusKeyword,
        excerpt: post.excerpt,
        coverUrl: post.coverUrl,
        authorName: post.authorName,
        blocks: post.blocks
      }),
    [post]
  );

  const save = useCallback(
    (mode: "save" | "publish" | "schedule" | "unpublish") => {
      setMessage(null);
      startTransition(async () => {
        const publishAt = mode === "schedule" && scheduleAt ? new Date(scheduleAt).toISOString() : null;
        let result: Awaited<ReturnType<typeof savePostEditor>>;
        try {
          result = await savePostEditor(JSON.stringify({ ...post, mode, publishAt }));
        } catch {
          setMessage({ tone: "error", text: "Could not reach the server. Your changes are still here; try again." });
          return;
        }
        if (!result.ok) {
          setMessage({ tone: "error", text: result.error || "Could not save." });
          return;
        }
        setPost((current) => ({
          ...current,
          id: result.id || current.id,
          slug: result.slug || current.slug,
          status: result.status || current.status,
          publishAt: mode === "schedule" ? publishAt : mode === "save" ? current.publishAt : null,
          updatedAt: result.savedAt || current.updatedAt
        }));
        setDirty(false);
        const words = { save: "Saved", publish: "Published", schedule: "Scheduled", unpublish: "Moved back to draft" }[mode];
        setMessage({ tone: "ok", text: `${words} at ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` });
        if (!initial.id && result.id) window.history.replaceState(null, "", `/dashboard/posts/${result.id}`);
      });
    },
    [post, scheduleAt, initial.id]
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        save("save");
      }
    };
    const onLeave = (event: BeforeUnloadEvent) => {
      if (dirty) event.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("beforeunload", onLeave);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("beforeunload", onLeave);
    };
  }, [save, dirty]);

  async function upload(file: File | undefined, done: (url: string) => void) {
    if (!file) return;
    const form = new FormData();
    form.set("file", file);
    setAiBusy("upload");
    const result = await uploadPostImage(form).catch(() => ({ url: "", error: "Upload failed. Try again." }));
    setAiBusy("");
    if (result.url) done(result.url);
    else setMessage({ tone: "error", text: result.error || "Upload failed." });
  }

  async function draft() {
    if (!brief.brief.trim()) return setMessage({ tone: "error", text: "Describe what the post should cover." });
    if (post.blocks.some((block) => "text" in block && block.text) && !window.confirm("Replace the current content with an AI draft?")) return;
    setAiBusy("draft");
    const result = await aiDraftPost(brief).catch(() => ({ ok: false as const, error: "Could not reach the server. Try again." }));
    setAiBusy("");
    if (!result.ok) return setMessage({ tone: "error", text: result.error });
    slugTouched.current = true;
    const d = result.data;
    update({ title: d.title, excerpt: d.excerpt, seoTitle: d.seoTitle, seoDescription: d.seoDescription, slug: slugify(d.slug), focusKeyword: d.focusKeyword, blocks: d.blocks });
    setMessage({ tone: "ok", text: "Draft ready. Check every fact and fill any [add figure] placeholders before publishing." });
  }

  async function rewrite(block: Block, instruction: string) {
    const text = block.type === "list" ? block.items.join("\n") : "text" in block ? block.text : block.type === "faq" ? block.answer : "";
    if (!text.trim()) return;
    setAiBusy(block.id);
    const result = await aiRewrite({ text, instruction }).catch(() => ({ ok: false as const, error: "Could not reach the server. Try again." }));
    setAiBusy("");
    if (!result.ok) return setMessage({ tone: "error", text: result.error });
    if (block.type === "list") patchBlock(block.id, { items: result.data.text.split("\n").map((line) => line.replace(/^[-*\d.)\s]+/, "")).filter(Boolean) });
    else if (block.type === "faq") patchBlock(block.id, { answer: result.data.text });
    else patchBlock(block.id, { text: result.data.text } as Partial<Block>);
  }

  async function seoAdvice() {
    setAiBusy("seo");
    const result = await aiSeoAdvice({ title: post.title, keyword: post.focusKeyword, text: blocksToText(post.blocks) }).catch(() => ({
      ok: false as const,
      error: "Could not reach the server. Try again."
    }));
    setAiBusy("");
    if (!result.ok) return setMessage({ tone: "error", text: result.error });
    setAdvice(result.data);
  }

  const statusChip = {
    draft: "bg-ink/5 text-ink/70",
    scheduled: "bg-amber-50 text-amber-900",
    live: "bg-moss/10 text-moss"
  }[post.status];
  const statusLabel = post.status === "scheduled" && post.publishAt
    ? `Scheduled for ${new Date(post.publishAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}`
    : { draft: "Draft", scheduled: "Scheduled", live: "Live" }[post.status];

  return (
    <div>
      <div className="sticky top-0 z-20 -mx-4 mb-6 flex flex-wrap items-center gap-3 border-b border-ink/10 bg-[#f6f4ef]/95 px-4 py-3 backdrop-blur sm:-mx-5 sm:px-5 lg:-mx-8 lg:px-8">
        <Link href="/dashboard/posts" className="text-sm text-ink/60 hover:text-ink">← Journal</Link>
        <span className={`rounded-full px-2.5 py-1 text-xs ${statusChip}`}>{statusLabel}</span>
        <span className="text-xs text-ink/50" aria-live="polite">{pending ? "Saving…" : dirty ? "Unsaved changes" : message?.tone === "ok" ? message.text : ""}</span>
        <span className="flex-1" />
        <button type="button" className={ghost} onClick={() => setPreview((value) => !value)}>{preview ? "Edit" : "Preview"}</button>
        {post.status === "live" && post.id ? (
          <a className={ghost} href={`/blog/${post.slug}`} target="_blank" rel="noreferrer">View live</a>
        ) : null}
        <button type="button" className={ghost} disabled={pending} onClick={() => save("save")} title="Ctrl/Cmd + S">Save</button>
        {post.status !== "draft" ? (
          <button type="button" className={ghost} disabled={pending} onClick={() => save("unpublish")}>Unpublish</button>
        ) : null}
        <button type="button" className="rounded-full bg-ink px-4 py-2 text-sm text-paper disabled:opacity-50" disabled={pending} onClick={() => save("publish")}>
          {post.status === "live" ? "Update live post" : "Publish now"}
        </button>
      </div>

      {message?.tone === "error" ? <p className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-800" role="alert">{message.text}</p> : null}
      {message?.tone === "ok" && !pending && !dirty && message.text.startsWith("Draft") ? <p className="mb-4 rounded-lg bg-moss/10 px-4 py-2 text-sm text-moss">{message.text}</p> : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0">
          {preview ? (
            <article className="mx-auto max-w-3xl rounded-2xl border border-ink/10 bg-white p-6 sm:p-10">
              {post.coverUrl ? <img src={post.coverUrl} alt="" className="mb-8 w-full rounded-xl" /> : null}
              <h1 className="font-serif text-4xl sm:text-5xl">{post.title || "Untitled"}</h1>
              {post.authorName ? <p className="mt-3 text-sm text-ink/55">By {post.authorName} · {score.readMinutes} min read</p> : null}
              {post.excerpt ? <p className="mt-6 text-lg text-ink/70">{post.excerpt}</p> : null}
              <div className="mt-10"><BlockView blocks={post.blocks} /></div>
            </article>
          ) : (
            <div className="mx-auto max-w-3xl">
              <div className="rounded-2xl border border-ink/10 bg-white p-4">
                {post.coverUrl ? (
                  <div className="relative">
                    <img src={post.coverUrl} alt="" className="max-h-72 w-full rounded-xl object-cover" />
                    <button type="button" className="absolute right-2 top-2 rounded-full bg-white/90 px-3 py-1 text-xs" onClick={() => update({ coverUrl: "" })}>Remove cover</button>
                  </div>
                ) : (
                  <label className="flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-ink/20 px-4 py-6 text-sm text-ink/55 hover:bg-ink/[0.02]">
                    {aiBusy === "upload" ? "Uploading…" : "+ Add a cover image (also used when shared)"}
                    <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" onChange={(event) => upload(event.target.files?.[0], (url) => update({ coverUrl: url }))} />
                  </label>
                )}
                <textarea
                  value={post.title}
                  onChange={(event) => update({ title: event.target.value })}
                  placeholder="Post title"
                  rows={1}
                  className="mt-4 w-full resize-none bg-transparent font-serif text-4xl leading-tight outline-none [field-sizing:content]"
                  aria-label="Title"
                />
                <textarea
                  value={post.excerpt}
                  onChange={(event) => update({ excerpt: event.target.value })}
                  placeholder="Short summary shown on the journal page and in previews"
                  rows={2}
                  className="mt-2 w-full resize-none bg-transparent text-lg text-ink/70 outline-none [field-sizing:content]"
                  aria-label="Excerpt"
                />
              </div>

              <ol className="mt-4 space-y-2">
                {post.blocks.map((block, index) => (
                  <li
                    key={block.id}
                    draggable={dragId === block.id}
                    onDragStart={(event) => {
                      event.dataTransfer.effectAllowed = "move";
                      event.dataTransfer.setData("text/plain", block.id);
                    }}
                    onDragEnd={() => {
                      setDragId(null);
                      setOverIndex(null);
                    }}
                    onDragOver={(event) => {
                      if (!dragId) return;
                      event.preventDefault();
                      setOverIndex(index);
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      const from = post.blocks.findIndex((item) => item.id === dragId);
                      if (from >= 0) move(from, index);
                      setDragId(null);
                      setOverIndex(null);
                    }}
                    className={`group relative rounded-xl border bg-white p-3 transition ${
                      overIndex === index && dragId && dragId !== block.id ? "border-moss ring-2 ring-moss/20" : "border-ink/10"
                    } ${dragId === block.id ? "opacity-50" : ""}`}
                  >
                    <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-ink/50">
                      <button
                        type="button"
                        aria-label="Drag to reorder"
                        title="Drag to reorder"
                        className="cursor-grab rounded px-1.5 py-0.5 text-base leading-none hover:bg-ink/5 active:cursor-grabbing"
                        onMouseDown={() => setDragId(block.id)}
                        onMouseUp={() => setDragId(null)}
                        onTouchStart={() => setDragId(block.id)}
                      >
                        ⠿
                      </button>
                      <span className="uppercase tracking-[0.12em]">{BLOCK_TYPES.find((item) => item.type === block.type)?.label}</span>
                      {block.type === "heading" ? (
                        <select className="rounded border border-ink/10 px-1 py-0.5" value={block.level} onChange={(event) => patchBlock(block.id, { level: Number(event.target.value) === 3 ? 3 : 2 })}>
                          <option value={2}>H2</option>
                          <option value={3}>H3</option>
                        </select>
                      ) : null}
                      {block.type === "list" ? (
                        <select className="rounded border border-ink/10 px-1 py-0.5" value={block.style} onChange={(event) => patchBlock(block.id, { style: event.target.value === "number" ? "number" : "bullet" })}>
                          <option value="bullet">Bullets</option>
                          <option value="number">Numbered</option>
                        </select>
                      ) : null}
                      <span className="flex-1" />
                      {aiReady && ["paragraph", "list", "quote", "callout", "faq"].includes(block.type) ? (
                        <select
                          className="rounded border border-ink/10 px-1 py-0.5"
                          value=""
                          disabled={aiBusy === block.id}
                          onChange={(event) => {
                            const choice = REWRITES.find(([label]) => label === event.target.value);
                            if (choice) rewrite(block, choice[1]);
                          }}
                          aria-label="AI rewrite"
                        >
                          <option value="">{aiBusy === block.id ? "AI working…" : "✦ AI rewrite"}</option>
                          {REWRITES.map(([label]) => (
                            <option key={label} value={label}>{label}</option>
                          ))}
                        </select>
                      ) : null}
                      <button type="button" className="rounded px-1.5 hover:bg-ink/5" aria-label="Move up" onClick={() => move(index, index - 1)}>↑</button>
                      <button type="button" className="rounded px-1.5 hover:bg-ink/5" aria-label="Move down" onClick={() => move(index, index + 1)}>↓</button>
                      <button type="button" className="rounded px-1.5 hover:bg-ink/5" aria-label="Duplicate" onClick={() => setBlocks((blocks) => [...blocks.slice(0, index + 1), { ...block, id: emptyBlock("divider").id }, ...blocks.slice(index + 1)])}>⧉</button>
                      <button type="button" className="rounded px-1.5 text-red-800 hover:bg-red-50" aria-label="Delete block" onClick={() => setBlocks((blocks) => blocks.filter((item) => item.id !== block.id))}>✕</button>
                    </div>
                    <BlockFields block={block} patch={(patch) => patchBlock(block.id, patch)} upload={upload} busy={aiBusy === "upload"} />
                    <div className="absolute -bottom-3 left-1/2 z-10 hidden -translate-x-1/2 group-hover:block">
                      <button type="button" className="rounded-full border border-ink/15 bg-white px-2 text-xs shadow-sm" onClick={() => setInserter(index + 1)} aria-label="Insert block below">+</button>
                    </div>
                    {inserter === index + 1 ? <Inserter onPick={(type) => insertBlock(type, index + 1)} onClose={() => setInserter(null)} /> : null}
                  </li>
                ))}
              </ol>
              <div className="mt-4">
                {inserter === -1 ? (
                  <Inserter onPick={(type) => insertBlock(type, post.blocks.length)} onClose={() => setInserter(null)} />
                ) : (
                  <button type="button" className="w-full rounded-xl border border-dashed border-ink/20 py-3 text-sm text-ink/60 hover:bg-white" onClick={() => setInserter(-1)}>
                    + Add block
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <aside className="space-y-4 xl:sticky xl:top-20 xl:self-start">
          <section className="rounded-2xl border border-ink/10 bg-white p-4">
            <h2 className="text-sm font-medium">Publishing</h2>
            <label className="mt-3 block text-xs text-ink/60">Author
              <select className={`${input} mt-1`} value={post.authorName} onChange={(event) => update({ authorName: event.target.value })}>
                <option value="">Choose author</option>
                {Array.from(new Set([...authors, post.authorName].filter(Boolean))).map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </label>
            <label className="mt-3 block text-xs text-ink/60">Schedule for
              <input type="datetime-local" className={`${input} mt-1`} value={scheduleAt} onChange={(event) => setScheduleAt(event.target.value)} />
            </label>
            <button type="button" className="mt-2 w-full rounded-full border border-ink/20 py-2 text-sm hover:bg-ink/5 disabled:opacity-50" disabled={pending || !scheduleAt} onClick={() => save("schedule")}>
              Schedule
            </button>
            <p className="mt-2 text-xs text-ink/50">Scheduled posts go live on their own at that time (your local time zone).</p>
          </section>

          <div className="flex rounded-full border border-ink/10 bg-white p-1 text-sm">
            {(["seo", "ai"] as const).map((tab) => (
              <button key={tab} type="button" onClick={() => setPanel(tab)} className={`flex-1 rounded-full py-1.5 ${panel === tab ? "bg-ink text-paper" : "text-ink/60"}`}>
                {tab === "seo" ? "SEO & AI search" : "✦ AI writer"}
              </button>
            ))}
          </div>

          {panel === "seo" ? (
            <section className="space-y-4 rounded-2xl border border-ink/10 bg-white p-4">
              <div className="flex flex-wrap justify-between gap-3">
                <Ring value={score.seo} label="Search" />
                <Ring value={score.ai} label="AI answers" />
              </div>
              <p className="text-xs text-ink/50">{score.words} words · {score.readMinutes} min read</p>

              <div className="rounded-lg border border-ink/10 p-3">
                <p className="text-xs text-ink/50">Search preview</p>
                <p className="mt-1 truncate text-xs text-ink/60">{siteUrl.replace(/^https?:\/\//, "")} › blog › {post.slug || "…"}</p>
                <p className="mt-0.5 line-clamp-1 text-[17px] text-[#1a0dab]">{post.seoTitle || post.title || "Title"}</p>
                <p className="mt-0.5 line-clamp-2 text-xs text-ink/70">{post.seoDescription || post.excerpt || "Description"}</p>
              </div>

              <label className="block text-xs text-ink/60">
                <span className="flex justify-between">SEO title <Counter value={(post.seoTitle || post.title).length} min={30} max={60} /></span>
                <input className={`${input} mt-1`} value={post.seoTitle} placeholder={post.title} onChange={(event) => update({ seoTitle: event.target.value })} />
              </label>
              <label className="block text-xs text-ink/60">
                <span className="flex justify-between">Meta description <Counter value={(post.seoDescription || post.excerpt).length} min={120} max={160} /></span>
                <textarea className={`${input} mt-1`} rows={3} value={post.seoDescription} placeholder={post.excerpt} onChange={(event) => update({ seoDescription: event.target.value })} />
              </label>
              <label className="block text-xs text-ink/60">Focus keyword
                <input className={`${input} mt-1`} value={post.focusKeyword} onChange={(event) => update({ focusKeyword: event.target.value })} />
              </label>
              <label className="block text-xs text-ink/60">Web address
                <div className="mt-1 flex items-center gap-1 text-sm">
                  <span className="text-ink/40">/blog/</span>
                  <input
                    className={input}
                    value={post.slug}
                    onChange={(event) => {
                      slugTouched.current = true;
                      update({ slug: slugify(event.target.value) });
                    }}
                  />
                </div>
              </label>

              {(["ai", "seo"] as const).map((group) => (
                <div key={group}>
                  <p className="text-xs uppercase tracking-[0.12em] text-ink/45">{group === "ai" ? "AI answer readiness" : "Search basics"}</p>
                  <ul className="mt-2 space-y-1.5">
                    {score.checks.filter((check) => check.group === group).map((check) => (
                      <li key={check.id} className="text-sm">
                        <details>
                          <summary className="flex cursor-pointer list-none gap-2">
                            <span aria-hidden className={check.ok ? "text-moss" : "text-amber-700"}>{check.ok ? "✓" : "○"}</span>
                            <span className={check.ok ? "text-ink/60" : ""}>{check.label}</span>
                          </summary>
                          <p className="ml-6 mt-1 text-xs text-ink/55">{check.tip}</p>
                        </details>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          ) : (
            <section className="space-y-4 rounded-2xl border border-ink/10 bg-white p-4">
              {!aiReady ? (
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">Add OPENAI_API_KEY to the server environment to switch on the AI writer.</p>
              ) : null}
              <div>
                <h2 className="text-sm font-medium">Draft a post</h2>
                <textarea className={`${input} mt-2`} rows={4} placeholder="What should it cover? Who is it for? What should the reader do next?" value={brief.brief} onChange={(event) => setBrief({ ...brief, brief: event.target.value })} />
                <input className={`${input} mt-2`} placeholder="Focus keyword (optional)" value={brief.keyword} onChange={(event) => setBrief({ ...brief, keyword: event.target.value })} />
                <input className={`${input} mt-2`} placeholder="Reader, e.g. restaurant owners in Lahore" value={brief.audience} onChange={(event) => setBrief({ ...brief, audience: event.target.value })} />
                <select className={`${input} mt-2`} value={brief.length} onChange={(event) => setBrief({ ...brief, length: event.target.value as typeof brief.length })}>
                  <option value="short">Short (~600 words)</option>
                  <option value="standard">Standard (~1,100 words)</option>
                  <option value="long">Long (~1,800 words)</option>
                </select>
                <button type="button" className="mt-2 w-full rounded-full bg-lime py-2 text-sm font-medium text-ink disabled:opacity-50" disabled={!aiReady || Boolean(aiBusy)} onClick={draft}>
                  {aiBusy === "draft" ? "Writing… (up to a minute)" : "✦ Write draft"}
                </button>
              </div>
              <div className="border-t border-ink/10 pt-4">
                <h2 className="text-sm font-medium">SEO and AI search review</h2>
                <p className="mt-1 text-xs text-ink/55">Suggests a title, description and FAQs, plus fixes that help ChatGPT, Perplexity and Google AI Overviews cite this post.</p>
                <button type="button" className="mt-2 w-full rounded-full border border-ink/20 py-2 text-sm disabled:opacity-50" disabled={!aiReady || Boolean(aiBusy) || !post.blocks.length} onClick={seoAdvice}>
                  {aiBusy === "seo" ? "Reviewing…" : "✦ Review this post"}
                </button>
                {advice ? (
                  <div className="mt-3 space-y-3 text-sm">
                    {[
                      ["SEO title", advice.seoTitle, () => update({ seoTitle: advice.seoTitle })],
                      ["Meta description", advice.seoDescription, () => update({ seoDescription: advice.seoDescription })],
                      ["Focus keyword", advice.focusKeyword, () => update({ focusKeyword: advice.focusKeyword })],
                      ["Web address", advice.slug, () => { slugTouched.current = true; update({ slug: slugify(advice.slug) }); }]
                    ].map(([label, value, apply]) => (
                      <div key={String(label)} className="rounded-lg border border-ink/10 p-2">
                        <p className="text-xs text-ink/50">{String(label)}</p>
                        <p className="mt-1">{String(value)}</p>
                        <button type="button" className="mt-1 text-xs text-moss" onClick={apply as () => void}>Use this</button>
                      </div>
                    ))}
                    {advice.faqs.length ? (
                      <div className="rounded-lg border border-ink/10 p-2">
                        <p className="text-xs text-ink/50">{advice.faqs.length} FAQs</p>
                        <ul className="mt-1 list-disc pl-4 text-xs">{advice.faqs.map((faq) => <li key={faq.question}>{faq.question}</li>)}</ul>
                        <button
                          type="button"
                          className="mt-1 text-xs text-moss"
                          onClick={() => setBlocks((blocks) => [...blocks, ...advice.faqs.map((faq) => ({ ...(emptyBlock("faq") as Extract<Block, { type: "faq" }>), question: faq.question, answer: faq.answer }))])}
                        >
                          Add to the end of the post
                        </button>
                      </div>
                    ) : null}
                    {advice.tips.length ? (
                      <div>
                        <p className="text-xs text-ink/50">To get cited by AI answers</p>
                        <ul className="mt-1 list-disc space-y-1 pl-4 text-xs">{advice.tips.map((tip) => <li key={tip}>{tip}</li>)}</ul>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}

function Inserter({ onPick, onClose }: { onPick: (type: BlockType) => void; onClose: () => void }) {
  return (
    <div className="relative z-20 mt-4 rounded-xl border border-ink/10 bg-white p-3 shadow-lg">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.12em] text-ink/45">Add block</p>
        <button type="button" className="text-xs text-ink/50" onClick={onClose}>Close</button>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {BLOCK_TYPES.map((item) => (
          <button key={item.type} type="button" onClick={() => onPick(item.type)} className="rounded-lg border border-ink/10 px-3 py-2 text-left hover:border-moss hover:bg-moss/5">
            <span className="block text-sm font-medium">{item.label}</span>
            <span className="block text-xs text-ink/50">{item.hint}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function RichArea({ value, onChange, placeholder, className }: { value: string; onChange: (value: string) => void; placeholder: string; className?: string }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [linking, setLinking] = useState(false);
  const [url, setUrl] = useState("");

  function wrap(before: string, after: string, fallback: string) {
    const area = ref.current;
    if (!area) return;
    const start = area.selectionStart;
    const end = area.selectionEnd;
    const selected = value.slice(start, end) || fallback;
    onChange(value.slice(0, start) + before + selected + after + value.slice(end));
    requestAnimationFrame(() => {
      area.focus();
      area.setSelectionRange(start + before.length, start + before.length + selected.length);
    });
  }

  return (
    <div>
      <div className="mb-1 flex gap-1 text-xs">
        <button type="button" className="rounded px-2 py-0.5 font-bold hover:bg-ink/5" onClick={() => wrap("**", "**", "bold text")} aria-label="Bold">B</button>
        <button type="button" className="rounded px-2 py-0.5 italic hover:bg-ink/5" onClick={() => wrap("*", "*", "italic text")} aria-label="Italic">I</button>
        <button type="button" className="rounded px-2 py-0.5 hover:bg-ink/5" onClick={() => setLinking((open) => !open)}>Link</button>
      </div>
      {linking ? (
        <div className="mb-2 flex gap-2">
          <input autoFocus className={input} placeholder="https://… or /services/seo" value={url} onChange={(event) => setUrl(event.target.value)} />
          <button
            type="button"
            className="rounded-full bg-ink px-3 text-xs text-paper"
            onClick={() => {
              if (url.trim()) wrap("[", `](${url.trim()})`, "link text");
              setLinking(false);
              setUrl("");
            }}
          >
            Add
          </button>
        </div>
      ) : null}
      <textarea
        ref={ref}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={2}
        className={`w-full resize-none bg-transparent outline-none [field-sizing:content] ${className || ""}`}
      />
    </div>
  );
}

function BlockFields({
  block,
  patch,
  upload,
  busy
}: {
  block: Block;
  patch: (patch: Partial<Block>) => void;
  upload: (file: File | undefined, done: (url: string) => void) => void;
  busy: boolean;
}) {
  switch (block.type) {
    case "heading":
      return (
        <input
          value={block.text}
          onChange={(event) => patch({ text: event.target.value })}
          placeholder={block.level === 2 ? "Section heading (questions work well)" : "Sub-heading"}
          className={`w-full bg-transparent font-serif outline-none ${block.level === 2 ? "text-3xl" : "text-2xl"}`}
        />
      );
    case "paragraph":
      return <RichArea value={block.text} onChange={(text) => patch({ text })} placeholder="Write…" className="text-base leading-relaxed" />;
    case "callout":
      return <RichArea value={block.text} onChange={(text) => patch({ text })} placeholder="Key point the reader must not miss" className="rounded-lg bg-moss/5 px-3 py-2" />;
    case "quote":
      return (
        <div className="space-y-2">
          <RichArea value={block.text} onChange={(text) => patch({ text })} placeholder="Quote" className="font-serif text-2xl" />
          <input className={input} value={block.cite} onChange={(event) => patch({ cite: event.target.value })} placeholder="Who said it (name, role)" />
        </div>
      );
    case "list":
      return (
        <div className="space-y-1">
          {block.items.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <span className="w-5 text-right text-sm text-ink/40">{block.style === "number" ? `${index + 1}.` : "•"}</span>
              <input
                className="flex-1 bg-transparent py-1 outline-none"
                value={item}
                placeholder="List item"
                onChange={(event) => patch({ items: block.items.map((value, i) => (i === index ? event.target.value : value)) })}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    patch({ items: [...block.items.slice(0, index + 1), "", ...block.items.slice(index + 1)] });
                  }
                  if (event.key === "Backspace" && !item && block.items.length > 1) {
                    event.preventDefault();
                    patch({ items: block.items.filter((_, i) => i !== index) });
                  }
                }}
              />
            </div>
          ))}
          <button type="button" className="ml-7 text-xs text-moss" onClick={() => patch({ items: [...block.items, ""] })}>+ item</button>
        </div>
      );
    case "image":
      return (
        <div className="space-y-2">
          {block.url ? (
            <img src={block.url} alt={block.alt} className="max-h-80 w-full rounded-lg object-contain" />
          ) : (
            <label className="flex cursor-pointer items-center justify-center rounded-lg border border-dashed border-ink/20 py-8 text-sm text-ink/55 hover:bg-ink/[0.02]">
              {busy ? "Uploading…" : "Click to upload an image (max 5 MB)"}
              <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" onChange={(event) => upload(event.target.files?.[0], (url) => patch({ url }))} />
            </label>
          )}
          <input className={input} value={block.url} onChange={(event) => patch({ url: event.target.value })} placeholder="…or paste an image URL" />
          <input className={input} value={block.alt} onChange={(event) => patch({ alt: event.target.value })} placeholder="Alt text: describe the image for screen readers and search" />
          <input className={input} value={block.caption} onChange={(event) => patch({ caption: event.target.value })} placeholder="Caption (optional)" />
        </div>
      );
    case "faq":
      return (
        <div className="space-y-2">
          <input className={`${input} font-medium`} value={block.question} onChange={(event) => patch({ question: event.target.value })} placeholder="Question, as someone would ask it" />
          <RichArea value={block.answer} onChange={(answer) => patch({ answer })} placeholder="Answer in 2 to 4 sentences, starting with the direct answer" />
        </div>
      );
    case "button":
      return (
        <div className="grid gap-2 sm:grid-cols-2">
          <input className={input} value={block.label} onChange={(event) => patch({ label: event.target.value })} placeholder="Button text, e.g. Book a call" />
          <input className={input} value={block.url} onChange={(event) => patch({ url: event.target.value })} placeholder="/contact or https://…" />
        </div>
      );
    case "video":
      return <input className={input} value={block.url} onChange={(event) => patch({ url: event.target.value })} placeholder="YouTube or Vimeo link" />;
    case "divider":
      return <hr className="my-2 border-ink/15" />;
    default:
      return null;
  }
}
