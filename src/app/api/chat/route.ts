import { can } from "@/lib/access";
import { currentUser, logActivity } from "@/lib/auth";
import { CHANNELS } from "@/lib/chat";
import { admin } from "@/lib/supabase";
import { notify, staffDirectory } from "@/lib/team";

export const dynamic = "force-dynamic";

function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).host === request.headers.get("host");
  } catch {
    return false;
  }
}

function channelOf(value: string | null) {
  return (CHANNELS as readonly string[]).includes(value || "") ? (value as string) : "general";
}

export async function GET(request: Request) {
  try {
    return await readMessages(request);
  } catch {
    return json({ error: "Chat is not set up yet. Run supabase/growth.sql." }, 500);
  }
}

async function readMessages(request: Request) {
  const user = await currentUser();
  if (!user) return json({ error: "Sign in" }, 401);
  if (!can(user, "chat", "view")) return json({ error: "No access" }, 403);
  const url = new URL(request.url);
  const channel = channelOf(url.searchParams.get("channel"));
  const after = url.searchParams.get("after");
  let query = admin().from("chat_messages").select("id, channel, user_id, user_name, body, created_at").eq("channel", channel);
  if (after && Number.isFinite(Date.parse(after))) {
    query = query.gt("created_at", after).order("created_at", { ascending: true }).limit(200);
    const { data, error } = await query;
    if (error) return json({ error: "Run supabase/growth.sql to turn on chat." }, 500);
    return json({ messages: data || [] });
  }
  const { data, error } = await query.order("created_at", { ascending: false }).limit(100);
  if (error) return json({ error: "Run supabase/growth.sql to turn on chat." }, 500);
  return json({ messages: (data || []).reverse() });
}

export async function POST(request: Request) {
  try {
    return await postMessage(request);
  } catch {
    return json({ error: "Could not send. Try again." }, 500);
  }
}

async function postMessage(request: Request) {
  if (!sameOrigin(request)) return json({ error: "Bad origin" }, 403);
  const user = await currentUser();
  if (!user) return json({ error: "Sign in" }, 401);
  if (!can(user, "chat", "view")) return json({ error: "No access" }, 403);
  if (user.bootstrap) return json({ error: "Sign in with your own account to chat." }, 403);
  const raw = await request.text();
  if (raw.length > 6000) return json({ error: "Message too long" }, 413);
  let body: { channel?: string; body?: string };
  try {
    body = JSON.parse(raw);
  } catch {
    return json({ error: "Bad request" }, 400);
  }
  const text = String(body.body || "").trim().slice(0, 4000);
  if (!text) return json({ error: "Empty message" }, 400);
  const channel = channelOf(body.channel || null);
  const { data, error } = await admin()
    .from("chat_messages")
    .insert({ channel, user_id: user.id, user_name: user.name || user.email, body: text })
    .select("id, channel, user_id, user_name, body, created_at")
    .single();
  if (error) return json({ error: "Could not send." }, 500);

  // @First or @"Full Name" mentions notify that person.
  if (text.includes("@")) {
    const people = await staffDirectory().catch(() => []);
    const lower = text.toLowerCase();
    for (const person of people) {
      if (person.id === user.id) continue;
      const first = person.name.split(" ")[0].toLowerCase();
      if (lower.includes(`@${person.name.toLowerCase()}`) || new RegExp(`@${first.replace(/[^a-z0-9]/g, "")}\\b`).test(lower)) {
        await notify(person.id, { kind: "mention", body: `${user.name} mentioned you in #${channel}: ${text.slice(0, 140)}`, link: `/dashboard/chat?channel=${channel}` });
      }
    }
  }
  return json({ message: data });
}

export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return json({ error: "Bad origin" }, 403);
  const user = await currentUser();
  if (!user) return json({ error: "Sign in" }, 401);
  const id = new URL(request.url).searchParams.get("id") || "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return json({ error: "Bad id" }, 400);
  const { data } = await admin().from("chat_messages").select("user_id").eq("id", id).maybeSingle();
  if (!data) return json({ ok: true });
  if (data.user_id !== user.id && !can(user, "chat", "edit")) return json({ error: "No access" }, 403);
  await admin().from("chat_messages").delete().eq("id", id);
  if (data.user_id !== user.id) await logActivity(user, "chat", "Removed a chat message");
  return json({ ok: true });
}
