import Link from "next/link";
import { requireArea } from "@/lib/auth";
import { countSince, trafficSummary, type Summary } from "@/lib/analytics";
import { SOURCE_LABELS, type Source } from "@/lib/traffic";

export const dynamic = "force-dynamic";

const RANGES = [
  ["7", "7 days"],
  ["30", "30 days"],
  ["90", "90 days"]
] as const;

function n(value: number) {
  return value.toLocaleString("en-US");
}

function pct(part: number, whole: number) {
  return whole ? (part / whole) * 100 : 0;
}

function Delta({ now, before, invert = false }: { now: number; before: number; invert?: boolean }) {
  if (!before && !now) return <span className="text-xs text-ink/40">no data</span>;
  if (!before) return <span className="text-xs text-ink/50">new</span>;
  const change = ((now - before) / before) * 100;
  const up = change >= 0;
  const good = invert ? !up : up;
  return (
    <span className={`text-xs ${Math.abs(change) < 1 ? "text-ink/50" : good ? "text-moss" : "text-red-800"}`}>
      {up ? "▲" : "▼"} {Math.abs(change).toFixed(0)}% <span className="text-ink/40">vs previous</span>
    </span>
  );
}

function Tile({ label, value, now, before, hint }: { label: string; value: string; now: number; before: number; hint?: string }) {
  return (
    <div className="rounded-xl border border-ink/10 bg-white p-4">
      <p className="text-xs uppercase tracking-[0.14em] text-ink/45">{label}</p>
      <p className="mt-2 font-serif text-4xl">{value}</p>
      <div className="mt-1"><Delta now={now} before={before} /></div>
      {hint ? <p className="mt-1 text-xs text-ink/45">{hint}</p> : null}
    </div>
  );
}

