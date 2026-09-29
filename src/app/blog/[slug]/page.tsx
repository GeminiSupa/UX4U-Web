import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { ensureSeed, getPost, getPosts } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  return { title: post?.title || "Journal" };
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  await ensureSeed().catch(() => false);
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();
  const more = (await getPosts(true)).filter((item) => item.slug !== slug).slice(0, 2);

  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-5 sm:py-14">
        <Link href="/blog" className="text-sm text-ink/50">
          Journal
        </Link>
        <h1 className="display mt-4 text-4xl sm:text-5xl">{post.title}</h1>
        <p className="mt-6 text-lg text-ink/70">{post.excerpt}</p>
        <div className="mt-10 space-y-5 text-base leading-relaxed text-ink/85">
          {post.body.split(/\n\n+/).map((paragraph) => (
            <p key={paragraph.slice(0, 24)}>{paragraph}</p>
          ))}
        </div>
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
