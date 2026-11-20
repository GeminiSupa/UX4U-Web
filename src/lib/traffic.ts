/** Classifies where a visit came from. Pure, shared by the tracker endpoint and tests. */

export type Source = "ai" | "search" | "social" | "email" | "paid" | "referral" | "direct" | "internal";

const AI: [RegExp, string][] = [
  [/(^|\.)chatgpt\.com$|(^|\.)chat\.openai\.com$|^openai$|^chatgpt(\.com)?$/, "ChatGPT"],
  [/(^|\.)perplexity\.ai$|^perplexity$/, "Perplexity"],
  [/(^|\.)claude\.ai$|^claude$/, "Claude"],
  [/(^|\.)gemini\.google\.com$|(^|\.)bard\.google\.com$|^gemini$/, "Gemini"],
  [/(^|\.)copilot\.microsoft\.com$|^copilot$/, "Copilot"],
  [/(^|\.)you\.com$/, "You.com"],
  [/(^|\.)phind\.com$/, "Phind"],
  [/(^|\.)meta\.ai$/, "Meta AI"],
  [/(^|\.)deepseek\.com$|^deepseek$/, "DeepSeek"],
  [/(^|\.)grok\.com$|^grok$/, "Grok"],
  [/(^|\.)mistral\.ai$/, "Le Chat"]
];

const SEARCH: [RegExp, string][] = [
  [/(^|\.)google\.[a-z.]+$/, "Google"],
  [/(^|\.)bing\.com$/, "Bing"],
  [/(^|\.)duckduckgo\.com$/, "DuckDuckGo"],
  [/(^|\.)yahoo\.[a-z.]+$/, "Yahoo"],
  [/(^|\.)yandex\.[a-z.]+$/, "Yandex"],
  [/(^|\.)baidu\.com$/, "Baidu"],
  [/(^|\.)ecosia\.org$/, "Ecosia"],
  [/(^|\.)brave\.com$/, "Brave Search"]
];

const SOCIAL: [RegExp, string][] = [
  [/(^|\.)facebook\.com$|(^|\.)fb\.com$|^l\.facebook\.com$|^fb$|^facebook$/, "Facebook"],
  [/(^|\.)instagram\.com$|^instagram$|^ig$/, "Instagram"],
  [/(^|\.)tiktok\.com$|^tiktok$/, "TikTok"],
  [/(^|\.)linkedin\.com$|^lnkd\.in$|^linkedin$/, "LinkedIn"],
  [/(^|\.)x\.com$|(^|\.)twitter\.com$|^t\.co$|^twitter$|^x$/, "X"],
  [/(^|\.)youtube\.com$|^youtu\.be$|^youtube$/, "YouTube"],
  [/(^|\.)reddit\.com$|^reddit$/, "Reddit"],
  [/(^|\.)pinterest\.[a-z.]+$|^pinterest$/, "Pinterest"],
  [/(^|\.)whatsapp\.com$|^wa\.me$|^whatsapp$/, "WhatsApp"],
  [/(^|\.)threads\.net$|^threads$/, "Threads"]
];

const EMAIL_HOSTS = /(^|\.)mail\.google\.com$|(^|\.)outlook\.(live|office)\.com$|(^|\.)mail\.yahoo\.com$/;

function match(list: [RegExp, string][], value: string) {
  return list.find(([pattern]) => pattern.test(value))?.[1] || "";
}

export function hostOf(url: string) {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function classifySource(
  referrerHost: string,
  utm: { source?: string; medium?: string },
  ownHost = ""
): { source: Source; name: string } {
  const host = referrerHost.toLowerCase().replace(/^www\./, "");
  const utmSource = (utm.source || "").toLowerCase().trim();
  const medium = (utm.medium || "").toLowerCase().trim();

  // AI assistants first: ChatGPT adds utm_source=chatgpt.com to links it cites.
  const ai = match(AI, utmSource) || match(AI, host);
  if (ai) return { source: "ai", name: ai };

  if (/^(cpc|ppc|paid|paidsocial|paid_social|display|ads?)$/.test(medium)) {
    return { source: "paid", name: match(SOCIAL, utmSource) || match(SEARCH, utmSource) || utmSource || "Paid" };
  }
  if (medium === "email" || medium === "newsletter" || EMAIL_HOSTS.test(host)) {
    return { source: "email", name: utmSource || "Email" };
  }
  const social = match(SOCIAL, utmSource) || match(SOCIAL, host);
  if (social) return { source: "social", name: social };
  const search = match(SEARCH, host) || match(SEARCH, utmSource);
  if (search) return { source: "search", name: search };
  if (host && ownHost && (host === ownHost || host.endsWith(`.${ownHost}`))) return { source: "internal", name: "This site" };
  if (host) return { source: "referral", name: host };
  if (utmSource) return { source: "referral", name: utmSource };
  return { source: "direct", name: "Direct" };
}

export function deviceOf(userAgent: string) {
  const ua = userAgent.toLowerCase();
  if (/ipad|tablet|(android(?!.*mobile))/.test(ua)) return "tablet";
  if (/mobi|iphone|android/.test(ua)) return "mobile";
  return "desktop";
}

export function isBot(userAgent: string) {
  return !userAgent || /bot|crawl|spider|slurp|preview|headless|lighthouse|monitor|curl|wget|python|axios|node-fetch|go-http/i.test(userAgent);
}

export const SOURCE_LABELS: Record<Source, string> = {
  ai: "AI assistants",
  search: "Search",
  social: "Social",
  email: "Email",
  paid: "Paid ads",
  referral: "Other sites",
  direct: "Direct",
  internal: "Internal"
};
