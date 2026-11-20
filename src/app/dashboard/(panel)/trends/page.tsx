import Link from "next/link";
import { can } from "@/lib/access";
import { aiConfigured } from "@/lib/ai";
import { requireArea } from "@/lib/auth";
import { generateTrendsNow, trendToDraft } from "@/lib/trend-actions";
import { listTrendReports, weekOf } from "@/lib/trends";
import { SubmitButton } from "@/components/SubmitButton";

export const dynamic = "force-dynamic";
// Web research plus structuring can take a couple of minutes.
export const maxDuration = 300;

function host(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export default async function TrendsPage({ searchParams }: { searchParams: Promise<{ report?: string; error?: string }> }) {
  const user = await requireArea("trends", "view");
  const canRun = can(user, "trends", "edit");
  const canDraft = can(user, "posts", "edit");
  const query = await searchParams;
  const { ready, reports } = await listTrendReports();
  const report = reports.find((item) => item.id === query.report) || reports[0];
  const categories = report ? Array.from(new Set(report.items.map((item) => item.category))) : [];
  const thisWeek = reports.some((item) => item.week_of === weekOf());

  return (
    <div className="max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl">Trend watch</h1>
          <p className="mt-2 max-w-2xl text-sm text-ink/65">
            A weekly, sourced briefing on AI, search, web and social changes, and what they mean for UX4U and its clients. Runs every Monday automatically.
          </p>
        </div>
        {canRun ? (
          <form action={generateTrendsNow}>
            <SubmitButton label={thisWeek ? "Run again now" : "Create this week's report"} pendingLabel="Researching… (1–3 minutes)" dark />
          </form>
        ) : null}
      </div>
      {!aiConfigured() ? <p className="mt-4 rounded-lg bg-amber-50 px-4 py-2 text-sm text-amber-900">Add GEMINI_API_KEY to the server environment to create reports.</p> : null}
      {!ready ? <p className="mt-4 border border-amber-800/20 bg-amber-50 px-4 py-3 text-sm">Run <code>supabase/growth.sql</code> in Supabase first.</p> : null}
      {query.error ? <p className="mt-4 text-sm text-red-800">{query.error === "missing" ? "That item no longer exists." : query.error === "draft" ? "Could not create the draft." : "The report could not be created. Check the Gemini key and try again."}</p> : null}

      {report ? (
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_220px]">
          <article>
            <p className="text-xs uppercase tracking-[0.16em] text-moss">Week of {report.week_of}</p>
            <h2 className="mt-2 font-serif text-3xl">{report.title}</h2>
            <p className="mt-3 max-w-3xl text-ink/75">{report.summary}</p>
            <p className="mt-2 text-xs text-ink/45">AI-generated from web sources. Check the source before acting on any item.</p>
            {categories.map((category) => (
              <section key={category} className="mt-8">
                <h3 className="text-xs uppercase tracking-[0.14em] text-ink/45">{category}</h3>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {report.items.map((item, index) =>
                    item.category === category ? (
                      <div key={index} className="flex flex-col rounded-xl border border-ink/10 bg-white p-4">
                        <h4 className="font-medium leading-snug">{item.headline}</h4>
                        <p className="mt-2 text-sm text-ink/75">{item.what}</p>
                        <p className="mt-3 text-sm"><span className="font-medium">Why it matters: </span><span className="text-ink/75">{item.why}</span></p>
                        <p className="mt-2 rounded-lg bg-moss/5 px-3 py-2 text-sm"><span className="font-medium text-moss">Do this: </span>{item.action}</p>
                        <div className="mt-auto flex flex-wrap items-center gap-2 pt-3 text-xs">
                          {item.sources.map((url) => (
                            <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="rounded-full border border-ink/15 px-2 py-0.5 text-ink/60 hover:text-ink">{host(url)} ↗</a>
                          ))}
                          {canDraft ? (
                            <form action={trendToDraft} className="ml-auto">
                              <input type="hidden" name="report" value={report.id} />
                              <input type="hidden" name="index" value={index} />
                              <button type="submit" className="text-moss">Turn into a post →</button>
                            </form>
                          ) : null}
                        </div>
                      </div>
                    ) : null
                  )}
                </div>
              </section>
            ))}
          </article>
          <aside>
            <h3 className="text-xs uppercase tracking-[0.14em] text-ink/45">Past reports</h3>
            <ul className="mt-2 space-y-1 text-sm">
              {reports.map((item) => (
                <li key={item.id}>
                  <Link href={`/dashboard/trends?report=${item.id}`} className={`block rounded-lg px-3 py-2 ${item.id === report.id ? "bg-ink text-paper" : "hover:bg-ink/5"}`}>
                    <span className="block text-xs opacity-70">{item.week_of}</span>
                    <span className="line-clamp-2">{item.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      ) : ready ? (
        <p className="mt-10 text-sm text-ink/55">No reports yet. {canRun ? "Create the first one above." : "The first one arrives on Monday."}</p>
      ) : null}
    </div>
  );
}
