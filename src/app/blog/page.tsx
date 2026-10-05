import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { ensureSeed, getPosts } from "@/lib/data";
import { pageMeta } from "@/lib/seo";
import { POST_BYLINES } from "@/lib/site";

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
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-5 sm:py-14">
        <p className="text-xs uppercase tracking-[0.22em] text-moss">Journal</p>
        <h1 className="display mt-4 text-4xl sm:text-5xl">How we think about the work.</h1>
        <div className="mt-10 divide-y divide-ink/10 border-y border-ink/10">
          {posts.map((post) => {
            const byline = POST_BYLINES[post.slug];
            return (
              <Link key={post.id} href={`/blog/${post.slug}`} className="block py-6">
                <h2 className="font-serif text-2xl sm:text-3xl">{post.title}</h2>
                {byline ? (
                  <p className="mt-2 text-xs text-ink/50">
                    By {byline.author} · <time dateTime={byline.date}>{byline.date}</time>
                  </p>
                ) : null}
                <p className="mt-3 text-sm leading-relaxed text-ink/70">{post.excerpt}</p>
              </Link>
            );
          })}
        </div>
      </main>
      <Footer />
    </>
  );
}
