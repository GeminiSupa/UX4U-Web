"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/lib/actions";

const links = [
  ["/dashboard", "Overview"],
  ["/dashboard/team", "Team"],
  ["/dashboard/projects", "Projects"],
  ["/dashboard/offers", "Offers"],
  ["/dashboard/posts", "Journal"],
  ["/dashboard/leads", "Leads"],
  ["/dashboard/inquiries", "Inquiries"]
];

export function Desk({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  return (
    <div className="min-h-screen bg-[#f6f4ef] text-ink lg:grid lg:grid-cols-[220px_1fr]">
      <aside className="flex flex-col bg-ink text-paper lg:min-h-screen">
        <div className="px-5 py-5">
          <img src="/logo-on-dark.png" alt="UX4U" className="h-7 w-auto" />
          <p className="mt-1 text-sm text-paper/60">Studio desk</p>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-4 lg:block lg:space-y-1">
          {links.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className={`block whitespace-nowrap rounded px-3 py-2 text-sm ${
                href === "/dashboard"
                  ? path === href
                    ? "bg-white/10 text-lime"
                    : "text-paper/75 hover:bg-white/5"
                  : path.startsWith(href)
                    ? "bg-white/10 text-lime"
                    : "text-paper/75 hover:bg-white/5"
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="flex gap-5 px-5 pb-4 text-sm text-paper/70 lg:mt-auto lg:block lg:space-y-3 lg:py-5">
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
      <div className="px-5 py-6 lg:px-8">{children}</div>
    </div>
  );
}
