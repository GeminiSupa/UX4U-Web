"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { sendInquiry } from "@/lib/actions";
import { SubmitButton } from "@/components/SubmitButton";

const STORAGE_KEY = "ux4u-lead-capture";
const SHOW_AFTER_MS = 14000;
const SCROLL_TRIGGER = 0.42;

export function LeadCapture() {
  const pathname = usePathname();
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (pathname?.startsWith("/dashboard") || pathname === "/contact") return;
    try {
      if (sessionStorage.getItem(STORAGE_KEY)) return;
    } catch {
      /* ignore */
    }

    let shown = false;
    const show = () => {
      if (shown) return;
      shown = true;
      setOpen(true);
      setArmed(true);
      try {
        sessionStorage.setItem(STORAGE_KEY, "1");
      } catch {
        /* ignore */
      }
    };

    const timer = window.setTimeout(show, SHOW_AFTER_MS);

    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (max > 0 && window.scrollY / max >= SCROLL_TRIGGER) show();
    };

    const onExit = (event: MouseEvent) => {
      if (event.clientY <= 8) show();
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("mouseout", onExit);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("mouseout", onExit);
    };
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!armed || !open) return null;

  return (
    <div className="lead-overlay" role="presentation" onClick={() => setOpen(false)}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="lead-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full border border-ink/10 text-ink/60 hover:bg-ink/5"
          aria-label="Close"
          onClick={() => setOpen(false)}
        >
          ×
        </button>
        <p className="text-xs uppercase tracking-[0.2em] text-moss">Project brief</p>
        <h2 id={titleId} className="mt-2 font-serif text-3xl leading-none text-ink">
          Tell us what you are building.
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-ink/70">
          Thirty seconds. We reply from info@ux4u.online with a clear next step — build, search, ads, or automation.
        </p>
        <form action={sendInquiry} className="mt-5 grid gap-3">
          <input type="hidden" name="next" value="/contact?sent=1" />
          <input type="hidden" name="service" value="Concept to launch" />
          <label className="text-sm">
            Name
            <input className="mt-1 w-full border border-ink/15 bg-white/80 px-3 py-2.5 text-sm" name="name" required autoFocus />
          </label>
          <label className="text-sm">
            Email
            <input className="mt-1 w-full border border-ink/15 bg-white/80 px-3 py-2.5 text-sm" name="email" type="email" required />
          </label>
          <label className="text-sm">
            Company <span className="text-ink/40">(optional)</span>
            <input className="mt-1 w-full border border-ink/15 bg-white/80 px-3 py-2.5 text-sm" name="company" />
          </label>
          <label className="text-sm">
            The situation
            <textarea
              className="mt-1 w-full border border-ink/15 bg-white/80 px-3 py-2.5 text-sm"
              name="message"
              rows={3}
              required
              placeholder="Concept, half-built product, or growth stuck after launch."
            />
          </label>
          <p className="text-xs text-ink/50">
            By sending you agree to our{" "}
            <Link href="/privacy" className="underline">
              Privacy Policy
            </Link>
            .
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <SubmitButton label="Start a project" pendingLabel="Sending" dark />
            <button type="button" className="text-sm text-ink/60 underline-offset-4 hover:underline" onClick={() => setOpen(false)}>
              Not now
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
