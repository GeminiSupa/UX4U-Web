import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  can,
  cleanPermissions,
  type Area,
  type Role,
  type StaffUser
} from "./access";
import { readSession, SESSION_COOKIE, SESSION_MAX_AGE_SECONDS, sessionToken } from "./session";
import { admin } from "./supabase";

export const BOOTSTRAP_ID = "bootstrap";
/** Short-lived cookie that shows a new invite link once to the owner who created it. */
export const INVITE_FLASH = "ux4u_invite_link";

const USER_COLUMNS =
  "id, email, name, title, role, permissions, active, session_version, last_login_at, invite_hash, invite_expires";

export function mapUser(row: Record<string, unknown>): StaffUser {
  const expires = row.invite_expires ? Date.parse(String(row.invite_expires)) : 0;
  return {
    id: String(row.id),
    email: String(row.email || ""),
    name: String(row.name || ""),
    title: String(row.title || ""),
    role: (row.role === "owner" ? "owner" : "member") as Role,
    permissions: cleanPermissions(row.permissions),
    active: row.active !== false,
    sessionVersion: Number(row.session_version) || 1,
    lastLoginAt: row.last_login_at ? String(row.last_login_at) : null,
    invitePending: Boolean(row.invite_hash) && expires > Date.now()
  };
}

/** True once supabase/users.sql has been run. */
export async function usersReady() {
  try {
    const { error } = await admin().from("admins").select("session_version").limit(1);
    return !error;
  } catch {
    return false;
  }
}

/** Setup mode: users.sql not run yet, or no active owner with a password exists. */
export const setupMode = cache(async () => {
  if (!(await usersReady())) return true;
  const { count, error } = await admin()
    .from("admins")
    .select("id", { count: "exact", head: true })
    .eq("role", "owner")
    .eq("active", true)
    .not("password_hash", "is", null);
  return !error && (count || 0) === 0;
});

export async function getUserById(id: string): Promise<StaffUser | null> {
  const { data, error } = await admin().from("admins").select(USER_COLUMNS).eq("id", id).maybeSingle();
  if (error || !data) return null;
  return mapUser(data);
}

export async function listUsers(): Promise<StaffUser[]> {
  const { data, error } = await admin()
    .from("admins")
    .select(USER_COLUMNS)
    .order("role", { ascending: false })
    .order("name", { ascending: true });
  if (error || !data) return [];
  return data.map(mapUser);
}

function bootstrapUser(): StaffUser {
  return {
    id: BOOTSTRAP_ID,
    email: "",
    name: "Owner",
    title: "Setup login",
    role: "owner",
    permissions: {},
    active: true,
    sessionVersion: 1,
    lastLoginAt: null,
    invitePending: false,
    bootstrap: true
  };
}

/** The signed-in person for this request, or null. Re-checked against the database on every request. */
export const currentUser = cache(async (): Promise<StaffUser | null> => {
  const jar = await cookies();
  const claims = await readSession(jar.get(SESSION_COOKIE)?.value);
  if (!claims) return null;
  if (claims.userId === BOOTSTRAP_ID) {
    // Setup sign-in only works until users.sql is in place and an owner account exists.
    return (await setupMode()) ? bootstrapUser() : null;
  }
  const user = await getUserById(claims.userId).catch(() => null);
  if (!user || !user.active || user.sessionVersion !== claims.version) return null;
  return user;
});

export async function requireUser() {
  const user = await currentUser();
  if (!user) redirect("/dashboard/login");
  return user;
}

export async function requireArea(area: Area, need: "view" | "edit") {
  const user = await requireUser();
  if (!can(user, area, need)) redirect(`/dashboard?denied=${area}`);
  return user;
}

export async function requireOwner() {
  const user = await requireUser();
  if (user.role !== "owner") redirect("/dashboard?denied=users");
  return user;
}

export async function startSession(userId: string, version: number) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, await sessionToken(userId, version), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS
  });
}

export async function endSession() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

/** Records who did what. Never blocks the action it describes. */
export async function logActivity(user: StaffUser, area: string, action: string, detail = "") {
  if (user.bootstrap) return;
  try {
    await admin()
      .from("activity_log")
      .insert({ actor_id: user.id, actor_name: user.name || user.email, area, action, detail: detail.slice(0, 500) });
  } catch {
    // Activity is a convenience; the change itself already succeeded.
  }
}

export type ActivityRow = {
  id: string;
  actor_name: string;
  area: string;
  action: string;
  detail: string;
  created_at: string;
};

export async function recentActivity(limit = 40): Promise<ActivityRow[]> {
  const { data, error } = await admin()
    .from("activity_log")
    .select("id, actor_name, area, action, detail, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data as ActivityRow[];
}
