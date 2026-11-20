"use server";

import { revalidatePath } from "next/cache";
import { blocksToText, cleanBlocks, safeUrl, slugify } from "./blocks";
import { logActivity, requireArea } from "./auth";
import { storeImage } from "./storage";
import { admin } from "./supabase";

export type SaveResult = { ok: boolean; id?: string; slug?: string; error?: string; savedAt?: string; status?: PostStatus };
export type PostStatus = "draft" | "scheduled" | "live";
type Mode = "save" | "publish" | "schedule" | "unpublish";

function str(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function statusOf(published: boolean, publishAt: string | null): PostStatus {
  if (!published) return "draft";
  return publishAt && Date.parse(publishAt) > Date.now() ? "scheduled" : "live";
}

export async function savePostEditor(payload: string): Promise<SaveResult> {
  const user = await requireArea("posts", "edit");
  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(payload) as Record<string, unknown>;
  } catch {
    return { ok: false, error: "Could not read the editor data." };
  }
  if (payload.length > 400_000) return { ok: false, error: "This post is too large to save." };

  const id = /^[0-9a-f-]{36}$/i.test(String(raw.id || "")) ? String(raw.id) : "";
  const title = str(raw.title, 200);
  if (!title) return { ok: false, error: "Add a title first." };
  const slug = slugify(str(raw.slug, 120) || title);
  if (!slug) return { ok: false, error: "The web address needs letters or numbers." };
  const blocks = cleanBlocks(raw.blocks);
  const mode: Mode = ["publish", "schedule", "unpublish"].includes(String(raw.mode)) ? (raw.mode as Mode) : "save";

  const supabase = admin();
  let published = false;
  let publish_at: string | null = null;
  if (id) {
    const { data: current } = await supabase.from("posts").select("published, publish_at").eq("id", id).maybeSingle();
    if (!current) return { ok: false, error: "That post no longer exists." };
    published = Boolean(current.published);
    publish_at = current.publish_at ? String(current.publish_at) : null;
  }
  if (mode === "publish") {
    published = true;
    publish_at = null;
  } else if (mode === "schedule") {
    const when = Date.parse(String(raw.publishAt || ""));
    if (!Number.isFinite(when) || when < Date.now() + 60_000) return { ok: false, error: "Pick a time at least a minute from now." };
    published = true;
    publish_at = new Date(when).toISOString();
  } else if (mode === "unpublish") {
    published = false;
    publish_at = null;
  }

  const now = new Date().toISOString();
  const row = {
    title,
    slug,
    excerpt: str(raw.excerpt, 600),
    body: blocksToText(blocks),
    blocks,
    cover_url: safeUrl(raw.coverUrl),
    seo_title: str(raw.seoTitle, 120),
    seo_description: str(raw.seoDescription, 320),
    focus_keyword: str(raw.focusKeyword, 120),
    author_name: str(raw.authorName, 120),
    published,
    publish_at,
    updated_at: now
  };

  const result = id
    ? await supabase.from("posts").update(row).eq("id", id).select("id").single()
    : await supabase.from("posts").insert(row).select("id").single();
  if (result.error || !result.data) {
    const taken = result.error?.code === "23505";
    const missingColumns = result.error?.message?.includes("column");
    return {
      ok: false,
      error: taken
        ? "Another post already uses that web address."
        : missingColumns
          ? "Run supabase/growth.sql in Supabase to enable the new editor."
          : "Could not save. Try again."
    };
  }

  const label = { save: id ? "Saved a post" : "Created a post", publish: "Published a post", schedule: "Scheduled a post", unpublish: "Unpublished a post" }[mode];
  await logActivity(user, "posts", label, title);
  ["/", "/blog", `/blog/${slug}`, "/dashboard/posts", "/sitemap.xml"].forEach((path) => revalidatePath(path));
  return { ok: true, id: String(result.data.id), slug, savedAt: now, status: statusOf(published, publish_at) };
}

export async function uploadPostImage(form: FormData): Promise<{ url?: string; error?: string }> {
  await requireArea("posts", "edit");
  try {
    const url = await storeImage(form.get("file"), "journal");
    return url ? { url } : { error: "Choose an image file." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Upload failed. Run supabase/storage.sql if this is the first upload." };
  }
}
