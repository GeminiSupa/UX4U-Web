import Link from "next/link";
import { databaseReady, ensureSeed, getInquiries, getLeads, getPosts, getProjects, getTeam } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const ready = await databaseReady();
  if (ready) await ensureSeed().catch(() => false);
  const [team, projects, posts, leads, inquiries] = await Promise.all([
    getTeam(false),
    getProjects(false),
    getPosts(false),
    ready ? getLeads() : Promise.resolve([]),
    ready ? getInquiries() : Promise.resolve([])
  ]);

  const stats = [
    ["Team", team.length, "/dashboard/team"],
    ["Projects", projects.length, "/dashboard/projects"],
    ["Journal", posts.length, "/dashboard/posts"],
    ["Leads", leads.length, "/dashboard/leads"],
    ["Inquiries", inquiries.length, "/dashboard/inquiries"]
  ];

  return (
    <div>
      <h1 className="font-serif text-4xl">Overview</h1>
      <p className="mt-2 max-w-xl text-sm text-ink/65">
        The public site reads what you publish here. Leads are private and stay in this desk.
      </p>
      {!ready ? (
        <p className="mt-6 border border-amber-800/20 bg-amber-50 px-4 py-3 text-sm">
          The database tables are not in Supabase yet. Open the SQL editor for this project and run the file
          web/supabase/schema.sql. The public site is using the built-in studio copy until then.
        </p>
      ) : null}
      <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {stats.map(([label, count, href]) => (
          <Link key={label} href={String(href)} className="border border-ink/10 bg-white px-4 py-4">
            <p className="text-xs uppercase tracking-[0.14em] text-ink/45">{label}</p>
            <p className="mt-2 font-serif text-4xl">{count}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
