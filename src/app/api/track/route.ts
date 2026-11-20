import { classifySource, deviceOf, hostOf, isBot } from "@/lib/traffic";
import { admin } from "@/lib/supabase";

// First-party, consent-gated page view and conversion events. No IP address or cookie is stored.
export const dynamic = "force-dynamic";

const ID = /^[a-z0-9]{8,40}$/i;

function clip(value: unknown, max: number) {
  return typeof value === "string" ? value.slice(0, max) : "";
}

export async function POST(request: Request) {
  const userAgent = request.headers.get("user-agent") || "";
  if (isBot(userAgent)) return new Response(null, { status: 204 });
  const raw = await request.text();
  if (raw.length > 2048) return new Response(null, { status: 413 });

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return new Response(null, { status: 400 });
  }
  const path = clip(body.p, 300);
  const type = body.t === "lead" ? "lead" : "view";
  const visitor = clip(body.v, 40);
  const session = clip(body.s, 40);
  if (!path.startsWith("/") || path.startsWith("/dashboard") || path.startsWith("/api") || !ID.test(visitor) || !ID.test(session)) {
    return new Response(null, { status: 400 });
  }

  const ownHost = (request.headers.get("host") || "").toLowerCase().replace(/^www\./, "").split(":")[0];
  const utm = (body.u && typeof body.u === "object" ? body.u : {}) as Record<string, unknown>;
  const referrerHost = hostOf(clip(body.r, 500));
  const { source, name } = classifySource(referrerHost, { source: clip(utm.s, 100), medium: clip(utm.m, 100) }, ownHost);

  try {
    await admin().from("page_views").insert({
      type,
      path: path.split("?")[0].split("#")[0],
      visitor_id: visitor,
      session_id: session,
      referrer_host: source === "internal" ? "" : referrerHost.slice(0, 200),
      source: source === "internal" ? "direct" : source,
      source_name: source === "internal" ? "Direct" : name.slice(0, 100),
      utm_source: clip(utm.s, 100),
      utm_medium: clip(utm.m, 100),
      utm_campaign: clip(utm.c, 150),
      device: deviceOf(userAgent),
      country: clip(request.headers.get("x-vercel-ip-country"), 2).toUpperCase()
    });
  } catch {
    // Analytics must never break the site.
  }
  return new Response(null, { status: 204 });
}
