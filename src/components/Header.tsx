"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const links = [
  ["Work", "/work"],
  ["Journal", "/blog"],
  ["Contact", "/contact"]
];

export function Header() {
  const path = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [path]);

  return (
    <header className="sticky top-0 z-20 border-b border-ink/10 bg-paper/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-5 sm:py-4">
        <Link href="/" className="text-sm font-semibold tracking-[0.18em]">
          UX4U
        </Link>
        <nav className="hidden items-center gap-6 text-sm sm:flex">
          {links.map(([label, href]) => (
            <Link key={href} href={href} className="text-ink/70 hover:text-ink">
              {label}
            </Link>
          ))}
          <Link href="/contact" className="rounded-full bg-ink px-4 py-2 text-paper">
            Start a project
          </Link>
        </nav>
        <button
          type="button"
          className="min-h-11 rounded-full border border-ink/15 px-4 text-sm sm:hidden"
          aria-expanded={open}
          aria-controls="site-menu"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? "Close" : "Menu"}
        </button>
      </div>
      {open ? (
        <nav id="site-menu" className="flex flex-col gap-1 border-t border-ink/10 px-4 py-3 sm:hidden">
          {links.map(([label, href]) => (
            <Link key={href} href={href} className="rounded-lg px-2 py-3 text-base text-ink/80">
              {label}
            </Link>
          ))}
          <Link href="/contact" className="mt-1 rounded-full bg-ink px-4 py-3 text-center text-sm text-paper">
            Start a project
          </Link>
        </nav>
      ) : null}
    </header>
  );
}
