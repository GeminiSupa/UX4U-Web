"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { failuresSinceSuccess, isLockedOut, LOCKOUT } from "./access";
import {
  BOOTSTRAP_ID,
  endSession,
  getUserById,
  logActivity,
  requireArea,
  setupMode,
  startSession,
  usersReady
} from "./auth";
import { passwordsMatch, sha256Hex } from "./session";
import { admin } from "./supabase";
import { storeImage } from "./storage";
import { externalLinks, parseUrls, scrapeWebsite } from "./scrape";
import type { MapPlace } from "./maps";

function text(form: FormData, key: string) {
  return String(form.get(key) || "").trim();
}

function checked(form: FormData, key: string) {
  return form.get(key) === "on";
}


function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

async function touch(paths: string[]) {
  paths.forEach((path) => revalidatePath(path));
}

/**
 * Setup sign-in: the shared DASHBOARD_PASSWORD, or (only before users.sql runs, when every
 * row in `admins` is an owner) the old single-admin check.
 */
async function setupPasswordOk(email: string, password: string, usersTableReady: boolean) {
  if (!password) return false;
  if (passwordsMatch(password, process.env.DASHBOARD_PASSWORD || "")) return true;
  if (usersTableReady || !email) return false;
  const { data, error } = await admin().rpc("admin_login", { p_email: email, p_password: password });
  return !error && data === true;
}

async function clientIpHash() {
  const list = await headers();
  const ip = (list.get("x-forwarded-for") || "").split(",")[0].trim() || list.get("x-real-ip") || "unknown";
  return sha256Hex(`${process.env.DASHBOARD_SECRET || ""}:${ip}`);
}

async function lockedOut(email: string, ipHash: string) {
  const since = new Date(Date.now() - LOCKOUT.windowMinutes * 60 * 1000).toISOString();
  const supabase = admin();
  const [byEmail, byIp] = await Promise.all([
    supabase
      .from("login_attempts")
      .select("success")
      .eq("email", email)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(LOCKOUT.perEmail + 1),
    supabase
      .from("login_attempts")
      .select("success")
      .eq("ip_hash", ipHash)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(LOCKOUT.perIp + 1)
  ]);
  return isLockedOut(failuresSinceSuccess(byEmail.data || []), failuresSinceSuccess(byIp.data || []));
}

async function recordAttempt(email: string, ipHash: string, success: boolean) {
  await admin().from("login_attempts").insert({ email, ip_hash: ipHash, success });
}

export async function login(form: FormData) {
  const email = text(form, "email").toLowerCase().slice(0, 200);
  const password = String(form.get("password") || "").slice(0, 200);

  const ready = await usersReady();
  const ipHash = await clientIpHash();
  if (ready && (await lockedOut(email, ipHash))) redirect("/dashboard/login?error=locked");

  if (await setupMode()) {
    const ok = await setupPasswordOk(email, password, ready);
    if (ready) await recordAttempt(email, ipHash, ok);
    if (!ok) redirect("/dashboard/login?error=1");
    await startSession(BOOTSTRAP_ID, 1);
    redirect("/dashboard/users");
  }

  const { data, error } = await admin().rpc("staff_login", { p_email: email, p_password: password });
  const user = !error && data ? await getUserById(String(data)) : null;
  await recordAttempt(email, ipHash, Boolean(user));
  if (!user || !user.active) redirect("/dashboard/login?error=1");

  await admin().from("admins").update({ last_login_at: new Date().toISOString() }).eq("id", user.id);
  await startSession(user.id, user.sessionVersion);
  await logActivity(user, "account", "Signed in");
  redirect("/dashboard");
}

export async function logout() {
  await endSession();
  redirect("/dashboard/login");
}

export async function saveTeam(form: FormData) {
  const user = await requireArea("team", "edit");
  const id = text(form, "id");
  let photo_url = text(form, "photo_url");
  try {
    const uploaded = await storeImage(form.get("photo"), "team");
    if (uploaded) photo_url = uploaded;
  } catch {
    redirect("/dashboard/team?error=1");
  }
  const row: Record<string, string | number | boolean> = {
    name: text(form, "name"),
    role: text(form, "role"),
    bio: text(form, "bio"),
    sort_order: Number(text(form, "sort_order") || "0"),
    published: checked(form, "published")
  };
  if (photo_url) row.photo_url = photo_url;
  if (!row.name || !row.role) redirect("/dashboard/team?error=1");
  const supabase = admin();
  const result = id
    ? await supabase.from("team_members").update(row).eq("id", id)
    : await supabase.from("team_members").insert(row);
  if (result.error) redirect("/dashboard/team?error=1");
  await logActivity(user, "team", id ? "Updated a team member" : "Added a team member", String(row.name));
  await touch(["/", "/dashboard/team"]);
  redirect("/dashboard/team");
}

