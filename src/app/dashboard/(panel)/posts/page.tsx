import Link from "next/link";
import { can } from "@/lib/access";
import { deletePost } from "@/lib/actions";
import { requireArea } from "@/lib/auth";
import { blocksFromBody, cleanBlocks } from "@/lib/blocks";
import { getPosts, isLive } from "@/lib/data";
import { scorePost } from "@/lib/seo-score";
import { ViewOnly } from "@/components/ViewOnly";

export const dynamic = "force-dynamic";

function when(value: string | null | undefined) {
  if (!value) return "";
  return new Date(value).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

function Pill({ value }: { value: number }) {
  const tone = value >= 80 ? "bg-moss/10 text-moss" : value >= 50 ? "bg-amber-50 text-amber-900" : "bg-red-50 text-red-800";
  return <span className={`rounded-full px-2 py-0.5 text-xs ${tone}`}>{value}</span>;
}

export default async function PostsPage({ searchParams }: { searchParams: Promise<{ error?: string; show?: string }> }) {
  const user = await requireArea("posts", "view");
  const canEdit = can(user, "posts", "edit");
  const query = await searchParams;
  const all = await getPosts(false);
  const rows = all
    .map((post) => {
      const blocks = cleanBlocks(post.blocks);
      const score = scorePost({
        title: post.title,
        seoTitle: post.seo_title || "",
        seoDescription: post.seo_description || "",
        slug: post.slug,
        focusKeyword: post.focus_keyword || "",
        excerpt: post.excerpt,
        coverUrl: post.cover_url || "",
        authorName: post.author_name || "",
        blocks: blocks.length ? blocks : blocksFromBody(post.body)
      });
      const status = !post.published ? "draft" : isLive(post) ? "live" : "scheduled";
      return { post, score, status };
    })
    .filter((row) => !query.show || row.status === query.show)
    .sort((a, b) => Date.parse(b.post.updated_at || b.post.created_at) - Date.parse(a.post.updated_at || a.post.created_at));
  const counts = { live: 0, scheduled: 0, draft: 0 } as Record<string, number>;
  all.forEach((post) => (counts[!post.published ? "draft" : isLive(post) ? "live" : "scheduled"] += 1));

  return (
    <div className="max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl">Journal</h1>
          <p className="mt-2 text-sm text-ink/65">Write, schedule and score posts for search and AI answers.</p>
        </div>
        {canEdit ? (
          <Link href="/dashboard/posts/new" className="rounded-full bg-ink px-5 py-3 text-sm text-paper">+ New post</Link>
        ) : null}
      </div>
      <ViewOnly show={!canEdit} />
      {query.error ? <p className="mt-4 text-sm text-red-800">Could not complete that change.</p> : null}

      <nav className="mt-6 flex flex-wrap gap-2 text-sm">
        {[["", `All ${all.length}`], ["live", `Live ${counts.live}`], ["scheduled", `Scheduled ${counts.scheduled}`], ["draft", `Drafts ${counts.draft}`]].map(([value, label]) => (
          <Link
            key={value || "all"}
            href={value ? `/dashboard/posts?show=${value}` : "/dashboard/posts"}
            className={`rounded-full px-3 py-1 ${(query.show || "") === value ? "bg-ink text-paper" : "border border-ink/15"}`}
          >
            {label}
          </Link>
        ))}
      </nav>

      <div className="mt-4 overflow-x-auto rounded-xl border border-ink/10 bg-white">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-ink/10 text-xs uppercase tracking-[0.12em] text-ink/45">
            <tr>
              <th className="px-4 py-3 font-medium">Post</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Search</th>
              <th className="px-4 py-3 font-medium">AI answers</th>
              <th className="px-4 py-3 font-medium">Updated</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map(({ post, score, status }) => (
              <tr key={post.id} className="border-b border-ink/5 align-top">
                <td className="px-4 py-3">
                  {canEdit ? (
                    <Link href={`/dashboard/posts/${post.id}`} className="font-medium hover:underline">{post.title || "Untitled"}</Link>
                  ) : (
                    <span className="font-medium">{post.title}</span>
                  )}
                  <span className="block text-xs text-ink/50">/blog/{post.slug} · {score.words} words{post.author_name ? ` · ${post.author_name}` : ""}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${status === "live" ? "bg-moss/10 text-moss" : status === "scheduled" ? "bg-amber-50 text-amber-900" : "bg-ink/5"}`}>
                    {status === "scheduled" ? `Scheduled ${when(post.publish_at)}` : status === "live" ? "Live" : "Draft"}
                  </span>
                </td>
                <td className="px-4 py-3"><Pill value={score.seo} /></td>
                <td className="px-4 py-3"><Pill value={score.ai} /></td>
                <td className="px-4 py-3 text-xs text-ink/55">{when(post.updated_at || post.created_at)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-right text-xs">
                  {status === "live" ? <a href={`/blog/${post.slug}`} target="_blank" rel="noreferrer" className="mr-3 text-moss">View</a> : null}
                  {canEdit ? (
                    <form action={deletePost} className="inline">
                      <input type="hidden" name="id" value={post.id} />
                      <button type="submit" className="text-red-800">Delete</button>
                    </form>
                  ) : null}
                </td>
              </tr>
            ))}
            {!rows.length ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-ink/50">No posts here yet.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
