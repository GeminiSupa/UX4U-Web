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
              className="text-moss underline decoration-moss/40 underline-offset-2 hover:decoration-moss"
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
    <div className="space-y-6 text-base leading-relaxed text-ink/85">
      {blocks.map((block) => {
        switch (block.type) {
          case "heading":
            return block.level === 3 ? (
              <h3 key={block.id} className="pt-2 font-serif text-2xl text-ink">{block.text}</h3>
            ) : (
              <h2 key={block.id} className="pt-4 font-serif text-3xl text-ink">{block.text}</h2>
            );
          case "paragraph":
            return block.text.trim() ? <p key={block.id}><Rich text={block.text} /></p> : null;
          case "list": {
            const items = block.items.filter((item) => item.trim());
            if (!items.length) return null;
            const Tag = block.style === "number" ? "ol" : "ul";
            return (
              <Tag key={block.id} className={`space-y-2 pl-6 ${block.style === "number" ? "list-decimal" : "list-disc"}`}>
                {items.map((item, index) => (
                  <li key={index}><Rich text={item} /></li>
                ))}
              </Tag>
            );
          }
          case "image":
            return block.url ? (
              <figure key={block.id}>
                <img src={block.url} alt={block.alt} loading="lazy" className="w-full rounded-xl border border-ink/10" />
                {block.caption ? <figcaption className="mt-2 text-sm text-ink/55">{block.caption}</figcaption> : null}
              </figure>
            ) : null;
          case "quote":
            return block.text ? (
              <blockquote key={block.id} className="border-l-4 border-lime pl-5 font-serif text-2xl leading-snug text-ink">
                <Rich text={block.text} />
                {block.cite ? <footer className="mt-2 font-sans text-sm text-ink/55">— {block.cite}</footer> : null}
              </blockquote>
            ) : null;
          case "callout":
            return block.text ? (
              <aside key={block.id} className="rounded-xl border border-moss/20 bg-moss/5 px-5 py-4 text-ink">
                <Rich text={block.text} />
              </aside>
            ) : null;
          case "button":
            return block.url && block.label ? (
              <p key={block.id}>
                <a href={block.url} className="inline-flex rounded-full bg-ink px-5 py-3 text-sm text-paper hover:bg-ink/90">
                  {block.label}
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
            return <hr key={block.id} className="border-ink/10" />;
          case "faq":
            // Rendered together below so the questions read as one section.
            return null;
          default:
            return null;
        }
      })}
      {faqs.length ? (
        <section className="border-t border-ink/10 pt-6">
          <h2 className="font-serif text-3xl text-ink">Questions people ask</h2>
          <div className="mt-4 divide-y divide-ink/10">
            {faqs.map((faq) => (
              <details key={faq.id} className="group py-4" open>
                <summary className="cursor-pointer list-none font-medium text-ink">{faq.question}</summary>
                <div className="mt-2 text-ink/80"><Rich text={faq.answer} /></div>
              </details>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
