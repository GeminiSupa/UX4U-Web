"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/lib/actions";
import { RunningTimer } from "@/components/RunningTimer";

export type DeskLink = { href: string; label: string; child?: boolean };

export function Desk({
  children,
  links,
  who,
  unread = 0,
  timer = null
}: {
  children: React.ReactNode;
  links: DeskLink[];
  who: { name: string; role: string; setup: boolean };
  unread?: number;
  timer?: { startedAt: string; title: string } | null;
}) {
  const path = usePathname();
  const active = (href: string) => (href === "/dashboard" ? path === href : path === href || path.startsWith(`${href}/`));
  return (
    <div className="min-h-screen bg-[#f6f4ef] text-ink lg:grid lg:grid-cols-[220px_minmax(0,1fr)]">
      <aside className="flex flex-col bg-ink text-paper lg:sticky lg:top-0 lg:h-screen">
        <div className="flex items-center justify-between px-5 py-5">
          <div>
            <img src="/logo-on-dark.png" alt="UX4U" className="h-7 w-auto" />
            <p className="mt-1 text-sm text-paper/60">Studio desk</p>
          </div>
          {!who.setup ? (
            <Link
              href="/dashboard/notifications"
              className={`relative rounded-full p-2 hover:bg-white/10 ${active("/dashboard/notifications") ? "text-lime" : "text-paper/75"}`}
              aria-label={unread ? `${unread} unread notifications` : "Notifications"}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
              </svg>
              {unread ? (
                <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-lime px-1 text-[10px] font-semibold text-ink">
                  {unread > 99 ? "99+" : unread}
                </span>
              ) : null}
            </Link>
          ) : null}
        </div>
        {timer ? (
          <div className="px-3 pb-3">
            <RunningTimer startedAt={timer.startedAt} title={timer.title} />
          </div>
        ) : null}
        <nav className="flex gap-1 overflow-x-auto px-3 pb-4 lg:block lg:min-h-0 lg:flex-1 lg:space-y-1 lg:overflow-y-auto">
          {links.map(({ href, label, child }) => (
            <Link
              key={href}
              href={href}
              className={`block whitespace-nowrap rounded px-3 py-2 text-sm ${child ? "lg:ml-3 lg:py-1.5 lg:text-xs" : ""} ${
                active(href) ? "bg-white/10 text-lime" : "text-paper/75 hover:bg-white/5"
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="flex flex-wrap gap-5 px-5 pb-4 text-sm text-paper/70 lg:block lg:space-y-3 lg:py-5">
          <Link href="/dashboard/account" className={`block ${active("/dashboard/account") ? "text-lime" : "hover:text-paper"}`}>
            <span className="block text-paper">{who.name}</span>
            <span className="block text-xs text-paper/50">{who.setup ? "Setup sign-in" : who.role === "owner" ? "Owner" : "Member"} · Account</span>
          </Link>
          <Link href="/" className="block text-sm text-paper/60 hover:text-paper">
            View the site
          </Link>
          <form action={logout}>
            <button className="text-sm text-paper/60 hover:text-paper" type="submit">
              Sign out
            </button>
          </form>
        </div>
      </aside>
      <div className="min-w-0 px-4 py-6 sm:px-5 lg:px-8">{children}</div>
    </div>
  );
}
