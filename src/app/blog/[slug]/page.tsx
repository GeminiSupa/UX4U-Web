import { BlockView } from "@/components/BlockView";
import { JsonLd } from "@/components/JsonLd";
import { blocksFromBody, blocksToText, cleanBlocks, stripInline, wordCount, type Block } from "@/lib/blocks";
import { SiteChrome } from "@/components/SiteChrome";
import { ensureSeed, getPost, getPosts } from "@/lib/data";
import { pageMeta } from "@/lib/seo";
import { POST_BYLINES, SITE_URL } from "@/lib/site";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

const POST_META: Record<string, { title: string; description: string }> = {
  "launch-is-the-start": {
    title: "Launch is the start of the operating work",
    description:
      "The week after go-live decides whether a product becomes a daily habit or a forgotten folder. What we do after launch to keep it running."
  },
  "what-a-lead-list-is-for": {
    title: "What a lead list is for",
    description:
      "A list of public emails is not a campaign. It is the raw material for one, and only if you say who you are. How we build and use lead lists."
  },
  "concept-is-not-a-business": {
    title: "A concept is not a business yet",
    description:
      "A concept is not a business yet. The gap is an offer someone can pay for, a place to pay it, and a person who follows up."
  }
};

const RELATED: Record<
  string,
  { service: { href: string; label: string }; work: { href: string; label: string } }
> = {
  "launch-is-the-start": {
    service: { href: "/services/business-automation", label: "Business process automation" },
    work: { href: "/work/restromanage", label: "RestroManage case study" }
  },
  "what-a-lead-list-is-for": {
    service: { href: "/services/lead-generation", label: "B2B lead generation" },
    work: { href: "/work/unimondo", label: "UniMondo case study" }
  },
  "concept-is-not-a-business": {
    service: { href: "/services/product-development", label: "Custom product development" },
    work: { href: "/work/vakeel-diary", label: "Vakeel Diary case study" }
  }
};