export async function deleteTeam(form: FormData) {
  const user = await requireArea("team", "edit");
  await logActivity(user, "team", "Removed a team member");
  await admin().from("team_members").delete().eq("id", text(form, "id"));
  await touch(["/", "/dashboard/team"]);
  redirect("/dashboard/team");
}

export async function saveProject(form: FormData) {
  const user = await requireArea("projects", "edit");
  const id = text(form, "id");
  let image_url = text(form, "image_url");
  try {
    const uploaded = await storeImage(form.get("image"), "work");
    if (uploaded) image_url = uploaded;
  } catch {
    redirect("/dashboard/projects?error=1");
  }
  const row = {
    name: text(form, "name"),
    url: text(form, "url"),
    summary: text(form, "summary"),
    features: text(form, "features"),
    services: text(form, "services"),
    image_url,
    sort_order: Number(text(form, "sort_order") || "0"),
    published: checked(form, "published")
  };
  if (!row.name || !row.url) redirect("/dashboard/projects?error=1");
  const supabase = admin();
  const result = id
    ? await supabase.from("projects").update(row).eq("id", id)
    : await supabase.from("projects").insert(row);
  if (result.error) redirect("/dashboard/projects?error=1");
  await logActivity(user, "projects", id ? "Updated a project" : "Added a project", row.name);
  await touch(["/", "/work", "/dashboard/projects"]);
  redirect("/dashboard/projects");
}

export async function deleteProject(form: FormData) {
  const user = await requireArea("projects", "edit");
  await logActivity(user, "projects", "Removed a project");
  await admin().from("projects").delete().eq("id", text(form, "id"));
  await touch(["/", "/work", "/dashboard/projects"]);
  redirect("/dashboard/projects");
}

export async function saveOffer(form: FormData) {
  const user = await requireArea("offers", "edit");
  const id = text(form, "id");
  const row = {
    name: text(form, "name"),
    summary: text(form, "summary"),
    points: text(form, "points"),
    sort_order: Number(text(form, "sort_order") || "0"),
    published: checked(form, "published")
  };
  if (!row.name) redirect("/dashboard/offers?error=1");
  const supabase = admin();
  const result = id
    ? await supabase.from("offers").update(row).eq("id", id)
    : await supabase.from("offers").insert(row);
  if (result.error) redirect("/dashboard/offers?error=1");
  await logActivity(user, "offers", id ? "Updated an offer" : "Added an offer", row.name);
  await touch(["/", "/dashboard/offers"]);
  redirect("/dashboard/offers");
}

export async function deleteOffer(form: FormData) {
  const user = await requireArea("offers", "edit");
  await logActivity(user, "offers", "Removed an offer");
  await admin().from("offers").delete().eq("id", text(form, "id"));
  await touch(["/", "/dashboard/offers"]);
  redirect("/dashboard/offers");
}

export async function savePost(form: FormData) {
  const user = await requireArea("posts", "edit");
  const id = text(form, "id");
  const title = text(form, "title");
  const row = {
    title,
    slug: slugify(text(form, "slug") || title),
    excerpt: text(form, "excerpt"),
    body: text(form, "body"),
    published: checked(form, "published")
  };
  if (!row.title || !row.slug) redirect("/dashboard/posts?error=1");
  const supabase = admin();
  const result = id
    ? await supabase.from("posts").update(row).eq("id", id)
    : await supabase.from("posts").insert(row);
  if (result.error) redirect("/dashboard/posts?error=1");
  await logActivity(user, "posts", id ? "Updated a post" : "Added a post", row.title);
  await touch(["/", "/blog", `/blog/${row.slug}`, "/dashboard/posts"]);
  redirect("/dashboard/posts");
}

export async function deletePost(form: FormData) {
  const user = await requireArea("posts", "edit");
  await logActivity(user, "posts", "Removed a post");
  await admin().from("posts").delete().eq("id", text(form, "id"));
  await touch(["/", "/blog", "/dashboard/posts"]);
  redirect("/dashboard/posts");
}

function safeNextPath(raw: string) {
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.includes("://")) return "/contact?sent=1";
  return raw;
}

