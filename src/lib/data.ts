import "server-only";
import {
  projectSlug,
  seedOffers,
  seedPosts,
  seedProjects,
  seedTeam,
  sortProjects,
  type Offer,
  type Post,
  type Project,
  type TeamMember
} from "./content";
import { admin } from "./supabase";

type Ready<T> = { rows: T[]; ready: boolean };

function asText(value: unknown) {
  return typeof value === "string" ? value : "";
}

function mapTeam(row: Record<string, unknown>): TeamMember {
  return {
    id: String(row.id),
    name: asText(row.name),
    role: asText(row.role),
    bio: asText(row.bio),
    photo_url: asText(row.photo_url),
    profile_url: asText(row.profile_url) || undefined,
    sort_order: Number(row.sort_order) || 0,
    published: Boolean(row.published)
  };
}

function enrichProject(partial: Omit<Project, "slug" | "image_alt"> & { slug?: string; image_alt?: string }): Project {
  const seed = seedProjects.find(
    (item) => item.name === partial.name || item.url === partial.url || item.slug === partial.slug
  );
  const slug = partial.slug || seed?.slug || projectSlug(partial.name, partial.url);
  return {
    ...partial,
    slug,
    image_alt: partial.image_alt || seed?.image_alt || `${partial.name} homepage`,
    challenge: partial.challenge ?? seed?.challenge,
    result: partial.result ?? seed?.result,
    quote: partial.quote ?? seed?.quote
  };
}

function mapProject(row: Record<string, unknown>): Project {
  return enrichProject({
    id: String(row.id),
    name: asText(row.name),
    url: asText(row.url),
    summary: asText(row.summary),
    features: asText(row.features),
    services: asText(row.services),
    image_url: asText(row.image_url),
    sort_order: Number(row.sort_order) || 0,
    published: Boolean(row.published)
  });
}

function mapOffer(row: Record<string, unknown>): Offer {
  return {
    id: String(row.id),
    name: asText(row.name),
    summary: asText(row.summary),
    points: asText(row.points),
    sort_order: Number(row.sort_order) || 0,
    published: Boolean(row.published)
  };
}

function mapPost(row: Record<string, unknown>): Post {
  return {
    id: String(row.id),
    title: asText(row.title),
    slug: asText(row.slug),
    excerpt: asText(row.excerpt),
    body: asText(row.body),
    published: Boolean(row.published),
    created_at: asText(row.created_at)
  };
}

async function readTable<T>(
  table: string,
  map: (row: Record<string, unknown>) => T,
  fallback: T[],
  publishedOnly: boolean
): Promise<Ready<T>> {
  try {
    const supabase = admin();
    let query = supabase.from(table).select("*");
    if (publishedOnly) query = query.eq("published", true);
    if (table !== "posts") query = query.order("sort_order", { ascending: true });
    else query = query.order("created_at", { ascending: false });
    const { data, error } = await query;
    if (error) return { rows: fallback, ready: false };
    return { rows: ((data || []) as Record<string, unknown>[]).map(map), ready: true };
  } catch {
    return { rows: fallback, ready: false };
  }
}

export async function databaseReady() {
  try {
    const { error } = await admin().from("site_settings").select("id").limit(1);
    return !error;
  } catch {
    return false;
  }
}

async function fillIfEmpty(
  table: string,
  rows: Record<string, unknown>[]
) {
  const supabase = admin();
  const existing = await supabase.from(table).select("id", { count: "exact", head: true });
  if (existing.error) return existing.error.message;
  if ((existing.count || 0) > 0) return "";
  const inserted = await supabase.from(table).insert(rows);
  return inserted.error?.message || "";
}

export async function ensureSeed() {
  const supabase = admin();
  const settings = await supabase.from("site_settings").select("seeded").eq("id", 1).maybeSingle();
  if (settings.error) return false;
  if (settings.data?.seeded) return true;

  const withoutId = <T extends { id: string }>(rows: T[]) => rows.map(({ id: _id, ...row }) => row);
  const projectRows = seedProjects.map(
    ({ id: _id, slug: _slug, image_alt: _alt, challenge: _c, result: _r, quote: _q, ...row }) => row
  );
  const problems = await Promise.all([
    fillIfEmpty("team_members", withoutId(seedTeam)),
    fillIfEmpty("projects", projectRows),
    fillIfEmpty("offers", withoutId(seedOffers)),
    fillIfEmpty("posts", withoutId(seedPosts))
  ]);
  if (problems.some(Boolean)) return false;
  await supabase.from("site_settings").upsert({ id: 1, seeded: true });
  return true;
}

export async function getTeam(publishedOnly = true) {
  const result = await readTable("team_members", mapTeam, seedTeam, publishedOnly);
  return result.ready ? result.rows.filter((row) => (publishedOnly ? row.published : true)) : seedTeam;
}

export async function getProjects(publishedOnly = true) {
  const result = await readTable("projects", mapProject, seedProjects, publishedOnly);
  const rows = result.ready ? result.rows.map((row) => enrichProject(row)) : seedProjects;
  return sortProjects(rows);
}

export async function getProject(slug: string) {
  const projects = await getProjects(true);
  return projects.find((project) => project.slug === slug) || null;
}

export async function getOffers(publishedOnly = true) {
  const result = await readTable("offers", mapOffer, seedOffers, publishedOnly);
  return result.ready ? result.rows : seedOffers;
}

export async function getPosts(publishedOnly = true) {
  const result = await readTable("posts", mapPost, seedPosts, publishedOnly);
  return result.ready ? result.rows : seedPosts;
}

export async function getPost(slug: string) {
  const posts = await getPosts(true);
  return posts.find((post) => post.slug === slug) || null;
}

export type Inquiry = {
  id: string;
  name: string;
  email: string;
  company: string;
  service: string;
  message: string;
  created_at: string;
};

export type Lead = {
  id: string;
  business_name: string;
  website: string;
  emails: string;
  phones: string;
  whatsapp: string;
  contact_name: string;
  city: string;
  category: string;
  source_url: string;
  notes: string;
  current_pos: string;
  contacted: boolean;
  created_at: string;
};

export async function getInquiries(): Promise<Inquiry[]> {
  const { data, error } = await admin().from("inquiries").select("*").order("created_at", { ascending: false }).limit(200);
  if (error || !data) return [];
  return data as Inquiry[];
}

export async function getLeads(): Promise<Lead[]> {
  const { data, error } = await admin().from("leads").select("*").order("created_at", { ascending: false }).limit(500);
  if (error || !data) return [];
  return data as Lead[];
}
