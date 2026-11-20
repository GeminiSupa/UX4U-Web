"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { MESSAGES, passwordProblem, permissionsFromEntries, type Role } from "./access";
import {
  getUserById,
  listUsers,
  INVITE_FLASH,
  logActivity,
  requireOwner,
  requireUser,
  startSession,
  usersReady
} from "./auth";
import { sha256Hex } from "./session";
import { admin } from "./supabase";

const INVITE_DAYS = 7;

function text(form: FormData, key: string, max = 200) {
  return String(form.get(key) || "").trim().slice(0, max);
}

function back(params: string): never {
  redirect(`/dashboard/users?${params}`);
}

function newToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Buffer.from(bytes).toString("base64url");
}

async function origin() {
  const list = await headers();
  const host = list.get("x-forwarded-host") || list.get("host") || "localhost:3000";
  const proto = list.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/** Stores a fresh invite on the user and shows the link once to the owner who made it. */
async function issueInvite(userId: string, name: string) {
  const token = newToken();
  const { error } = await admin()
    .from("admins")
    .update({
      invite_hash: await sha256Hex(token),
      invite_expires: new Date(Date.now() + INVITE_DAYS * 86400000).toISOString()
    })
    .eq("id", userId);
  if (error) return false;
  const jar = await cookies();
  jar.set(INVITE_FLASH, JSON.stringify({ name, link: `${await origin()}/dashboard/invite/${token}` }), {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/dashboard/users",
    maxAge: 60 * 10
  });
  return true;
}

async function activeOwnerCount(exceptId?: string) {
  const users = await listUsers();
  return users.filter((user) => user.role === "owner" && user.active && user.id !== exceptId).length;
}

function roleOf(form: FormData): Role {
  return form.get("role") === "owner" ? "owner" : "member";
}

export async function inviteUser(form: FormData) {
  const actor = await requireOwner();
  if (!(await usersReady())) back("error=setup");
  const email = text(form, "email").toLowerCase();
  const name = text(form, "name", 120);
  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) back("error=fields");
  const role = roleOf(form);
  const { data, error } = await admin()
    .from("admins")
    .insert({
      email,
      name,
      title: text(form, "title", 120),
      role,
      permissions: role === "owner" ? {} : permissionsFromEntries(form.entries()),
      active: true,
      password_hash: null
    })
    .select("id")
    .single();
  if (error || !data) back(error?.code === "23505" ? "error=taken" : "error=save");
  await issueInvite(String(data!.id), name);
  await logActivity(actor, "users", "Invited a person", `${name} (${role})`);
  back("invited=1");
}

export async function updateUser(form: FormData) {
  const actor = await requireOwner();
  const id = text(form, "id");
  const target = await getUserById(id);
  if (!target) back("error=missing");
  const role = roleOf(form);
  const active = form.get("active") === "on";
  const losingOwner = target!.role === "owner" && target!.active && (role !== "owner" || !active);
  if (losingOwner && (await activeOwnerCount(id)) === 0) back("error=last-owner");
  const { error } = await admin()
    .from("admins")
    .update({
      name: text(form, "name", 120) || target!.name,
      title: text(form, "title", 120),
      role,
      active,
      permissions: role === "owner" ? {} : permissionsFromEntries(form.entries())
    })
    .eq("id", id);
  if (error) back("error=save");
  await logActivity(actor, "users", "Changed access", `${target!.name}: ${role}${active ? "" : ", deactivated"}`);
  back("saved=1");
}

export async function reissueInvite(form: FormData) {
  const actor = await requireOwner();
  const target = await getUserById(text(form, "id"));
  if (!target) back("error=missing");
  if (!(await issueInvite(target!.id, target!.name))) back("error=save");
  await logActivity(actor, "users", "Created a new sign-in link", target!.name);
  back("invited=1");
}

export async function signOutEverywhere(form: FormData) {
  const actor = await requireOwner();
  const target = await getUserById(text(form, "id"));
  if (!target) back("error=missing");
  const { error } = await admin()
    .from("admins")
    .update({ session_version: target!.sessionVersion + 1 })
    .eq("id", target!.id);
  if (error) back("error=save");
  await logActivity(actor, "users", "Signed a person out everywhere", target!.name);
  if (target!.id === actor.id) redirect("/dashboard/login");
  back("saved=1");
}

export async function deleteUser(form: FormData) {
  const actor = await requireOwner();
  const target = await getUserById(text(form, "id"));
  if (!target) back("error=missing");
  if (target!.id === actor.id) back("error=self");
  if (target!.role === "owner" && (await activeOwnerCount(target!.id)) === 0) back("error=last-owner");
  const { error } = await admin().from("admins").delete().eq("id", target!.id);
  if (error) back("error=save");
  await logActivity(actor, "users", "Removed a person", target!.name);
  back("saved=1");
}

export async function acceptInvite(form: FormData) {
  const token = text(form, "token", 100);
  const password = String(form.get("password") || "");
  const problem = passwordProblem(password, String(form.get("confirm") || ""));
  const fail = (reason: string): never => redirect(`/dashboard/invite/${encodeURIComponent(token)}?error=${encodeURIComponent(reason)}`);
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(token)) fail(MESSAGES.badLink);
  if (problem) fail(problem);
  const { data } = await admin()
    .from("admins")
    .select("id, active, invite_expires")
    .eq("invite_hash", await sha256Hex(token))
    .maybeSingle();
  if (!data || !data.active || !data.invite_expires || Date.parse(String(data.invite_expires)) < Date.now()) {
    fail(MESSAGES.expired);
  }
  const { data: version, error } = await admin().rpc("staff_set_password", { p_id: data!.id, p_password: password });
  if (error || !version) fail(MESSAGES.saveFailed);
  const user = await getUserById(String(data!.id));
  if (!user) fail(MESSAGES.signInFailed);
  await admin().from("admins").update({ last_login_at: new Date().toISOString() }).eq("id", user!.id);
  await startSession(user!.id, user!.sessionVersion);
  await logActivity(user!, "account", "Set a password and signed in");
  redirect("/dashboard");
}

export async function updateProfile(form: FormData) {
  const user = await requireUser();
  if (user.bootstrap) redirect("/dashboard/account?error=setup");
  const name = text(form, "name", 120);
  if (!name) redirect("/dashboard/account?error=name");
  await admin().from("admins").update({ name, title: text(form, "title", 120) }).eq("id", user.id);
  await logActivity(user, "account", "Updated their profile");
  redirect("/dashboard/account?saved=profile");
}

export async function changePassword(form: FormData) {
  const user = await requireUser();
  if (user.bootstrap) redirect("/dashboard/account?error=setup");
  const current = String(form.get("current") || "");
  const next = String(form.get("password") || "");
  const problem = passwordProblem(next, String(form.get("confirm") || ""));
  if (problem) redirect(`/dashboard/account?error=${encodeURIComponent(problem)}`);
  const { data: ok } = await admin().rpc("staff_check_password", { p_id: user.id, p_password: current });
  if (ok !== true) redirect(`/dashboard/account?error=${encodeURIComponent(MESSAGES.wrongCurrent)}`);
  const { data: version, error } = await admin().rpc("staff_set_password", { p_id: user.id, p_password: next });
  if (error || !version) redirect(`/dashboard/account?error=${encodeURIComponent(MESSAGES.saveFailed)}`);
  // Other devices hold the old session version and are signed out; this one gets a fresh cookie.
  await startSession(user.id, Number(version));
  await logActivity(user, "account", "Changed their password");
  redirect("/dashboard/account?saved=password");
}
