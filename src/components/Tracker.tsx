"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

const SESSION_GAP_MS = 30 * 60 * 1000;

function randomId() {
  return Array.from(crypto.getRandomValues(new Uint8Array(12)), (byte) => byte.toString(36).padStart(2, "0")).join("").slice(0, 20);
}

function ids() {
  try {
    let visitor = localStorage.getItem("ux4u-vid");
    if (!visitor) {
      visitor = randomId();
      localStorage.setItem("ux4u-vid", visitor);
    }
    const now = Date.now();
    const stored = JSON.parse(sessionStorage.getItem("ux4u-sid") || "null") as { id: string; last: number } | null;
    const fresh = !stored || now - stored.last > SESSION_GAP_MS;
    const session = fresh ? randomId() : stored!.id;
    sessionStorage.setItem("ux4u-sid", JSON.stringify({ id: session, last: now }));
    return { visitor, session, fresh };
  } catch {
    return { visitor: randomId(), session: randomId(), fresh: true };
  }
}

function send(payload: Record<string, unknown>) {
  const body = JSON.stringify(payload);
  if (navigator.sendBeacon?.(`/api/track`, new Blob([body], { type: "application/json" }))) return;
  fetch("/api/track", { method: "POST", body, keepalive: true, headers: { "Content-Type": "application/json" } }).catch(() => undefined);
}

/** Sends one page view per route change, and a lead event when a form lands on ?sent=1. Only rendered after consent. */
export function Tracker() {
  const pathname = usePathname();
  const search = useSearchParams();
  const lastKey = useRef("");

  useEffect(() => {
    if (!pathname || pathname.startsWith("/dashboard")) return;
    const key = `${pathname}?${search.toString()}`;
    if (key === lastKey.current) return;
    lastKey.current = key;
    const { visitor, session, fresh } = ids();
    const utm = { s: search.get("utm_source") || "", m: search.get("utm_medium") || "", c: search.get("utm_campaign") || "" };
    const base = { p: pathname, v: visitor, s: session, u: utm, r: fresh ? document.referrer : "" };
    send({ ...base, t: "view" });
    if (search.get("sent") === "1") send({ ...base, t: "lead" });
  }, [pathname, search]);

  return null;
}
