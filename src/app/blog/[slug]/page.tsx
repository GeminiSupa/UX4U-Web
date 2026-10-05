import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { JsonLd } from "@/components/JsonLd";
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
    return pageMeta({
      title: post.title,
      description: post.excerpt,
      path: `/blog/${slug}`,
      type: "article"
    });
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
  const byline = POST_BYLINES[slug];
  const article =
    byline &&
    ({
      "@context": "https://schema.org",
      "@type": "Article",
      headline: post.title,
      author: { "@type": "Person", name: byline.author },
      datePublished: byline.date,
      mainEntityOfPage: `${SITE_URL}/blog/${slug}`
    } as Record<string, unknown>);

  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-5 sm:py-14">
        {article ? <JsonLd data={article} /> : null}
        <Link href="/blog" className="text-sm text-ink/50">
          Journal
        </Link>
        <h1 className="display mt-4 text-4xl sm:text-5xl">{post.title}</h1>
        {byline ? (
          <p className="mt-3 text-sm text-ink/55">
            By {byline.author} · <time dateTime={byline.date}>{byline.date}</time>
          </p>
        ) : null}
        <p className="mt-6 text-lg text-ink/70">{post.excerpt}</p>
        <div className="mt-10 space-y-5 text-base leading-relaxed text-ink/85">
          {post.body.split(/\n\n+/).map((paragraph) => (
            <p key={paragraph.slice(0, 24)}>{paragraph}</p>
          ))}
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
      <Footer />
    </>
  );
}
