import { notFound } from "next/navigation";
import { requireArea } from "@/lib/auth";
import { aiConfigured } from "@/lib/ai";
import { blocksFromBody, cleanBlocks } from "@/lib/blocks";
import { getPostById, getTeam, isLive } from "@/lib/data";
import { SITE_URL } from "@/lib/site";
import { PostEditor, type EditorPost } from "@/components/PostEditor";

export const dynamic = "force-dynamic";
// AI drafting can take up to a minute.
export const maxDuration = 120;

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireArea("posts", "edit");
  const { id } = await params;
  const team = await getTeam(false);
  const authors = team.map((person) => person.name).filter(Boolean);

  let initial: EditorPost;
  if (id === "new") {
    initial = {
      id: "",
      title: "",
      slug: "",
      excerpt: "",
      seoTitle: "",
      seoDescription: "",
      focusKeyword: "",
      coverUrl: "",
      authorName: authors.includes(user.name) ? user.name : "",
      blocks: [{ id: "intro", type: "paragraph", text: "" }],
      status: "draft",
      publishAt: null,
      updatedAt: new Date().toISOString()
    };
  } else {
    if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
    const post = await getPostById(id);
    if (!post) notFound();
    const blocks = cleanBlocks(post.blocks);
    initial = {
      id: post.id,
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      seoTitle: post.seo_title || "",
      seoDescription: post.seo_description || "",
      focusKeyword: post.focus_keyword || "",
      coverUrl: post.cover_url || "",
      authorName: post.author_name || "",
      blocks: blocks.length ? blocks : blocksFromBody(post.body),
      status: !post.published ? "draft" : isLive(post) ? "live" : "scheduled",
      publishAt: post.publish_at || null,
      updatedAt: post.updated_at || post.created_at
    };
  }

  return <PostEditor initial={initial} authors={authors} aiReady={aiConfigured()} siteUrl={SITE_URL} />;
}