function BarList({ rows, empty }: { rows: { label: string; value: number; sub?: string }[]; empty: string }) {
  const max = Math.max(1, ...rows.map((row) => row.value));
  if (!rows.length) return <p className="py-4 text-sm text-ink/50">{empty}</p>;
  return (
    <table className="w-full text-sm">
      <tbody>
        {rows.map((row) => (
          <tr key={row.label} className="group">
            <td className="relative py-1.5 pr-3">
              <span className="absolute inset-y-1 left-0 rounded-r bg-moss/15 transition-colors group-hover:bg-moss/25" style={{ width: `${(row.value / max) * 100}%` }} aria-hidden />
              <span className="relative px-2">{row.label}</span>
              {row.sub ? <span className="relative text-xs text-ink/45">{row.sub}</span> : null}
            </td>
            <td className="w-16 py-1.5 text-right tabular-nums text-ink/70">{n(row.value)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function DailyChart({ daily, days, to }: { daily: Summary["daily"]; days: number; to: Date }) {
  const byDay = new Map(daily.map((row) => [String(row.day).slice(0, 10), row]));
  const points = Array.from({ length: days }, (_, index) => {
    const date = new Date(to.getTime() - (days - index) * 86400000);
    const key = date.toISOString().slice(0, 10);
    return { key, sessions: Number(byDay.get(key)?.sessions || 0), views: Number(byDay.get(key)?.views || 0) };
  });
  const max = Math.max(1, ...points.map((point) => point.sessions));
  const width = 720;
  const height = 180;
  const gap = days > 60 ? 1 : 2;
  const barWidth = width / days - gap;
  return (
    <figure>
      <div className="relative">
        <svg viewBox={`0 0 ${width} ${height + 24}`} className="w-full" role="img" aria-label={`Sessions per day over the last ${days} days`}>
          {[0.5, 1].map((line) => (
            <line key={line} x1="0" x2={width} y1={height - height * line} y2={height - height * line} stroke="currentColor" strokeOpacity="0.08" />
          ))}
          <line x1="0" x2={width} y1={height} y2={height} stroke="currentColor" strokeOpacity="0.2" />
          <text x="0" y={10} fontSize="10" fill="currentColor" fillOpacity="0.45">{n(max)}</text>
          {points.map((point, index) => {
            const h = (point.sessions / max) * (height - 16);
            const x = index * (barWidth + gap);
            return (
              <g key={point.key} className="group">
                <rect x={x} y={0} width={barWidth + gap} height={height} fill="transparent" />
                {h > 0 ? (
                  <path
                    d={`M${x},${height} v${-Math.max(h - 2, 0)} q0,-2 2,-2 h${Math.max(barWidth - 4, 0)} q2,0 2,2 v${Math.max(h - 2, 0)} z`}
                    className="fill-moss/70 transition-colors group-hover:fill-moss"
                  />
                ) : null}
                <title>{`${point.key}: ${point.sessions} sessions, ${point.views} page views`}</title>
              </g>
            );
          })}
          <text x="0" y={height + 16} fontSize="10" fill="currentColor" fillOpacity="0.45">{points[0]?.key}</text>
          <text x={width} y={height + 16} fontSize="10" textAnchor="end" fill="currentColor" fillOpacity="0.45">{points[points.length - 1]?.key}</text>
        </svg>
      </div>
      <figcaption className="sr-only">Hover a bar for the exact numbers. The table below lists the same totals by source.</figcaption>
    </figure>
  );
}

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  await requireArea("analytics", "view");
  const query = await searchParams;
  const days = RANGES.some(([value]) => value === query.days) ? Number(query.days) : 30;
  const to = new Date();
  to.setUTCHours(24, 0, 0, 0);
  const from = new Date(to.getTime() - days * 86400000);
  const before = new Date(from.getTime() - days * 86400000);

  const [current, previous, inquiries, inquiriesBefore, posts] = await Promise.all([
    trafficSummary(from, to),
    trafficSummary(before, from),
    countSince("inquiries", from, to),
    countSince("inquiries", before, from),
    countSince("posts", from, to, "publish_at")
  ]);
  const c = current.data;
  const p = previous.data;
  const aiNow = c.sources.find((row) => row.source === "ai")?.sessions || 0;
  const aiBefore = p.sources.find((row) => row.source === "ai")?.sessions || 0;
  const searchNow = c.sources.find((row) => row.source === "search")?.sessions || 0;
  const searchBefore = p.sources.find((row) => row.source === "search")?.sessions || 0;
  const conversionNow = pct(c.leads, c.sessions);
  const conversionBefore = pct(p.leads, p.sessions);
  const depthNow = c.sessions ? c.views / c.sessions : 0;
  const depthBefore = p.sessions ? p.views / p.sessions : 0;
  const aiNames = c.names.filter((row) => row.source === "ai");

  return (
    <div className="max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl">Analytics</h1>
          <p className="mt-2 max-w-2xl text-sm text-ink/65">
            Your own visitor data, collected only from people who allow analytics. No IP addresses or cross-site cookies are stored.
          </p>
        </div>
        <nav className="flex rounded-full border border-ink/10 bg-white p-1 text-sm" aria-label="Date range">
          {RANGES.map(([value, label]) => (
            <Link key={value} href={`/dashboard/analytics?days=${value}`} className={`rounded-full px-3 py-1 ${days === Number(value) ? "bg-ink text-paper" : "text-ink/60"}`}>
              {label}
            </Link>
          ))}
        </nav>
      </div>

      {!current.ready ? (
        <p className="mt-6 border border-amber-800/20 bg-amber-50 px-4 py-3 text-sm">
          Run <code>supabase/growth.sql</code> in the Supabase SQL editor to start collecting visits.
        </p>
      ) : null}

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="Visitors" value={n(c.visitors)} now={c.visitors} before={p.visitors} />
        <Tile label="Sessions" value={n(c.sessions)} now={c.sessions} before={p.sessions} />
        <Tile label="Page views" value={n(c.views)} now={c.views} before={p.views} hint={`${depthNow.toFixed(1)} pages per session (was ${depthBefore.toFixed(1)})`} />
        <Tile label="Leads from site" value={n(c.leads)} now={c.leads} before={p.leads} hint={`${conversionNow.toFixed(1)}% of sessions (was ${conversionBefore.toFixed(1)}%)`} />
        <Tile label="AI assistant visits" value={n(aiNow)} now={aiNow} before={aiBefore} hint={`${pct(aiNow, c.sessions).toFixed(1)}% of sessions · ChatGPT, Perplexity, Claude…`} />
        <Tile label="Search visits" value={n(searchNow)} now={searchNow} before={searchBefore} hint={`${pct(searchNow, c.sessions).toFixed(1)}% of sessions`} />
        <Tile label="Inquiries" value={n(inquiries)} now={inquiries} before={inquiriesBefore} hint="All contact form messages, including visitors who declined analytics" />
        <Tile label="Posts published" value={n(posts)} now={posts} before={posts} hint="Scheduled posts count on their go-live date" />
      </div>

      <section className="mt-6 rounded-xl border border-ink/10 bg-white p-4">
        <h2 className="text-sm font-medium">Sessions per day</h2>
        <div className="mt-3"><DailyChart daily={c.daily} days={days} to={to} /></div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-ink/10 bg-white p-4">
          <h2 className="text-sm font-medium">Where sessions come from</h2>
          <BarList
            empty="No visits yet."
            rows={c.sources.map((row) => ({ label: SOURCE_LABELS[row.source as Source] || row.source, value: Number(row.sessions), sub: ` ${pct(Number(row.sessions), c.sessions).toFixed(0)}%` }))}
          />
        </section>
        <section className="rounded-xl border border-ink/10 bg-white p-4">
          <h2 className="text-sm font-medium">AI assistants sending visitors</h2>
          <p className="text-xs text-ink/50">Visits from links inside ChatGPT, Perplexity, Claude, Gemini, Copilot and others.</p>
          <BarList empty="No AI assistant visits in this period yet." rows={aiNames.map((row) => ({ label: row.name, value: Number(row.sessions) }))} />
        </section>
        <section className="rounded-xl border border-ink/10 bg-white p-4">
          <h2 className="text-sm font-medium">Top sources</h2>
          <BarList empty="No visits yet." rows={c.names.map((row) => ({ label: row.name, value: Number(row.sessions), sub: ` · ${SOURCE_LABELS[row.source as Source] || row.source}` }))} />
        </section>
        <section className="rounded-xl border border-ink/10 bg-white p-4">
          <h2 className="text-sm font-medium">Leads by source</h2>
          <BarList empty="No form leads tracked in this period." rows={c.lead_sources.map((row) => ({ label: SOURCE_LABELS[row.source as Source] || row.source, value: Number(row.leads) }))} />
        </section>
        <section className="rounded-xl border border-ink/10 bg-white p-4">
          <h2 className="text-sm font-medium">Most viewed pages</h2>
          <BarList empty="No page views yet." rows={c.pages.map((row) => ({ label: row.path, value: Number(row.views), sub: ` · ${n(Number(row.visitors))} visitors` }))} />
        </section>
        <section className="rounded-xl border border-ink/10 bg-white p-4">
          <h2 className="text-sm font-medium">Landing pages</h2>
          <BarList empty="No sessions yet." rows={c.landing.map((row) => ({ label: row.path, value: Number(row.sessions) }))} />
        </section>
        <section className="rounded-xl border border-ink/10 bg-white p-4">
          <h2 className="text-sm font-medium">Devices</h2>
          <BarList empty="No sessions yet." rows={c.devices.map((row) => ({ label: row.device, value: Number(row.sessions), sub: ` ${pct(Number(row.sessions), c.sessions).toFixed(0)}%` }))} />
        </section>
        <section className="rounded-xl border border-ink/10 bg-white p-4">
          <h2 className="text-sm font-medium">Countries</h2>
          <BarList empty="Country is filled in when the site runs on Vercel." rows={c.countries.map((row) => ({ label: row.country, value: Number(row.sessions) }))} />
        </section>
      </div>
      <p className="mt-6 text-xs text-ink/45">
        Days are in UTC. A session ends after 30 minutes without activity. Visitors who choose “Essential only” are not counted, so real traffic is higher than shown here.
      </p>
    </div>
  );
}
