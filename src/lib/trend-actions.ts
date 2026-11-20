"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AiError } from "./ai";
import { logActivity, requireArea } from "./auth";
import { blockId, slugify } from "./blocks";
import { admin } from "./supabase";
import { generateTrendReport, type TrendItem } from "./trends";

export async function generateTrendsNow() {
  const user = await requireArea("trends", "edit");
  let id = "";
  try {
    id = await generateTrendReport(user.name || "Owner");
  } catch (error) {
    const message = error instanceof AiError || error instanceof Error ? error.message : "Could not create the report.";
    redirect(`/dashboard/trends?error=${encodeURIComponent(message.slice(0, 200))}`);
  }
  await logActivity(user, "trends", "Generated a trend report");
  revalidatePath("/dashboard/trends");
  redirect(`/dashboard/trends?report=${id}`);
}

/** Starts a journal draft from one trend item so the team can turn news into a post. */
export async function trendToDraft(form: FormData) {
  const user = await requireArea("posts", "edit");
  const reportId = String(form.get("report") || "");
  const index = Number(form.get("index"));
  const { data } = await admin().from("trend_reports").select("items").eq("id", reportId).maybeSingle();
  const item = (data?.items as TrendItem[] | undefined)?.[index];
  if (!item) redirect("/dashboard/trends?error=missing");
  const sources = item!.sources.map((url) => `[${new URL(url).hostname.replace(/^www\./, "")}](${url})`).join(", ");
  const blocks = [
    { id: blockId(), type: "paragraph", text: `${item!.what}` },
    { id: blockId(), type: "heading", level: 2, text: "Why does this matter for your business?" },
    { id: blockId(), type: "paragraph", text: item!.why },
    { id: blockId(), type: "heading", level: 2, text: "What should you do now?" },
    { id: blockId(), type: "paragraph", text: item!.action },
    { id: blockId(), type: "callout", text: sources ? `Sources: ${sources}` : "Add your sources here." }
  ];
  const { data: post, error } = await admin()
    .from("posts")
    .insert({
      title: item!.headline.slice(0, 200),
      slug: `${slugify(item!.headline)}-${Date.now().toString(36)}`.slice(0, 90),
      excerpt: item!.what.slice(0, 300),
      body: [item!.what, item!.why, item!.action].join("\n\n"),
      blocks,
      author_name: "",
      published: false,
      updated_at: new Date().toISOString()
    })
    .select("id")
    .single();
  if (error || !post) redirect("/dashboard/trends?error=draft");
  await logActivity(user, "posts", "Started a draft from trend watch", item!.headline);
  redirect(`/dashboard/posts/${post!.id}`);
}
