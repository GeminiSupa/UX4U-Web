"use server";

import { askAiJson, AiError } from "./ai";
import { logActivity, requireArea } from "./auth";
import { cleanBlocks, type Block } from "./blocks";
import { admin } from "./supabase";
import type { StaffUser } from "./access";

const HOURLY_LIMIT = 60;

const VOICE = `You write for UX4U, a software and growth studio in Islamabad that builds products and websites and runs SEO, ads and automation for clients.
Style: plain, direct, specific, short sentences, no hype, no emojis, British or American English consistently.
Never invent statistics, prices, client names, quotes, awards or results. Where a real figure would help, write a placeholder like [add figure: average launch time] so the editor can fill it in.
Write for people first and for AI answer engines second: open with the direct answer, use question-shaped headings, include steps and FAQs.`;

type Ok<T> = { ok: true; data: T } | { ok: false; error: string };

async function guard(user: StaffUser, task: string): Promise<string> {
  try {
    const since = new Date(Date.now() - 3600_000).toISOString();
    const { count } = await admin()
      .from("activity_log")
      .select("id", { count: "exact", head: true })
      .eq("actor_id", user.id)
      .eq("area", "ai")
      .gte("created_at", since);
    if ((count || 0) >= HOURLY_LIMIT) return "You have reached the hourly AI limit. Try again later.";
  } catch {
    // If the log table is missing the limit cannot be checked; carry on.
  }
  await logActivity(user, "ai", `Used AI: ${task}`);
  return "";
}

async function run<T>(task: string, work: () => Promise<T>): Promise<Ok<T>> {
  const user = await requireArea("posts", "edit");
  const limited = await guard(user, task);
  if (limited) return { ok: false, error: limited };
  try {
    return { ok: true, data: await work() };
  } catch (error) {
    return { ok: false, error: error instanceof AiError ? error.message : "The AI request failed. Try again." };
  }
}

const aiBlockSchema = {
  type: "object",
  additionalProperties: false,
  required: ["type", "text", "level", "items", "question", "answer"],
  properties: {
    type: { type: "string", enum: ["heading", "paragraph", "list", "quote", "callout", "faq"] },
    text: { type: "string", description: "Heading, paragraph, quote or callout text. Paragraphs may use **bold**, *italic* and [text](url)." },
    level: { type: "integer", enum: [2, 3], description: "Heading level; 2 for other types." },
    items: { type: "array", items: { type: "string" }, description: "List items; empty for other types." },
    question: { type: "string", description: "FAQ question; empty for other types." },
    answer: { type: "string", description: "FAQ answer; empty for other types." }
  }
};

type AiBlock = { type: string; text: string; level: number; items: string[]; question: string; answer: string };

function toBlocks(items: AiBlock[]): Block[] {
  return cleanBlocks(
    items.map((item) => {
      if (item.type === "list") return { type: "list", style: "bullet", items: item.items };
      if (item.type === "faq") return { type: "faq", question: item.question, answer: item.answer };
      if (item.type === "heading") return { type: "heading", level: item.level, text: item.text };
      if (item.type === "quote") return { type: "quote", text: item.text, cite: "" };
      return { type: item.type, text: item.text };
    })
  );
}

export type Draft = {
  title: string;
  excerpt: string;
  seoTitle: string;
  seoDescription: string;
  slug: string;
  focusKeyword: string;
  blocks: Block[];
};

export async function aiDraftPost(input: { brief: string; keyword: string; audience: string; length: "short" | "standard" | "long" }) {
  return run<Draft>("draft a post", async () => {
    const words = { short: 600, standard: 1100, long: 1800 }[input.length] || 1100;
    const result = await askAiJson<Omit<Draft, "blocks"> & { blocks: AiBlock[] }>({
      instructions: `${VOICE}\nReturn a complete blog post as structured blocks. Aim for about ${words} words. Start with a 40 to 80 word paragraph that directly answers the main question. Use 3 to 6 H2 sections, at least two phrased as questions, one list, one callout with the key takeaway, and 3 to 5 FAQ blocks at the end. Include one internal link to a relevant UX4U page using site paths such as /services/web-development, /services/seo, /services/product-development, /services/lead-generation, /services/business-automation or /contact.`,
      input: `Brief: ${input.brief.slice(0, 3000)}\nFocus keyword: ${input.keyword.slice(0, 120) || "(choose the best one)"}\nReader: ${input.audience.slice(0, 300) || "small and mid-size business owners"}`,
      schemaName: "blog_post",
      maxOutputTokens: 9000,
      schema: {
        type: "object",
        additionalProperties: false,
        required: ["title", "excerpt", "seoTitle", "seoDescription", "slug", "focusKeyword", "blocks"],
        properties: {
          title: { type: "string" },
          excerpt: { type: "string", description: "One or two sentence summary, under 200 characters." },
          seoTitle: { type: "string", description: "30 to 60 characters, keyword near the start." },
          seoDescription: { type: "string", description: "120 to 160 characters." },
          slug: { type: "string", description: "Short lowercase-hyphenated web address." },
          focusKeyword: { type: "string" },
          blocks: { type: "array", items: aiBlockSchema }
        }
      }
    });
    return { ...result, blocks: toBlocks(result.blocks) };
  });
}

export async function aiRewrite(input: { text: string; instruction: string }) {
  return run<{ text: string }>("rewrite text", () =>
    askAiJson<{ text: string }>({
      instructions: `${VOICE}\nRewrite the user's text as instructed. Keep any [text](url) links and **bold** markers that still make sense. Return only the rewritten text.`,
      input: `Instruction: ${input.instruction.slice(0, 300)}\n\nText:\n${input.text.slice(0, 6000)}`,
      schemaName: "rewrite",
      maxOutputTokens: 3000,
      schema: { type: "object", additionalProperties: false, required: ["text"], properties: { text: { type: "string" } } }
    })
  );
}

export type SeoAdvice = {
  seoTitle: string;
  seoDescription: string;
  slug: string;
  focusKeyword: string;
  faqs: { question: string; answer: string }[];
  tips: string[];
};

export async function aiSeoAdvice(input: { title: string; keyword: string; text: string }) {
  return run<SeoAdvice>("SEO and AI search advice", () =>
    askAiJson<SeoAdvice>({
      instructions: `${VOICE}\nYou are reviewing a post for Google search and for AI answer engines (ChatGPT search, Perplexity, Google AI Overviews, Claude).
Suggest a better SEO title (30 to 60 characters), meta description (120 to 160 characters), slug and focus keyword. Write 3 to 5 FAQ pairs that real people would ask an assistant about this topic, answered only from the post's content.
Give up to 6 short, specific tips that would make the post more likely to be cited by AI answers (for example: add a direct answer under a heading, add a dated figure, cite a primary source, add a comparison table, name the author).`,
      input: `Title: ${input.title.slice(0, 200)}\nFocus keyword: ${input.keyword.slice(0, 120)}\n\nPost:\n${input.text.slice(0, 20000)}`,
      schemaName: "seo_advice",
      maxOutputTokens: 4000,
      schema: {
        type: "object",
        additionalProperties: false,
        required: ["seoTitle", "seoDescription", "slug", "focusKeyword", "faqs", "tips"],
        properties: {
          seoTitle: { type: "string" },
          seoDescription: { type: "string" },
          slug: { type: "string" },
          focusKeyword: { type: "string" },
          faqs: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["question", "answer"],
              properties: { question: { type: "string" }, answer: { type: "string" } }
            }
          },
          tips: { type: "array", items: { type: "string" } }
        }
      }
    })
  );
}