export async function generateMetadata({
  params
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const meta = POST_META[slug];
  if (!meta) {
    const post = await getPost(slug);
    if (!post) return {};
    const base = pageMeta({
      title: post.seo_title || post.title,
      description: post.seo_description || post.excerpt,
      path: `/blog/${slug}`,
      type: "article"
    });
    if (post.cover_url) {
      base.openGraph = { ...base.openGraph, images: [{ url: post.cover_url }] };
      base.twitter = { ...base.twitter, images: [post.cover_url] };
    }
    return base;
  }
  return pageMeta({
    title: meta.title,
    description: meta.description,
    path: `/blog/${slug}`,
    type: "article"
  });
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  await ensureSeed().catch(() => false);
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();
  const more = (await getPosts(true)).filter((item) => item.slug !== slug).slice(0, 2);
  const related = RELATED[slug];
  const legacy = POST_BYLINES[slug];
  const author = post.author_name || legacy?.author || "";
  const published = (post.publish_at || legacy?.date || post.created_at || "").slice(0, 10);
  const modified = (post.updated_at || "").slice(0, 10);
  const stored = cleanBlocks(post.blocks);
  const blocks: Block[] = stored.length ? stored : blocksFromBody(post.body);
  const headings = blocks.filter((block) => block.type === "heading") as Extract<Block, { type: "heading" }>[];
  const readMinutes = Math.max(1, Math.ceil(wordCount(blocksToText(blocks)) / 220));
  const publishedLabel = published
    ? new Intl.DateTimeFormat("en", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${published}T00:00:00Z`))
    : "";
  const faqs = blocks.filter((block) => block.type === "faq" && block.question && block.answer) as Extract<Block, { type: "faq" }>[];
  const article = author
    ? ({
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        headline: post.seo_title || post.title,
        description: post.seo_description || post.excerpt,
        author: { "@type": "Person", name: author },
        publisher: { "@type": "Organization", name: "UX4U", url: SITE_URL },
        datePublished: published || undefined,
        dateModified: modified || published || undefined,
        image: post.cover_url || undefined,
        keywords: post.focus_keyword || undefined,
        mainEntityOfPage: `${SITE_URL}/blog/${slug}`
      } as Record<string, unknown>)
    : null;
  const faqData = faqs.length
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqs.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: { "@type": "Answer", text: stripInline(faq.answer) }
        }))
      }
    : null;

  return (
    <SiteChrome>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-5 sm:py-12">
        {article ? <JsonLd data={article} /> : null}
        {faqData ? <JsonLd data={faqData} /> : null}
        <section className={`journal-hero relative overflow-hidden rounded-[2rem] border border-white/60 p-6 shadow-lift sm:p-10 ${post.cover_url ? "lg:grid lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:gap-10" : ""}`}>
          <div className="relative z-[1]">
            <Link href="/blog" className="inline-flex items-center gap-2 rounded-full border border-ink/10 bg-white/60 px-3 py-1.5 text-xs font-medium uppercase tracking-[0.16em] text-moss backdrop-blur">
              <span aria-hidden="true">←</span> Journal
            </Link>
            <h1 className="display mt-6 break-words text-4xl leading-[0.98] sm:text-6xl lg:text-7xl">{post.title}</h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-ink/70 sm:text-xl">{post.excerpt}</p>
            <div className="mt-7 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-ink/55">
              {author ? <span className="font-medium text-ink">By {author}</span> : null}
              {author && published ? <span aria-hidden="true">•</span> : null}
              {published ? <time dateTime={published}>{publishedLabel}</time> : null}
              {(author || published) ? <span aria-hidden="true">•</span> : null}
              <span>{readMinutes} min read</span>
              {modified && modified > published ? <span className="rounded-full bg-lime/35 px-2.5 py-1 text-xs text-moss">Updated</span> : null}
            </div>
          </div>
          {post.cover_url ? (
            <div className="relative z-[1] mt-8 lg:mt-0">
              <div className="rotate-1 overflow-hidden rounded-3xl border border-white/70 bg-white/50 p-2 shadow-2xl">
                <img src={post.cover_url} alt={post.title} className="aspect-[4/3] w-full rounded-2xl object-cover" />
              </div>
            </div>
          ) : null}
        </section>

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_250px] lg:items-start">
          <article className="rounded-[2rem] border border-white/70 bg-white/55 p-5 shadow-lift backdrop-blur-sm sm:p-9 lg:p-12">
            <BlockView blocks={blocks} />
            <section className="cta-slab mt-12 px-6 py-8 text-paper sm:px-8">
              <div className="relative z-[1] max-w-xl">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-lime">Ready for the next step?</p>
                <h2 className="mt-3 font-serif text-3xl leading-tight sm:text-4xl">Turn the idea into a system that works.</h2>
                <p className="mt-3 text-sm leading-6 text-paper/70">Tell UX4U what you have today and what needs to be running next.</p>
                <Link href="/contact" className="mt-5 inline-flex rounded-full bg-lime px-5 py-3 text-sm font-medium text-ink transition hover:brightness-105">Start a project →</Link>
              </div>
            </section>
          </article>

          <aside className="space-y-4 lg:sticky lg:top-24">
            {headings.length ? (
              <nav aria-label="On this page" className="rounded-2xl border border-white/70 bg-white/60 p-5 shadow-sm backdrop-blur-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.17em] text-moss">On this page</p>
                <ol className="mt-4 space-y-3 text-sm leading-5 text-ink/65">
                  {headings.map((heading, index) => (
                    <li key={heading.id} className={heading.level === 3 ? "pl-3" : ""}>
                      <a href={`#section-${heading.id}`} className="group flex gap-2 hover:text-moss">
                        <span className="text-ink/30 group-hover:text-moss">{String(index + 1).padStart(2, "0")}</span>
                        <span>{heading.text}</span>
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>
            ) : null}
            <div className="rounded-2xl bg-ink p-5 text-paper shadow-lift">
              <p className="text-xs font-semibold uppercase tracking-[0.17em] text-lime">Article details</p>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between gap-4"><dt className="text-paper/55">Reading time</dt><dd>{readMinutes} min</dd></div>
                {publishedLabel ? <div className="flex justify-between gap-4"><dt className="text-paper/55">Published</dt><dd className="text-right">{publishedLabel}</dd></div> : null}
              </dl>
            </div>
            {related ? (
              <div className="rounded-2xl border border-moss/15 bg-lime/15 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.17em] text-moss">Keep reading</p>
                <Link href={related.service.href} className="mt-3 block text-sm font-medium hover:text-moss">{related.service.label} →</Link>
                <Link href={related.work.href} className="mt-2 block text-sm font-medium hover:text-moss">{related.work.label} →</Link>
              </div>
            ) : null}
          </aside>
        </div>

        {more.length ? (
          <section className="mt-14 border-t border-ink/10 pt-8">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-moss">Continue reading</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {more.map((item) => (
                <Link key={item.id} href={`/blog/${item.slug}`} className="group rounded-2xl border border-white/70 bg-white/55 p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lift">
                  <h2 className="font-serif text-2xl leading-tight group-hover:text-moss">{item.title}</h2>
                  <p className="mt-3 line-clamp-2 text-sm leading-6 text-ink/60">{item.excerpt}</p>
                  <span className="mt-4 inline-block text-sm font-medium text-moss">Read article →</span>
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </main>
    </SiteChrome>
  );
}
