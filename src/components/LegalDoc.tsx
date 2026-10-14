import type { ReactNode } from "react";
import { SiteChrome } from "@/components/SiteChrome";

export function LegalDoc({
  eyebrow,
  title,
  updated,
  children
}: {
  eyebrow: string;
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <SiteChrome>
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-5 sm:py-14">
        <p className="text-xs uppercase tracking-[0.22em] text-moss">{eyebrow}</p>
        <h1 className="display mt-4 text-4xl sm:text-5xl">{title}</h1>
        <p className="mt-3 text-sm text-ink/55">Last updated {updated}</p>
        <div className="legal-prose mt-10 space-y-8 text-sm leading-relaxed text-ink/80">{children}</div>
      </main>
    </SiteChrome>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="font-serif text-2xl text-ink">{title}</h2>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}
