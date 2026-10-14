"use client";

import { useEffect, useState } from "react";
import { services } from "@/lib/content";

const items = services.map(([name]) => name);

export function MarqueeBanner() {
  const [paused, setPaused] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduceMotion(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  if (reduceMotion) {
    return (
      <div className="border-b border-ink/10 bg-lime/80">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-6 gap-y-2 px-4 py-2.5 text-[11px] uppercase tracking-[0.2em] text-ink sm:text-xs sm:tracking-[0.22em]">
          {items.map((name) => (
            <span key={name} className="shrink-0">
              {name}
            </span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="group relative border-b border-ink/10 bg-lime/80">
      <div
        className="marquee overflow-hidden py-2.5"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            setPaused(false);
          }
        }}
      >
        <div
          className={`marquee-track flex w-max gap-10 px-6 text-[11px] uppercase tracking-[0.2em] text-ink sm:text-xs sm:tracking-[0.22em] ${paused ? "marquee-paused" : ""}`}
        >
          <div className="flex shrink-0 gap-10">
            {items.map((name) => (
              <span key={`a-${name}`} className="shrink-0">
                {name}
              </span>
            ))}
          </div>
          <div className="flex shrink-0 gap-10" aria-hidden="true">
            {items.map((name) => (
              <span key={`b-${name}`} className="shrink-0">
                {name}
              </span>
            ))}
          </div>
        </div>
      </div>
      <button
        type="button"
        className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full border border-ink/15 bg-paper/90 px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-ink/70 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
        aria-pressed={paused}
        onClick={() => setPaused((value) => !value)}
      >
        {paused ? "Play" : "Pause"}
      </button>
    </div>
  );
}
