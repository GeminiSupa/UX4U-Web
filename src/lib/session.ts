// Signed session cookie. Runs in middleware (edge) and on the server, so it only uses Web Crypto.
// Token: v2.<userId>.<sessionVersion>.<expiresMs>.<hmac>

const COOKIE = "ux4u_session";
const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 14;

export type SessionClaims = { userId: string; version: number; expires: number };

function secret() {
  return process.env.DASHBOARD_SECRET || process.env.DASHBOARD_PASSWORD || "";
}

function hex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function sign(value: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return hex(signature);
}

function sameText(a: string, b: string) {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let index = 0; index < a.length; index += 1) {
    mismatch |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return mismatch === 0;
}

export async function sessionToken(userId: string, version: number, now = Date.now()) {
  if (!secret()) throw new Error("Set DASHBOARD_SECRET before signing in.");
  if (!/^[A-Za-z0-9-]+$/.test(userId)) throw new Error("Bad user id");
  const payload = `v2.${userId}.${Math.trunc(version)}.${now + MAX_AGE_MS}`;
  return `${payload}.${await sign(payload)}`;
}

export async function readSession(token: string | undefined, now = Date.now()): Promise<SessionClaims | null> {
  if (!token || !secret()) return null;
  const parts = token.split(".");
  if (parts.length !== 5 || parts[0] !== "v2") return null;
  const [, userId, version, expires, signature] = parts;
  if (!userId || !/^\d+$/.test(version) || !/^\d+$/.test(expires)) return null;
  if (Number(expires) < now) return null;
  const expected = await sign(parts.slice(0, 4).join("."));
  if (!sameText(expected, signature)) return null;
  return { userId, version: Number(version), expires: Number(expires) };
}

export async function sessionValid(token: string | undefined) {
  return (await readSession(token)) !== null;
}

export function passwordsMatch(input: string, expected: string) {
  if (!expected) return false;
  return sameText(input, expected);
}

export async function sha256Hex(value: string) {
  return hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
}

export const SESSION_COOKIE = COOKIE;
export const SESSION_MAX_AGE_SECONDS = MAX_AGE_MS / 1000;
