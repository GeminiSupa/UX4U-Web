"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { passwordsMatch, SESSION_COOKIE, sessionToken } from "./session";
import { admin } from "./supabase";
import { externalLinks, parseUrls, scrapeWebsite } from "./scrape";
import type { MapPlace } from "./maps";

function text(form: FormData, key: string) {
  return String(form.get(key) || "").trim();
}

function checked(form: FormData, key: string) {
  return form.get(key) === "on";
}

async function storeImage(file: FormDataEntryValue | null, folder: string) {
  if (!(file instanceof File) || file.size === 0) return "";
  if (!file.type.startsWith("image/")) throw new Error("Use an image file");
  if (file.size > 5 * 1024 * 1024) throw new Error("Image must be under 5 MB");
  const extension = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${folder}/${crypto.randomUUID()}.${extension}`;
  const supabase = admin();
  const { error } = await supabase.storage.from("studio").upload(path, Buffer.from(await file.arrayBuffer()), {
    contentType: file.type,
    upsert: false
  });
  if (error) throw new Error(error.message);
  return supabase.storage.from("studio").getPublicUrl(path).data.publicUrl;
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

async function adminPasswordOk(email: string, password: string) {
  if (!email || !password) return false;
  const { data, error } = await admin().rpc("admin_login", {
    p_email: email,
    p_password: password
  });
  if (!error) return data === true;
  return passwordsMatch(password, process.env.DASHBOARD_PASSWORD || "");
}

export async function login(form: FormData) {
  const email = text(form, "email").toLowerCase();
  const password = text(form, "password");
  if (!(await adminPasswordOk(email, password))) {
    redirect("/dashboard/login?error=1");
  }
  const jar = await cookies();
  jar.set(SESSION_COOKIE, await sessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14
  });
  redirect("/dashboard");
}

export async function logout() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  redirect("/dashboard/login");
}

export async function saveTeam(form: FormData) {
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
  await touch(["/", "/dashboard/team"]);
  redirect("/dashboard/team");
}

export async function deleteTeam(form: FormData) {
  await admin().from("team_members").delete().eq("id", text(form, "id"));
  await touch(["/", "/dashboard/team"]);
  redirect("/dashboard/team");
}

export async function saveProject(form: FormData) {
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
  await touch(["/", "/work", "/dashboard/projects"]);
  redirect("/dashboard/projects");
}

export async function deleteProject(form: FormData) {
  await admin().from("projects").delete().eq("id", text(form, "id"));
  await touch(["/", "/work", "/dashboard/projects"]);
  redirect("/dashboard/projects");
}

export async function saveOffer(form: FormData) {
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
  await touch(["/", "/dashboard/offers"]);
  redirect("/dashboard/offers");
}

export async function deleteOffer(form: FormData) {
  await admin().from("offers").delete().eq("id", text(form, "id"));
  await touch(["/", "/dashboard/offers"]);
  redirect("/dashboard/offers");
}

export async function savePost(form: FormData) {
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
  await touch(["/", "/blog", `/blog/${row.slug}`, "/dashboard/posts"]);
  redirect("/dashboard/posts");
}

export async function deletePost(form: FormData) {
  await admin().from("posts").delete().eq("id", text(form, "id"));
  await touch(["/", "/blog", "/dashboard/posts"]);
  redirect("/dashboard/posts");
}

export async function sendInquiry(form: FormData) {
  const row = {
    name: text(form, "name"),
    email: text(form, "email"),
    company: text(form, "company"),
    service: text(form, "service"),
    message: text(form, "message")
  };
  if (row.name.length < 2 || !row.email.includes("@") || row.message.length < 2) {
    redirect("/contact?error=1");
  }
  const { error } = await admin().from("inquiries").insert(row);
  if (error) redirect("/contact?error=1");
  redirect("/contact?sent=1");
}

export async function collectLeads(form: FormData) {
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
  redirect("/dashboard/leads?saved=1");
}

export async function saveMapLeads(form: FormData) {
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
  redirect(`${dest}${dest.includes("?") ? "&" : "?"}saved=${rows.length}`);
}

export async function updateLead(form: FormData) {
  const { error } = await admin()
    .from("leads")
    .update({
      contact_name: text(form, "contact_name"),
      current_pos: text(form, "current_pos"),
      contacted: text(form, "contacted") === "yes"
    })
    .eq("id", text(form, "id"));
  if (error) {
    redirect(`/dashboard/leads?error=${encodeURIComponent("Run the outreach SQL once, then save this row again.")}`);
  }
  redirect("/dashboard/leads");
}

export async function deleteLead(form: FormData) {
  await admin().from("leads").delete().eq("id", text(form, "id"));
  await touch(["/dashboard/leads"]);
  redirect("/dashboard/leads");
}
