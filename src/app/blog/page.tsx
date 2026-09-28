import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { ensureSeed, getPosts } from "@/lib/data";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Journal" };

export default async function BlogPage() {
  await ensureSeed().catch(() => false);
  const posts = await getPosts(true);

  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-5 py-14">
        <p className="text-xs uppercase tracking-[0.22em] text-moss">Journal</p>
        <h1 className="display mt-4 text-5xl">How we think about the work.</h1>
        <div className="mt-10 divide-y divide-ink/10 border-y border-ink/10">
          {posts.map((post) => (
            <Link key={post.id} href={`/blog/${post.slug}`} className="block py-6">
              <h2 className="font-serif text-3xl">{post.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-ink/70">{post.excerpt}</p>
            </Link>
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}