export async function sendInquiry(form: FormData) {
  const next = safeNextPath(text(form, "next") || "/contact?sent=1");
  const fail = next.includes("?") ? `${next.split("?")[0]}?error=1` : "/contact?error=1";
  const row = {
    name: text(form, "name"),
    email: text(form, "email"),
    company: text(form, "company"),
    service: text(form, "service") || "Concept to launch",
    message: text(form, "message")
  };
  if (row.name.length < 2 || !row.email.includes("@") || row.message.length < 2) {
    redirect(fail);
  }
  const { error } = await admin().from("inquiries").insert(row);
  if (error) redirect(fail);
  redirect(next.includes("sent=") ? next : next.includes("?") ? `${next}&sent=1` : `${next}?sent=1`);
}

export async function collectLeads(form: FormData) {
  const user = await requireArea("leads", "edit");
  const direct = parseUrls(text(form, "urls")).slice(0, 4);
  const directory = text(form, "directory");
  let urls = direct;
  if (directory) {
    try {
      const linked = await externalLinks(directory, 4);
      urls = Array.from(new Set([...direct, ...linked])).slice(0, 4);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not read the directory";
      redirect(`/dashboard/leads?error=${encodeURIComponent(message)}`);
    }
  }
  if (!urls.length) redirect("/dashboard/leads?error=Add%20at%20least%20one%20website");

  const city = text(form, "city");
  const category = text(form, "category");
  const rows = [];
  for (const url of urls) {
    const lead = await scrapeWebsite(url, 3);
    rows.push({ ...lead, city, category });
  }
  const { error } = await admin().from("leads").insert(rows);
  if (error) redirect(`/dashboard/leads?error=${encodeURIComponent(error.message)}`);
  await logActivity(user, "leads", "Collected leads from websites", `${rows.length} rows`);
  redirect("/dashboard/leads?saved=1");
}

export async function saveMapLeads(form: FormData) {
  const user = await requireArea("leads", "edit");
  const picked = new Set(form.getAll("pick").map((value) => String(value)));
  const readSites = form.get("readSites") === "on";
  const rows = [];
  let reads = 0;
  for (const raw of form.getAll("place")) {
    let place: MapPlace;
    try {
      place = JSON.parse(String(raw)) as MapPlace;
    } catch {
      continue;
    }
    if (!picked.has(place.id)) continue;
    let emails = place.emails;
    let phones = place.phones;
    let whatsapp = "";
    let contact_name = "";
    let notes = place.address ? `OpenStreetMap. ${place.address}` : "OpenStreetMap listing";
    if (readSites && place.website && reads < 4) {
      reads += 1;
      const scraped = await scrapeWebsite(place.website, 2);
      if (scraped.emails) emails = scraped.emails;
      if (scraped.phones) phones = [phones, scraped.phones].filter(Boolean).join("; ");
      whatsapp = scraped.whatsapp;
      contact_name = scraped.contact_name;
      if (scraped.notes) notes = `${notes}. ${scraped.notes}`;
    }
    rows.push({
      business_name: place.business_name,
      website: place.website,
      emails,
      phones,
      whatsapp,
      contact_name,
      city: place.city,
      category: place.category,
      source_url: place.source_url,
      notes
    });
  }
  if (!rows.length) redirect("/dashboard/leads?error=Choose%20at%20least%20one%20listing");
  const { error } = await admin().from("leads").insert(rows);
  const next = text(form, "next");
  const dest = next.startsWith("/dashboard/") && !next.includes("//") ? next : "/dashboard/leads";
  if (error) redirect(`${dest}${dest.includes("?") ? "&" : "?"}error=${encodeURIComponent(error.message)}`);
  await logActivity(user, "leads", "Saved map listings to leads", `${rows.length} rows`);
  redirect(`${dest}${dest.includes("?") ? "&" : "?"}saved=${rows.length}`);
}

export async function updateLead(form: FormData) {
  const user = await requireArea("leads", "edit");
  const { error } = await admin()
    .from("leads")
    .update({
      business_name: text(form, "business_name"),
      city: text(form, "city"),
      website: text(form, "website"),
      emails: text(form, "emails"),
      phones: text(form, "phones"),
      contact_name: text(form, "contact_name"),
      current_pos: text(form, "current_pos"),
      contacted: text(form, "contacted") === "yes"
    })
    .eq("id", text(form, "id"));
  if (error) {
    redirect(`/dashboard/leads?error=${encodeURIComponent("Run the outreach SQL once, then save this row again.")}`);
  }
  await logActivity(user, "leads", "Updated a lead", text(form, "business_name"));
  redirect("/dashboard/leads");
}

export async function deleteLead(form: FormData) {
  const user = await requireArea("leads", "edit");
  await logActivity(user, "leads", "Removed a lead");
  await admin().from("leads").delete().eq("id", text(form, "id"));
  await touch(["/dashboard/leads"]);
  redirect("/dashboard/leads");
}
