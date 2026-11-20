import Link from "next/link";

export type TimelineRow = {
  id: string;
  title: string;
  href: string;
  start: string | null;
  end: string | null;
  status: string;
  assignee: string;
  color: string;
  progress?: number;
};

export type TimelineGroup = { id: string; label: string; color: string; start?: string | null; end?: string | null; progress?: number; rows: TimelineRow[] };

const DAY = 86400000;

function day(value: string | null | undefined) {
  if (!value) return null;
  const time = Date.parse(value.length === 10 ? `${value}T00:00:00Z` : value);
  return Number.isFinite(time) ? time : null;
}

const STATUS_STYLE: Record<string, string> = {
  todo: "opacity-45",
  doing: "opacity-80",
  review: "opacity-90 outline outline-2 outline-offset-1 outline-amber-500/60",
  done: "opacity-100"
};

/** Gantt-style timeline: one bar per task from start (or creation) to due date. */
export function TaskTimeline({ groups, undated }: { groups: TimelineGroup[]; undated: number }) {
  const now = Date.now();
  const points: number[] = [now - 3 * DAY, now + 14 * DAY];
  for (const group of groups) {
    for (const value of [group.start, group.end]) {
      const time = day(value);
      if (time) points.push(time);
    }
    for (const row of group.rows) {
      for (const value of [row.start, row.end]) {
        const time = day(value);
        if (time) points.push(time);
      }
    }
  }
  let from = Math.min(...points);
  let to = Math.max(...points);
  // Keep the window readable: at most ~6 months, centred around today when larger.
  if (to - from > 180 * DAY) {
    from = Math.max(from, now - 60 * DAY);
    to = Math.min(to, from + 180 * DAY);
  }
  from = Math.floor(from / DAY) * DAY - DAY;
  to = Math.ceil(to / DAY) * DAY + DAY;
  const span = to - from;
  const pct = (time: number) => Math.max(0, Math.min(100, ((time - from) / span) * 100));

  // Week ticks (Mondays).
  const ticks: number[] = [];
  const first = new Date(from);
  first.setUTCDate(first.getUTCDate() + ((8 - first.getUTCDay()) % 7));
  for (let t = Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), first.getUTCDate()); t < to; t += 7 * DAY) ticks.push(t);

  const bar = (start: number | null, end: number | null) => {
    const s = start ?? (end ? end - DAY : null);
    const e = end ?? (start ? start + DAY : null);
    if (s === null || e === null) return null;
    const left = pct(Math.min(s, e));
    const width = Math.max(1.2, pct(Math.max(s, e)) - left);
    return { left, width };
  };

  if (!groups.some((group) => group.rows.length)) {
    return <p className="rounded-xl border border-ink/10 bg-white px-4 py-8 text-center text-sm text-ink/50">Add start and due dates to tasks to see them on the timeline.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-ink/10 bg-white">
      <div className="min-w-[760px]">
        <div className="relative ml-[220px] h-8 border-b border-ink/10 text-[11px] text-ink/45">
          {ticks.map((tick) => (
            <span key={tick} className="absolute top-2 -translate-x-1/2 whitespace-nowrap" style={{ left: `${pct(tick)}%` }}>
              {new Date(tick).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" })}
            </span>
          ))}
        </div>
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-[220px] right-0">
            {ticks.map((tick) => <span key={tick} className="absolute inset-y-0 w-px bg-ink/[0.05]" style={{ left: `${pct(tick)}%` }} />)}
            <span className="absolute inset-y-0 w-0.5 bg-red-600/50" style={{ left: `${pct(now)}%` }} title="Today" />
          </div>
          {groups.filter((group) => group.rows.length).map((group) => {
            const groupBar = bar(day(group.start), day(group.end));
            return (
              <div key={group.id} className="border-b border-ink/5 last:border-0">
                <div className="flex items-center bg-ink/[0.025]">
                  <div className="flex w-[220px] shrink-0 items-center gap-2 px-3 py-2 text-sm font-medium">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: group.color }} aria-hidden />
                    <span className="truncate">{group.label}</span>
                    {group.progress !== undefined ? <span className="ml-auto text-xs font-normal text-ink/50">{group.progress}%</span> : null}
                  </div>
                  <div className="relative h-9 flex-1">
                    {groupBar ? (
                      <div className="absolute top-3 h-3 overflow-hidden rounded-full" style={{ left: `${groupBar.left}%`, width: `${groupBar.width}%`, background: `${group.color}33` }}>
                        <div className="h-full rounded-full" style={{ width: `${group.progress || 0}%`, background: group.color }} />
                      </div>
                    ) : null}
                  </div>
                </div>
                {group.rows.map((row) => {
                  const rowBar = bar(day(row.start), day(row.end));
                  const late = row.status !== "done" && day(row.end) !== null && day(row.end)! < now;
                  return (
                    <div key={row.id} className="flex items-center hover:bg-ink/[0.02]">
                      <div className="w-[220px] shrink-0 truncate px-3 py-1.5 pl-7 text-xs">
                        <Link href={row.href} className="hover:underline">{row.title}</Link>
                        <span className="block truncate text-[11px] text-ink/45">{row.assignee || "Unassigned"}</span>
                      </div>
                      <div className="relative h-10 flex-1">
                        {rowBar ? (
                          <Link
                            href={row.href}
                            title={`${row.title} · ${row.status}`}
                            className={`absolute top-3 flex h-4 items-center rounded-md px-1.5 text-[10px] font-medium text-white ${STATUS_STYLE[row.status] || ""} ${late ? "ring-2 ring-red-600/70" : ""}`}
                            style={{ left: `${rowBar.left}%`, width: `${rowBar.width}%`, background: row.color }}
                          >
                            <span className="truncate">{row.status === "done" ? "✓" : row.progress !== undefined ? `${row.progress}%` : ""}</span>
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
        <p className="flex flex-wrap gap-x-4 gap-y-1 border-t border-ink/10 px-3 py-2 text-[11px] text-ink/50">
          <span><span className="mr-1 inline-block h-2 w-3 rounded-sm bg-ink/30" />faded = to do</span>
          <span><span className="mr-1 inline-block h-2 w-3 rounded-sm outline outline-2 outline-amber-500/60" />in review</span>
          <span><span className="mr-1 inline-block h-2 w-3 rounded-sm ring-2 ring-red-600/70" />overdue</span>
          <span><span className="mr-1 inline-block h-3 w-0.5 bg-red-600/50 align-middle" />today</span>
          {undated ? <span>{undated} task{undated === 1 ? "" : "s"} without dates not shown</span> : null}
        </p>
      </div>
    </div>
  );
}
