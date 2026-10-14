import Link from "next/link";
import { Reveal } from "@/components/Reveal";
import { SiteChrome } from "@/components/SiteChrome";
import { TiltCard } from "@/components/TiltCard";
import { ensureSeed, getPosts } from "@/lib/data";
import { pageMeta } from "@/lib/seo";
import { POST_BYLINES } from "@/lib/site";
import { card, cardBody, cardPad, cardTitle } from "@/lib/ui";

export const dynamic = "force-dynamic";
export const metadata = pageMeta({
  title: "Journal: How We Think About the Work",
  description:
    "Short notes from the UX4U studio on launching products, building lead lists and turning a concept into a business that runs.",
  path: "/blog"
});

export default async function BlogPage() {
  await ensureSeed().catch(() => false);
  const posts = await getPosts(true);

  return (
    <SiteChrome>
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-5 sm:py-14">
        <p className="text-xs uppercase tracking-[0.22em] text-moss">Journal</p>
        <h1 className="display mt-4 text-4xl sm:text-5xl">How we think about the work.</h1>
        <div className="mt-10 grid auto-rows-fr gap-5 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post, index) => {
            const byline = POST_BYLINES[post.slug];
            return (
              <Reveal key={post.id} delay={index * 70} className="h-full">
                <TiltCard as="a" href={`/blog/${post.slug}`} className={`${card} min-h-[14rem]`}>
                  <div className={cardPad}>
                    <h2 className={cardTitle}>{post.title}</h2>
                    {byline ? (
                      <p className="mt-2 text-xs text-ink/50">
                        By {byline.author} · <time dateTime={byline.date}>{byline.date}</time>
                      </p>
                    ) : null}
                    <p className={cardBody}>{post.excerpt}</p>
                    <p className="mt-auto pt-5 text-xs uppercase tracking-[0.14em] text-cyan">Read note →</p>
                  </div>
                </TiltCard>
              </Reveal>
            );
          })}
        </div>
      </main>
    </SiteChrome>
  );
}
