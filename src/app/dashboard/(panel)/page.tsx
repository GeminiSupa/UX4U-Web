import Link from "next/link";
import { AREAS, can } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { databaseReady, ensureSeed, getInquiries, getLeads, getPosts, getProjects, getTeam } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function OverviewPage({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const user = await requireUser();
  const query = await searchParams;
  const ready = await databaseReady();
  if (ready && user.role === "owner") await ensureSeed().catch(() => false);
  const sees = (area: Parameters<typeof can>[1]) => can(user, area, "view");
  const none = Promise.resolve([] as unknown[]);
  const [team, projects, posts, leads, inquiries] = await Promise.all([
    sees("team") ? getTeam(false) : none,
    sees("projects") ? getProjects(false) : none,
    sees("posts") ? getPosts(false) : none,
    ready && sees("leads") ? getLeads() : none,
    ready && sees("inquiries") ? getInquiries() : none
  ]);

  const stats = (
    [
      ["team", "Team", team.length, "/dashboard/team"],
      ["projects", "Projects", projects.length, "/dashboard/projects"],
      ["posts", "Journal", posts.length, "/dashboard/posts"],
      ["leads", "Leads", leads.length, "/dashboard/leads"],
      ["inquiries", "Inquiries", inquiries.length, "/dashboard/inquiries"]
    ] as const
  ).filter(([area]) => sees(area));
  const deniedLabel =
    query.denied === "users" ? "People & access" : AREAS.find((area) => area.id === query.denied)?.label || "";

  return (
    <div>
      <h1 className="font-serif text-4xl">Hello{user.name ? `, ${user.name.split(" ")[0]}` : ""}</h1>
      <p className="mt-2 max-w-xl text-sm text-ink/65">
        The public site reads what you publish here. Leads are private and stay in this desk.
      </p>
      {deniedLabel ? (
        <p className="mt-4 border border-amber-800/20 bg-amber-50 px-4 py-3 text-sm">
          You do not have access to {deniedLabel}, or only have view access. Ask an owner if you need it.
        </p>
      ) : null}
      {!ready && user.role === "owner" ? (
        <p className="mt-6 border border-amber-800/20 bg-amber-50 px-4 py-3 text-sm">
          The database tables are not in Supabase yet. Open the SQL editor for this project and run the file
          supabase/schema.sql. The public site is using the built-in studio copy until then.
        </p>
      ) : null}
      {stats.length ? (
        <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {stats.map(([area, label, count, href]) => (
            <Link key={area} href={href} className="border border-ink/10 bg-white px-4 py-4">
              <p className="text-xs uppercase tracking-[0.14em] text-ink/45">{label}</p>
              <p className="mt-2 font-serif text-4xl">{count}</p>
            </Link>
          ))}
        </div>
      ) : (
        <p className="mt-8 text-sm text-ink/60">No areas are shared with you yet. An owner can give you access on the People page.</p>
      )}
    </div>
  );
}
