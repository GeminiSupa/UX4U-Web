import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-ink/10">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-10 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <img src="/logo.png" alt="UX4U" className="h-8 w-auto" />
          <p className="mt-3 max-w-sm text-sm text-ink/70">
            Software, search, marketing, and the operations that keep a business running after the launch.
          </p>
        </div>
        <div className="text-sm">
          <a className="block hover:underline" href="mailto:info@ux4u.online">
            info@ux4u.online
          </a>
          <Link className="mt-2 block text-ink/60 hover:text-ink" href="/dashboard">
            Studio desk
          </Link>
        </div>
      </div>
    </footer>
  );
}
