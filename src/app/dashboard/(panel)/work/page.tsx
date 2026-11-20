import Link from "next/link";
import { can } from "@/lib/access";
import { requireArea } from "@/lib/auth";
import { addTimeEntry, deleteTimeEntry } from "@/lib/team-actions";
import { entriesBetween, formatMinutes, listTasks, minutesOf, staffDirectory } from "@/lib/team";
import { control } from "@/lib/ui";
import { SubmitButton } from "@/components/SubmitButton";

export const dynamic = "force-dynamic";

function startOfWeek(date: Date) {
  const day = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const weekday = (day.getUTCDay() + 6) % 7;
  day.setUTCDate(day.getUTCDate() - weekday);
  return day;
}

function period(kind: string, offset: number) {
  const now = new Date();
  if (kind === "month") {
    const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, 1));
    const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset + 1, 1));
    return { from, to, label: from.toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }) };
  }
  const from = startOfWeek(now);
  from.setUTCDate(from.getUTCDate() + offset * 7);
  const to = new Date(from.getTime() + 7 * 86400000);
  const last = new Date(to.getTime() - 86400000);
  const fmt = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
  return { from, to, label: `${fmt(from)} – ${fmt(last)}` };
}

export default async function WorkPage({ searchParams }: { searchParams: Promise<{ p?: string; o?: string; error?: string }> }) {
  const user = await requireArea("tasks", "view");
  const manage = can(user, "tasks", "edit");
  const query = await searchParams;
  const kind = query.p === "month" ? "month" : "week";
  const offset = Math.max(-52, Math.min(0, Number(query.o) || 0));
  const { from, to, label } = period(kind, offset);
  const [entries, { tasks }, people] = await Promise.all([
    entriesBetween(from, to, manage ? undefined : user.id).catch(() => []),
    listTasks(),
    staffDirectory().catch(() => [])
  ]);
  const everyone = manage ? people : people.filter((person) => person.id === user.id);
  const days = kind === "week" ? Array.from({ length: 7 }, (_, index) => new Date(from.getTime() + index * 86400000)) : [];
  const now = Date.now();

  const rows = everyone.map((person) => {
    const own = entries.filter((entry) => entry.user_id === person.id);
    const minutes = own.reduce((sum, entry) => sum + minutesOf(entry, now), 0);
    const completed = tasks.filter(
      (task) => task.assignee_id === person.id && task.completed_at && Date.parse(task.completed_at) >= from.getTime() && Date.parse(task.completed_at) < to.getTime()
    );
    const withDue = completed.filter((task) => task.due_at);
    const onTime = withDue.filter((task) => Date.parse(task.completed_at!) <= Date.parse(task.due_at!)).length;
    const overdue = tasks.filter((task) => task.assignee_id === person.id && task.status !== "done" && task.due_at && Date.parse(task.due_at) < now).length;
    const open = tasks.filter((task) => task.assignee_id === person.id && task.status !== "done").length;
    const cycle = completed.length
      ? completed.reduce((sum, task) => sum + (Date.parse(task.completed_at!) - Date.parse(task.created_at)), 0) / completed.length / 86400000
      : 0;
    const perDay = days.map((day) =>
      own.filter((entry) => entry.started_at.slice(0, 10) === day.toISOString().slice(0, 10)).reduce((sum, entry) => sum + minutesOf(entry, now), 0)
    );
    const byTask = new Map<string, number>();
    own.forEach((entry) => byTask.set(entry.task_title || "General work", (byTask.get(entry.task_title || "General work") || 0) + minutesOf(entry, now)));
    return { person, minutes, completed: completed.length, onTime: withDue.length ? Math.round((onTime / withDue.length) * 100) : null, overdue, open, cycle, perDay, byTask };
  });
  const maxDay = Math.max(60, ...rows.flatMap((row) => row.perDay));
  const totalMinutes = rows.reduce((sum, row) => sum + row.minutes, 0);
  const link = (p: string, o: number) => `/dashboard/work?p=${p}&o=${o}`;

  return (
    <div className="max-w-6xl">
      <Link href="/dashboard/tasks" className="text-sm text-ink/60">← Tasks</Link>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl">Timesheets & work reports</h1>
          <p className="mt-2 text-sm text-ink/65">{manage ? "Everyone on the team." : "Your own time and tasks."} {label} · {formatMinutes(totalMinutes)} logged.</p>
        </div>
        <nav className="flex flex-wrap items-center gap-2 text-sm">
          <Link className="rounded-full border border-ink/15 px-3 py-1" href={link(kind, offset - 1)}>← Earlier</Link>
          {offset < 0 ? <Link className="rounded-full border border-ink/15 px-3 py-1" href={link(kind, offset + 1)}>Later →</Link> : null}
          <span className="flex rounded-full border border-ink/10 bg-white p-1">
            {(["week", "month"] as const).map((value) => (
              <Link key={value} href={link(value, 0)} className={`rounded-full px-3 py-0.5 ${kind === value ? "bg-ink text-paper" : "text-ink/60"}`}>{value === "week" ? "Week" : "Month"}</Link>
            ))}
          </span>
        </nav>
      </div>
      {query.error ? <p className="mt-3 text-sm text-red-800">{query.error === "time" ? "Enter between 1 minute and 24 hours." : query.error === "setup" ? "Sign in with your own account to log time." : "Could not save."}</p> : null}

      <div className="mt-6 overflow-x-auto rounded-xl border border-ink/10 bg-white">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-ink/10 text-xs uppercase tracking-[0.12em] text-ink/45">
            <tr>
              <th className="px-4 py-3 font-medium">Person</th>
              <th className="px-4 py-3 text-right font-medium">Hours</th>
              <th className="px-4 py-3 text-right font-medium">Tasks done</th>
              <th className="px-4 py-3 text-right font-medium">On time</th>
              <th className="px-4 py-3 text-right font-medium">Avg days to finish</th>
              <th className="px-4 py-3 text-right font-medium">Open</th>
              <th className="px-4 py-3 text-right font-medium">Overdue now</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.person.id} className="border-b border-ink/5">
                <td className="px-4 py-3 font-medium">{row.person.name}</td>
                <td className="px-4 py-3 text-right tabular-nums">{formatMinutes(row.minutes)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{row.completed}</td>
                <td className="px-4 py-3 text-right tabular-nums">{row.onTime === null ? "–" : `${row.onTime}%`}</td>
                <td className="px-4 py-3 text-right tabular-nums">{row.completed ? row.cycle.toFixed(1) : "–"}</td>
                <td className="px-4 py-3 text-right tabular-nums">{row.open}</td>
                <td className={`px-4 py-3 text-right tabular-nums ${row.overdue ? "font-medium text-red-800" : ""}`}>{row.overdue}</td>
              </tr>
            ))}
            {!rows.length ? <tr><td colSpan={7} className="px-4 py-6 text-ink/50">No people yet. Run supabase/users.sql and invite your team.</td></tr> : null}
          </tbody>
        </table>
      </div>

      {kind === "week" ? (
        <section className="mt-6 overflow-x-auto rounded-xl border border-ink/10 bg-white p-4">
          <h2 className="text-sm font-medium">Timesheet</h2>
          <table className="mt-3 w-full min-w-[640px] text-sm">
            <thead className="text-xs text-ink/45">
              <tr>
                <th className="py-2 text-left font-medium">Person</th>
                {days.map((day) => (
                  <th key={day.toISOString()} className="py-2 text-center font-medium">{day.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", timeZone: "UTC" })}</th>
                ))}
                <th className="py-2 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.person.id} className="border-t border-ink/5">
                  <td className="py-2 pr-3">{row.person.name}</td>
                  {row.perDay.map((minutes, index) => (
                    <td key={index} className="p-1 text-center">
                      <span
                        className="block rounded-md py-1.5 text-xs tabular-nums"
                        style={{ background: minutes ? `rgba(15,122,86,${0.08 + (minutes / maxDay) * 0.5})` : "transparent" }}
                        title={`${row.person.name}, ${days[index].toISOString().slice(0, 10)}: ${formatMinutes(minutes)}`}
                      >
                        {minutes ? formatMinutes(minutes) : "·"}
                      </span>
                    </td>
                  ))}
                  <td className="py-2 text-right font-medium tabular-nums">{formatMinutes(row.minutes)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-ink/10 bg-white p-4">
          <h2 className="text-sm font-medium">Where the time went</h2>
          <div className="mt-3 space-y-4">
            {rows.filter((row) => row.minutes).map((row) => (
              <div key={row.person.id}>
                <p className="text-xs uppercase tracking-[0.12em] text-ink/45">{row.person.name}</p>
                <ul className="mt-1 space-y-1 text-sm">
                  {Array.from(row.byTask.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([title, minutes]) => (
                    <li key={title} className="flex justify-between gap-3"><span className="truncate">{title}</span><span className="tabular-nums text-ink/60">{formatMinutes(minutes)}</span></li>
                  ))}
                </ul>
              </div>
            ))}
            {!totalMinutes ? <p className="text-sm text-ink/50">No time logged in this period.</p> : null}
          </div>
        </section>
        <section className="rounded-xl border border-ink/10 bg-white p-4">
          <h2 className="text-sm font-medium">Log time for general work</h2>
          <form action={addTimeEntry} className="mt-3 grid grid-cols-3 gap-2 text-sm">
            <input type="hidden" name="next" value={link(kind, offset)} />
            <label className="col-span-3 sm:col-span-1">Date<input className={control} name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required /></label>
            <label>Hours<input className={control} name="hours" type="number" min="0" max="24" defaultValue="1" /></label>
            <label>Min<input className={control} name="minutes" type="number" min="0" max="59" defaultValue="0" /></label>
            <label className="col-span-3">Note<input className={control} name="note" maxLength={300} placeholder="Meeting, research, admin…" /></label>
            <div className="col-span-3"><SubmitButton label="Log time" pendingLabel="Saving" dark /></div>
          </form>
          <h3 className="mt-6 text-xs uppercase tracking-[0.12em] text-ink/45">Latest entries</h3>
          <ul className="mt-2 divide-y divide-ink/5 text-sm">
            {entries.slice(0, 15).map((entry) => (
              <li key={entry.id} className="flex items-center justify-between gap-2 py-1.5">
                <span className="truncate">{manage ? `${entry.user_name} · ` : ""}{entry.task_title}</span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="tabular-nums text-ink/60">{entry.ended_at ? formatMinutes(entry.minutes) : "running"}</span>
                  {entry.user_id === user.id || manage ? (
                    <form action={deleteTimeEntry}>
                      <input type="hidden" name="id" value={entry.id} />
                      <input type="hidden" name="next" value={link(kind, offset)} />
                      <button className="text-xs text-red-800" type="submit" aria-label="Delete entry">✕</button>
                    </form>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
