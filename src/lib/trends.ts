import "server-only";
import { askAi, askAiJson, type Citation } from "./ai";
import { admin } from "./supabase";

export type TrendItem = {
  category: string;
  headline: string;
  what: string;
  why: string;
  action: string;
  sources: string[];
};

export type TrendReport = {
  id: string;
  week_of: string;
  title: string;
  summary: string;
  items: TrendItem[];
  sources: Citation[];
  created_at: string;
  created_by_name: string;
};

const CATEGORIES = ["AI models & tools", "Search & AI answers", "Web & design", "Social & ads", "Security & privacy"];

export function weekOf(date = new Date()) {
  const day = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  day.setUTCDate(day.getUTCDate() - ((day.getUTCDay() + 6) % 7));
  return day.toISOString().slice(0, 10);
}

/**
 * Two steps on purpose: a web-search call writes a cited briefing, then a separate call (no tools)
 * turns it into structured items. Combining search with strict JSON output is unreliable.
 */
export async function generateTrendReport(createdBy: string) {
  const today = new Date().toISOString().slice(0, 10);
  const research = await askAi({
    webSearch: true,
    maxOutputTokens: 6000,
    timeoutMs: 150000,
    instructions: `You are the research desk for UX4U, a software, web and growth studio in Islamabad serving small and mid-size businesses.
Today is ${today}. Search the web for what changed in the last 7 days. Only include items published in the last 7 days, each with a source link.
Cover: ${CATEGORIES.join("; ")}. Include Google Search and AI Overviews updates, ChatGPT/Perplexity/Claude/Gemini product changes that affect how businesses get found, Meta/TikTok/Instagram ad and API changes, notable web platform and framework releases (Next.js, React, browsers), and security issues affecting websites.
For each item: the headline, what changed in two sentences, why it matters to a studio like UX4U and its clients, and one concrete action. Skip rumours and anything you cannot source.`,
    input: "Write this week's briefing with 8 to 14 items."
  });

  const structured = await askAiJson<{ title: string; summary: string; items: TrendItem[] }>({
    maxOutputTokens: 6000,
    instructions: `Convert the briefing into structured data. Keep only facts present in the briefing. Use only these categories: ${CATEGORIES.join(", ")}. Sources must be URLs that appear in the briefing.`,
    input: `${research.text}\n\nSource links found:\n${research.citations.map((c) => `- ${c.title}: ${c.url}`).join("\n")}`,
    schemaName: "trend_report",
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["title", "summary", "items"],
      properties: {
        title: { type: "string", description: "Short headline for the week, under 80 characters." },
        summary: { type: "string", description: "Three sentence overview of the week." },
        items: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["category", "headline", "what", "why", "action", "sources"],
            properties: {
              category: { type: "string", enum: CATEGORIES },
              headline: { type: "string" },
              what: { type: "string" },
              why: { type: "string" },
              action: { type: "string" },
              sources: { type: "array", items: { type: "string" } }
            }
          }
        }
      }
    }
  });

  const allowed = new Set(research.citations.map((citation) => citation.url));
  const items = structured.items.map((item) => ({
    ...item,
    sources: item.sources.filter((url) => /^https?:\/\//.test(url) && (allowed.size === 0 || allowed.has(url) || research.text.includes(url))).slice(0, 4)
  }));

  const { data, error } = await admin()
    .from("trend_reports")
    .insert({
      week_of: weekOf(),
      title: structured.title.slice(0, 200),
      summary: structured.summary.slice(0, 2000),
      items,
      sources: research.citations.slice(0, 40),
      created_by_name: createdBy
    })
    .select("id")
    .single();
  if (error || !data) throw new Error("Could not save the report. Run supabase/growth.sql first.");
  return String(data.id);
}

export async function listTrendReports(limit = 20): Promise<{ ready: boolean; reports: TrendReport[] }> {
  try {
    const { data, error } = await admin().from("trend_reports").select("*").order("created_at", { ascending: false }).limit(limit);
    if (error) return { ready: false, reports: [] };
    return { ready: true, reports: (data || []) as TrendReport[] };
  } catch {
    return { ready: false, reports: [] };
  }
}
