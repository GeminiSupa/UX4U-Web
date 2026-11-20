import { blocksToText, linksIn, stripInline, wordCount, type Block } from "./blocks";

export type ScoreInput = {
  title: string;
  seoTitle: string;
  seoDescription: string;
  slug: string;
  focusKeyword: string;
  excerpt: string;
  coverUrl: string;
  authorName: string;
  blocks: Block[];
};

export type Check = { id: string; group: "seo" | "ai"; label: string; ok: boolean; tip: string; weight: number };
export type Score = { seo: number; ai: number; words: number; readMinutes: number; checks: Check[] };

function has(text: string, keyword: string) {
  return Boolean(keyword) && text.toLowerCase().includes(keyword.toLowerCase());
}

function averageSentenceLength(text: string) {
  const sentences = text.split(/[.!?]+\s/).map((part) => part.trim()).filter(Boolean);
  if (!sentences.length) return 0;
  return wordCount(text) / sentences.length;
}

/**
 * Rule-based checks for classic search and for AI answer engines (ChatGPT, Perplexity, Google AI Overviews).
 * AI checks follow what tends to get cited: a direct answer early, question-shaped sections, FAQs,
 * concrete facts and sources, a named author and a clear structure.
 */
export function scorePost(input: ScoreInput): Score {
  const text = blocksToText(input.blocks);
  const words = wordCount(text);
  const keyword = input.focusKeyword.trim();
  const title = input.seoTitle.trim() || input.title.trim();
  const description = input.seoDescription.trim() || input.excerpt.trim();
  const headings = input.blocks.filter((block) => block.type === "heading") as Extract<Block, { type: "heading" }>[];
  const images = input.blocks.filter((block) => block.type === "image") as Extract<Block, { type: "image" }>[];
  const faqs = input.blocks.filter((block) => block.type === "faq" && block.question && block.answer);
  const links = linksIn(input.blocks);
  const internal = links.filter((url) => url.startsWith("/"));
  const external = links.filter((url) => /^https?:\/\//.test(url));
  const firstParagraph = input.blocks.find((block) => block.type === "paragraph") as
    | Extract<Block, { type: "paragraph" }>
    | undefined;
  const intro = firstParagraph ? stripInline(firstParagraph.text) : "";
  const introWords = wordCount(intro);
  const numbers = (text.match(/\b\d+(?:[.,]\d+)?%?/g) || []).length;
  const questionHeadings = headings.filter((heading) => /\?\s*$/.test(heading.text) || /^(how|what|why|when|which|who|can|should|is|are|do|does)\b/i.test(heading.text));
  const avgSentence = averageSentenceLength(text);

  const checks: Check[] = [
    { id: "title-length", group: "seo", weight: 10, label: "Title is 30 to 60 characters", ok: title.length >= 30 && title.length <= 60, tip: `Now ${title.length}. Search results cut titles at about 60 characters.` },
    { id: "meta-length", group: "seo", weight: 10, label: "Meta description is 120 to 160 characters", ok: description.length >= 120 && description.length <= 160, tip: `Now ${description.length}. This is the grey text under the link in search results.` },
    { id: "keyword-set", group: "seo", weight: 5, label: "Focus keyword is set", ok: Boolean(keyword), tip: "Pick the one phrase a customer would type to find this post." },
    { id: "keyword-title", group: "seo", weight: 10, label: "Keyword appears in the title", ok: has(title, keyword), tip: "Put the focus keyword near the start of the title." },
    { id: "keyword-intro", group: "seo", weight: 8, label: "Keyword appears in the first paragraph", ok: has(intro, keyword), tip: "Mention it naturally in the opening lines." },
    { id: "keyword-heading", group: "seo", weight: 5, label: "Keyword appears in a heading", ok: headings.some((heading) => has(heading.text, keyword)), tip: "Use it (or a close variant) in at least one H2." },
    { id: "keyword-slug", group: "seo", weight: 5, label: "Keyword is in the web address", ok: Boolean(keyword) && input.slug.includes(keyword.toLowerCase().replace(/[^a-z0-9]+/g, "-")), tip: "Short slugs with the keyword do best." },
    { id: "length", group: "seo", weight: 10, label: "At least 600 words", ok: words >= 600, tip: `Now ${words} words. Thin posts rarely rank for anything competitive.` },
    { id: "headings", group: "seo", weight: 8, label: "Split into sections with headings", ok: headings.length >= 2, tip: "Add an H2 every 200 to 300 words." },
    { id: "image-alt", group: "seo", weight: 7, label: "Images have alt text", ok: images.length > 0 && images.every((image) => image.alt.trim().length >= 5), tip: images.length ? "Describe each image in a short sentence." : "Add at least one image." },
    { id: "internal-links", group: "seo", weight: 7, label: "Links to another page on this site", ok: internal.length > 0, tip: "Link to a service or case study, e.g. [web development](/services/web-development)." },
    { id: "readability", group: "seo", weight: 5, label: "Sentences average under 22 words", ok: words === 0 || avgSentence <= 22, tip: `Now about ${Math.round(avgSentence)} words per sentence.` },
    { id: "cover", group: "seo", weight: 5, label: "Has a cover image for sharing", ok: Boolean(input.coverUrl), tip: "Used as the preview image on social and in AI answers." },

    { id: "direct-answer", group: "ai", weight: 20, label: "Opens with a direct answer (40 to 80 words)", ok: introWords >= 25 && introWords <= 90, tip: "AI assistants quote the first clear answer. Lead with the conclusion, then explain." },
    { id: "question-headings", group: "ai", weight: 15, label: "Some headings are real questions", ok: questionHeadings.length >= 2, tip: "Phrase sections the way people ask assistants: “How long does …?”" },
    { id: "faq", group: "ai", weight: 15, label: "Has at least 3 FAQ blocks", ok: faqs.length >= 3, tip: "FAQ blocks are marked up as FAQPage data, which maps to follow-up questions." },
    { id: "facts", group: "ai", weight: 15, label: "Includes concrete numbers or data", ok: numbers >= 3, tip: "Original figures, prices, timelines and results get cited far more than opinions." },
    { id: "sources", group: "ai", weight: 10, label: "Cites at least one outside source", ok: external.length > 0, tip: "Link to the study, docs or data you rely on." },
    { id: "author", group: "ai", weight: 10, label: "Named author", ok: Boolean(input.authorName.trim()), tip: "Engines weigh who wrote it. Pick an author." },
    { id: "lists", group: "ai", weight: 10, label: "Uses a list or steps", ok: input.blocks.some((block) => block.type === "list"), tip: "Steps and lists are easy for answer engines to lift." },
    { id: "summary", group: "ai", weight: 5, label: "Has a summary for previews", ok: input.excerpt.trim().length >= 60, tip: "Write a 1 to 2 sentence excerpt." }
  ];

  const total = (group: "seo" | "ai") => {
    const list = checks.filter((check) => check.group === group);
    const max = list.reduce((sum, check) => sum + check.weight, 0);
    const got = list.filter((check) => check.ok).reduce((sum, check) => sum + check.weight, 0);
    return Math.round((got / max) * 100);
  };

  return { seo: total("seo"), ai: total("ai"), words, readMinutes: Math.max(1, Math.round(words / 230)), checks };
}
