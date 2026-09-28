const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
const PHONE_RE = /(?:\+\d{1,3}[\s.\-]?)?(?:\(?\d{2,4}\)?[\s.\-]?)?\d{3,4}[\s.\-]?\d{3,4}/g;
const WA_RE = /(?:https?:)?\/\/(?:wa\.me|api\.whatsapp\.com)\/[^\s"'<>]+/gi;
const ROLE_RE =
  /\b(?:owner|founder|co-founder|ceo|proprietor|director|managing director|president)\s*[:\-–|]\s*([A-Z][a-z]+(?:\s+[A-Z][a-z.'-]+){1,3})/gi;
const CONTACT_PATHS = ["/contact", "/contact-us", "/about", "/about-us"];
const SKIP_DOMAINS = ["example.com", "sentry.io", "wixpress.com", "schema.org", "email.com"];

export type ScrapedLead = {
  business_name: string;
  website: string;
  emails: string;
  phones: string;
  whatsapp: string;
  contact_name: string;
  source_url: string;
  notes: string;
};

function digits(value: string) {
  return value.replace(/\D/g, "");
}

function plausiblePhone(value: string) {
  const count = digits(value).length;
  return count >= 8 && count <= 15 && new Set(digits(value)).size > 1;
}

function normalizePhone(value: string) {
  const clean = digits(value);
  return value.trim().startsWith("+") ? `+${clean}` : clean;
}

function validEmail(email: string) {
  const cleaned = email.replace(/[.,;:<>()[\]{}"']+$/g, "").toLowerCase();
  const [local, domain] = cleaned.split("@");
  if (!local || !domain) return "";
  if (SKIP_DOMAINS.includes(domain)) return "";
  if (["noreply", "no-reply", "example", "test", "email"].includes(local)) return "";
  if (/\.(png|jpg|jpeg|gif|svg|css|js)$/.test(cleaned)) return "";
  return cleaned;
}

function textOf(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ");
}

function businessName(html: string, website: string) {
  const site = html.match(/property=["']og:site_name["'][^>]*content=["']([^"']+)/i);
  if (site?.[1]) return site[1].trim().slice(0, 120);
  const title = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] || "";
  const cleaned = title.split(/\s[|\-–]\s/)[0]?.trim();
  if (cleaned) return cleaned.slice(0, 120);
  try {
    return new URL(website).host.replace(/^www\./, "");
  } catch {
    return website;
  }
}

function join(values: Set<string>) {
  return Array.from(values).sort().join("; ");
}

export function parseUrls(raw: string) {
  const found: string[] = [];
  const seen = new Set<string>();
  for (const token of raw.split(/[\s,;]+/)) {
    const value = token.trim();
    if (!value || value.includes(" ")) continue;
    const withScheme = /^https?:\/\//i.test(value) ? value : `https://${value}`;
    try {
      const url = new URL(withScheme);
      if (!["http:", "https:"].includes(url.protocol)) continue;
      const normalized = `${url.origin}${url.pathname === "/" ? "" : url.pathname}`;
      if (seen.has(normalized)) continue;
      seen.add(normalized);
      found.push(normalized);
    } catch {
      continue;
    }
  }
  return found;
}

async function allowed(url: string) {
  try {
    const origin = new URL(url).origin;
    const response = await fetch(`${origin}/robots.txt`, { signal: AbortSignal.timeout(4000) });
    if (!response.ok) return true;
    const body = await response.text();
    const lines = body.split(/\r?\n/);
    let applies = false;
    const disallowed: string[] = [];
    for (const line of lines) {
      const trimmed = line.trim();
      if (/^user-agent:/i.test(trimmed)) {
        const agent = trimmed.split(":")[1]?.trim().toLowerCase();
        applies = agent === "*";
      } else if (applies && /^disallow:/i.test(trimmed)) {
        disallowed.push(trimmed.split(":").slice(1).join(":").trim());
      }
    }
    const path = new URL(url).pathname || "/";
    return !disallowed.some((rule) => rule && rule !== "/" && path.startsWith(rule));
  } catch {
    return true;
  }
}

async function fetchHtml(url: string) {
  if (!(await allowed(url))) throw new Error("robots.txt disallows this page");
  const response = await fetch(url, {
    redirect: "follow",
    signal: AbortSignal.timeout(8000),
    headers: {
      "User-Agent": "UX4ULeadDesk/1.0 (public business contact research)",
      Accept: "text/html"
    }
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const type = response.headers.get("content-type") || "";
  if (type && !type.includes("html") && !type.includes("text/")) {
    throw new Error("Not an HTML page");
  }
  return (await response.text()).slice(0, 1_500_000);
}

function extract(html: string) {
  const emails = new Set<string>();
  const phones = new Set<string>();
  const whatsapp = new Set<string>();
  const names = new Set<string>();
  const text = textOf(html);

  for (const match of html.match(/mailto:([^"'?>\s]+)/gi) || []) {
    const email = validEmail(decodeURIComponent(match.slice(7)));
    if (email) emails.add(email);
  }
  for (const match of text.match(EMAIL_RE) || []) {
    const email = validEmail(match);
    if (email) emails.add(email);
  }
  for (const match of html.match(WA_RE) || []) {
    const href = match.startsWith("http") ? match : `https:${match}`;
    try {
      const url = new URL(href);
      const phone = url.searchParams.get("phone") || url.pathname.split("/").filter(Boolean)[0] || "";
      if (plausiblePhone(phone)) whatsapp.add(normalizePhone(`+${digits(phone)}`));
    } catch {
      continue;
    }
  }
  const linesOf = text.split(/(?<=\.)\s+|\n/);
  for (const line of linesOf) {
    if (!/whats\s?app/i.test(line)) continue;
    for (const match of line.match(PHONE_RE) || []) {
      if (plausiblePhone(match)) whatsapp.add(normalizePhone(match));
    }
  }
  for (const match of text.match(PHONE_RE) || []) {
    if (!plausiblePhone(match) || !/[+\-().\s]/.test(match)) continue;
    const normalized = normalizePhone(match);
    if (![...whatsapp].some((number) => digits(number) === digits(normalized))) phones.add(normalized);
  }
  for (const match of text.matchAll(ROLE_RE)) {
    if (match[1]) names.add(match[1].replace(/\s+/g, " ").trim());
  }
  return { emails, phones, whatsapp, names };
}

export async function scrapeWebsite(website: string, maxPages = 3): Promise<ScrapedLead> {
  const origin = new URL(website).origin;
  const queue = [website, ...CONTACT_PATHS.map((path) => origin + path)];
  const seen = new Set<string>();
  const emails = new Set<string>();
  const phones = new Set<string>();
  const whatsapp = new Set<string>();
  const names = new Set<string>();
  const notes: string[] = [];
  let name = "";
  let fetched = 0;

  for (const url of queue) {
    if (fetched >= maxPages || seen.has(url)) continue;
    seen.add(url);
    try {
      const html = await fetchHtml(url);
      fetched += 1;
      if (!name) name = businessName(html, website);
      const found = extract(html);
      found.emails.forEach((value) => emails.add(value));
      found.phones.forEach((value) => phones.add(value));
      found.whatsapp.forEach((value) => whatsapp.add(value));
      found.names.forEach((value) => names.add(value));
    } catch (error) {
      if (fetched === 0) notes.push(error instanceof Error ? error.message : "Could not read the page");
    }
  }

  return {
    business_name: name || new URL(website).host.replace(/^www\./, ""),
    website: origin,
    emails: join(emails),
    phones: join(phones),
    whatsapp: join(whatsapp),
    contact_name: join(names),
    source_url: website,
    notes: notes.join("; ")
  };
}

export async function externalLinks(pageUrl: string, limit: number) {
  const html = await fetchHtml(pageUrl);
  const origin = new URL(pageUrl).origin;
  const found: string[] = [];
  const seen = new Set<string>();
  for (const match of html.match(/href=["']([^"']+)["']/gi) || []) {
    const href = match.replace(/^href=["']/i, "").replace(/["']$/, "");
    if (/^(mailto:|tel:|#|javascript:)/i.test(href)) continue;
    try {
      const absolute = new URL(href, pageUrl);
      if (absolute.origin === origin) continue;
      if (!["http:", "https:"].includes(absolute.protocol)) continue;
      const website = absolute.origin;
      if (seen.has(website)) continue;
      seen.add(website);
      found.push(website);
      if (found.length >= limit) break;
    } catch {
      continue;
    }
  }
  return found;
}
