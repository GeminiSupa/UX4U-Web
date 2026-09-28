const COOKIE = "ux4u_session";

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

export async function sessionToken() {
  const expires = String(Date.now() + 1000 * 60 * 60 * 24 * 14);
  return `${expires}.${await sign(expires)}`;
}

export async function sessionValid(token: string | undefined) {
  if (!token || !secret()) return false;
  const [expires, signature] = token.split(".");
  if (!expires || !signature) return false;
  if (Number(expires) < Date.now()) return false;
  const expected = await sign(expires);
  if (expected.length !== signature.length) return false;
  let mismatch = 0;
  for (let index = 0; index < expected.length; index += 1) {
    mismatch |= expected.charCodeAt(index) ^ signature.charCodeAt(index);
  }
  return mismatch === 0;
}

export function passwordsMatch(input: string, expected: string) {
  if (!expected || input.length !== expected.length) return false;
  let mismatch = 0;
  for (let index = 0; index < expected.length; index += 1) {
    mismatch |= input.charCodeAt(index) ^ expected.charCodeAt(index);
  }
  return mismatch === 0;
}

export const SESSION_COOKIE = COOKIE;
