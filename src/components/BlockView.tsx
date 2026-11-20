import { Fragment } from "react";
import { parseInline, videoEmbed, type Block } from "@/lib/blocks";

function Rich({ text }: { text: string }) {
  return (
    <>
      {parseInline(text).map((part, index) => {
        if (part.kind === "bold") return <strong key={index}>{part.text}</strong>;
        if (part.kind === "italic") return <em key={index}>{part.text}</em>;
        if (part.kind === "link") {
          const external = /^https?:\/\//.test(part.url);
          return (
            <a
              key={index}
              href={part.url}
              className="font-medium text-moss underline decoration-moss/35 decoration-2 underline-offset-4 transition hover:text-cyan hover:decoration-cyan"
              {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            >
              {part.text}
            </a>
          );
        }
        return <Fragment key={index}>{part.text}</Fragment>;
      })}
    </>
  );
}

/** Renders post blocks. Used on the public post page and in the editor preview. */
export function BlockView({ blocks }: { blocks: Block[] }) {
  const faqs = blocks.filter((block) => block.type === "faq") as Extract<Block, { type: "faq" }>[];
  return (
    <div className="article-prose space-y-7 text-[1.03rem] leading-8 text-ink/80 sm:text-[1.08rem]">
      {blocks.map((block) => {
        switch (block.type) {
          case "heading":
            return block.level === 3 ? (
              <h3 id={`section-${block.id}`} key={block.id} className="scroll-mt-28 pt-3 font-serif text-2xl leading-tight text-ink sm:text-3xl">{block.text}</h3>
            ) : (
              <h2 id={`section-${block.id}`} key={block.id} className="scroll-mt-28 border-l-4 border-lime pl-4 pt-2 font-serif text-3xl leading-tight text-ink sm:text-4xl">{block.text}</h2>
            );
          case "paragraph":
            return block.text.trim() ? <p key={block.id} className="text-pretty"><Rich text={block.text} /></p> : null;
          case "list": {
            const items = block.items.filter((item) => item.trim());
            if (!items.length) return null;
            const Tag = block.style === "number" ? "ol" : "ul";
            return (
              <Tag key={block.id} className="list-none space-y-3 p-0">
                {items.map((item, index) => (
                  <li key={index} className="group flex gap-4 rounded-2xl border border-ink/10 bg-white/70 px-4 py-4 shadow-sm transition hover:-translate-y-0.5 hover:border-moss/25 hover:shadow-md sm:px-5">
                    <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-semibold ${block.style === "number" ? "bg-ink text-lime" : "bg-lime/40 text-moss"}`} aria-hidden="true">
                      {block.style === "number" ? index + 1 : "✓"}
                    </span>
                    <span className="min-w-0 pt-px"><Rich text={item} /></span>
                  </li>
                ))}
              </Tag>
            );
          }
          case "image":
            return block.url ? (
              <figure key={block.id} className="overflow-hidden rounded-2xl border border-white/70 bg-white/65 p-2 shadow-lift">
                <img src={block.url} alt={block.alt} loading="lazy" className="w-full rounded-xl object-cover" />
                {block.caption ? <figcaption className="px-2 pb-1 pt-3 text-sm leading-6 text-ink/55">{block.caption}</figcaption> : null}
              </figure>
            ) : null;
          case "quote":
            return block.text ? (
              <blockquote key={block.id} className="relative overflow-hidden rounded-2xl bg-ink px-6 py-6 font-serif text-2xl leading-snug text-paper shadow-lift sm:px-8 sm:text-3xl">
                <span className="absolute -right-3 -top-10 text-[9rem] leading-none text-lime/10" aria-hidden="true">“</span>
                <Rich text={block.text} />
                {block.cite ? <footer className="mt-3 font-sans text-sm text-paper/60">— {block.cite}</footer> : null}
              </blockquote>
            ) : null;
          case "callout":
            return block.text ? (
              <aside key={block.id} className="rounded-2xl border border-moss/20 bg-gradient-to-br from-lime/25 via-white/70 to-cyan/10 px-5 py-5 text-ink shadow-sm sm:px-6">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-moss">Key takeaway</p>
                <div className="font-medium"><Rich text={block.text} /></div>
              </aside>
            ) : null;
          case "button":
            return block.url && block.label ? (
              <p key={block.id}>
                <a href={block.url} className="inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3.5 text-sm font-medium text-paper shadow-lift transition hover:-translate-y-0.5 hover:bg-moss">
                  {block.label}<span aria-hidden="true">→</span>
                </a>
              </p>
            ) : null;
          case "video": {
            const src = videoEmbed(block.url);
            return src ? (
              <div key={block.id} className="aspect-video overflow-hidden rounded-xl border border-ink/10">
                <iframe src={src} title="Video" className="h-full w-full" loading="lazy" allowFullScreen sandbox="allow-scripts allow-same-origin allow-presentation" />
              </div>
            ) : null;
          }
          case "divider":
            return <hr key={block.id} className="h-px border-0 bg-gradient-to-r from-transparent via-moss/30 to-transparent" />;
          case "faq":
            // Rendered together below so the questions read as one section.
            return null;
          default:
            return null;
        }
      })}
      {faqs.length ? (
        <section className="rounded-3xl border border-ink/10 bg-white/65 p-5 shadow-sm sm:p-7">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-moss">Quick answers</p>
          <h2 className="mt-2 font-serif text-3xl text-ink sm:text-4xl">Questions people ask</h2>
          <div className="mt-4 space-y-3">
            {faqs.map((faq) => (
              <details key={faq.id} className="group rounded-xl border border-ink/10 bg-white/80 px-4 py-4 open:border-moss/25" open>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-ink">
                  {faq.question}<span className="text-moss transition group-open:rotate-45" aria-hidden="true">＋</span>
                </summary>
                <div className="mt-3 border-t border-ink/10 pt-3 text-ink/75"><Rich text={faq.answer} /></div>
              </details>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
