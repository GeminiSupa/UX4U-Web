import Link from "next/link";

const links = [
  ["Work", "/work"],
  ["Journal", "/blog"],
  ["Contact", "/contact"]
];

export function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-ink/10 bg-paper/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <Link href="/" className="text-sm font-semibold tracking-[0.18em]">
          UX4U
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          {links.map(([label, href]) => (
            <Link key={href} href={href} className="hidden text-ink/70 hover:text-ink sm:inline">
              {label}
            </Link>
          ))}
          <Link href="/contact" className="rounded-full bg-ink px-4 py-2 text-paper">
            Start a project
          </Link>
        </nav>
      </div>
    </header>
  );
}
