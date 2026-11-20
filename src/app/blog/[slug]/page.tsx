import { BlockView } from "@/components/BlockView";
import { JsonLd } from "@/components/JsonLd";
import { blocksFromBody, cleanBlocks, stripInline, type Block } from "@/lib/blocks";
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
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-5 sm:py-14">
        {article ? <JsonLd data={article} /> : null}
        {faqData ? <JsonLd data={faqData} /> : null}
        <Link href="/blog" className="text-sm text-ink/50">
          Journal
        </Link>
        <h1 className="display mt-4 text-4xl sm:text-5xl">{post.title}</h1>
        {author || published ? (
          <p className="mt-3 text-sm text-ink/55">
            {author ? <>By {author}</> : null}
            {author && published ? " · " : null}
            {published ? <time dateTime={published}>{published}</time> : null}
            {modified && modified > published ? (
              <> · Updated <time dateTime={modified}>{modified}</time></>
            ) : null}
          </p>
        ) : null}
        <p className="mt-6 text-lg text-ink/70">{post.excerpt}</p>
        {post.cover_url ? <img src={post.cover_url} alt="" className="mt-8 w-full rounded-2xl border border-ink/10" /> : null}
        <div className="mt-10">
          <BlockView blocks={blocks} />
        </div>
        {related ? (
          <div className="mt-12 border-t border-ink/10 pt-6">
            <p className="text-xs uppercase tracking-[0.16em] text-ink/45">Keep reading</p>
            <ul className="mt-4 space-y-2 text-sm">
              <li>
                <Link href={related.service.href} className="underline">
                  {related.service.label}
                </Link>
              </li>
              <li>
                <Link href={related.work.href} className="underline">
                  {related.work.label}
                </Link>
              </li>
            </ul>
          </div>
        ) : null}
        {more.length ? (
          <div className="mt-14 border-t border-ink/10 pt-6">
            <p className="text-xs uppercase tracking-[0.16em] text-ink/45">More</p>
            {more.map((item) => (
              <Link key={item.id} href={`/blog/${item.slug}`} className="mt-3 block font-serif text-2xl hover:underline">
                {item.title}
              </Link>
            ))}
          </div>
        ) : null}
      </main>
    </SiteChrome>
  );
}
