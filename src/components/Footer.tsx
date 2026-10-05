import Link from "next/link";
import { SOCIAL_PROFILES } from "@/lib/site";

const nav = [
  ["Work", "/work"],
  ["Journal", "/blog"],
  ["Services", "/services"],
  ["Contact", "/contact"]
];

export function Footer() {
  return (
    <footer className="border-t border-ink/10">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-10 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <img src="/logo.png" alt="UX4U" className="h-8 w-auto" />
          <p className="mt-3 max-w-sm text-sm text-ink/70">
            Software, search, marketing, and the operations that keep a business running after the launch.
          </p>
          <nav className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm">
            {nav.map(([label, href]) => (
              <Link key={href} href={href} className="text-ink/70 hover:text-ink hover:underline">
                {label}
              </Link>
            ))}
          </nav>
          <p className="mt-3 text-sm text-ink/60">Islamabad, Pakistan</p>
        </div>
        <div className="text-sm">
          <a className="block hover:underline" href="mailto:info@ux4u.online">
            info@ux4u.online
          </a>
          {/* TODO(owner): WhatsApp via WHATSAPP in lib/site.ts */}
          {SOCIAL_PROFILES.length ? (
            <div className="mt-3 flex flex-col gap-1">
              {SOCIAL_PROFILES.map((url) => (
                <a key={url} href={url} className="text-ink/60 hover:text-ink hover:underline" target="_blank" rel="noopener noreferrer">
                  {url.replace(/^https?:\/\//, "")}
                </a>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </footer>
  );
}
