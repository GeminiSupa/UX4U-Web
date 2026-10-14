"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { type ConsentState, readConsent, writeConsent } from "@/lib/consent";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(!readConsent());
  }, []);

  function choose(accepted: boolean) {
    writeConsent(accepted ? "accepted" : "rejected");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Analytics preference"
      className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-50 mx-auto max-w-lg border border-ink/15 bg-paper p-4 shadow-[0_20px_50px_-24px_rgba(22,24,21,0.55)] sm:inset-x-auto sm:bottom-6 sm:left-6 sm:right-auto sm:p-5"
    >
      <p className="text-sm leading-relaxed text-ink/80">
        We use privacy-friendly analytics (page paths, referrer, device type — no ads, no cross-site
        profiles) only if you allow it. Essential cookies for the dashboard login are always on.{" "}
        <Link href="/privacy" className="underline">
          Privacy
        </Link>
        {" · "}
        <Link href="/terms" className="underline">
          Terms
        </Link>
      </p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          className="rounded-full bg-ink px-4 py-2.5 text-sm text-paper"
          onClick={() => choose(true)}
        >
          Allow analytics
        </button>
        <button
          type="button"
          className="rounded-full border border-ink/20 px-4 py-2.5 text-sm text-ink/80"
          onClick={() => choose(false)}
        >
          Essential only
        </button>
      </div>
    </div>
  );
}

export function ConsentAnalytics({ children }: { children: (allowed: boolean) => ReactNode }) {
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const apply = (state: ConsentState | null) => setAllowed(Boolean(state?.analytics));
    apply(readConsent());
    const onChange = (event: Event) => apply((event as CustomEvent<ConsentState>).detail);
    window.addEventListener("ux4u-consent", onChange);
    return () => window.removeEventListener("ux4u-consent", onChange);
  }, []);

  return <>{children(allowed)}</>;
}
