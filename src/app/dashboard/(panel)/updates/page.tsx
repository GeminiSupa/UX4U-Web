import Link from "next/link";
import { can } from "@/lib/access";
import { listUsers, requireArea } from "@/lib/auth";
import { entriesBetween, formatMinutes, listTasks, minutesOf } from "@/lib/team";
import { weeklyUpdates } from "@/lib/workspace";
import { saveWeeklyUpdate } from "@/lib/workspace-actions";
import { MOODS, weekLabel, weekStart } from "@/lib/workspace-shared";
import { control } from "@/lib/ui";
import { SubmitButton } from "@/components/SubmitButton";

export const dynamic = "force-dynamic";

const DAY = 86400000;

export default async function WeeklyUpdatesPage({ searchParams }: { searchParams: Promise<{ week?: string; saved?: string; error?: string }> }) {
  const user = await requireArea("tasks", "view");
  const manage = can(user, "tasks", "edit");
  const query = await searchParams;
  const current = weekStart();
  const asked = /^\d{4}-\d{2}-\d{2}$/.test(query.week || "") ? new Date(`${query.week}T00:00:00Z`) : null;
  const requested = asked && Number.isFinite(asked.getTime()) ? weekStart(asked) : current;
  const week = requested > current ? current : requested;
  const from = new Date(`${week}T00:00:00Z`);
  const to = new Date(from.getTime() + 7 * DAY);
  const monthFrom = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), 1);
  const prev = weekStart(from, -1);
  const next = weekStart(from, 1);
  const editableWeek = week === current || week === weekStart(new Date(), -1);

  const [{ ready, updates }, users, { tasks }, entries] = await Promise.all([
    weeklyUpdates(week),
    listUsers().catch(() => []),
    listTasks(),
    entriesBetween(from, to, manage ? undefined : user.id).catch(() => [])
  ]);
  const team = users.filter((person) => person.active && can(person, "tasks", "view"));
  const byUser = new Map(updates.map((update) => [update.user_id, update]));
  const mine = byUser.get(user.id);
  const now = Date.now();

  const inRange = (iso: string | null, start: number, end: number) => Boolean(iso && Date.parse(iso) >= start && Date.parse(iso) < end);
  const stats = (personId: string) => {
    const approved = tasks.filter((task) => task.assignee_id === personId && task.status === "done" && inRange(task.completed_at, from.getTime(), to.getTime()));
    const submitted = tasks.filter((task) => task.assignee_id === personId && inRange(task.submitted_at, from.getTime(), to.getTime()));
    const open = tasks.filter((task) => task.assignee_id === personId && task.status !== "done");
    const overdue = open.filter((task) => task.due_at && Date.parse(task.due_at) < now);
    const minutes = entries.filter((entry) => entry.user_id === personId).reduce((sum, entry) => sum + minutesOf(entry, now), 0);
    const points = approved.reduce((sum, task) => sum + task.points, 0);
    const monthPoints = tasks
      .filter((task) => task.assignee_id === personId && task.status === "done" && inRange(task.completed_at, monthFrom, to.getTime()))
      .reduce((sum, task) => sum + task.points, 0);
    return { approved, submitted, open, overdue, minutes, points, monthPoints };
  };
  const rows = team.map((person) => ({ person, update: byUser.get(person.id), ...stats(person.id) }));
  const leaderboard = [...rows].sort((a, b) => b.points - a.points || b.monthPoints - a.monthPoints || b.approved.length - a.approved.length);
  const missing = rows.filter((row) => !row.update);
  const blocked = rows.filter((row) => row.update?.blockers);
  const me = stats(user.id);
  const draftDone = me.approved.length || me.submitted.length
    ? [...me.approved.map((task) => `- ${task.title} (approved${task.points ? `, ${task.points} pts` : ""})`), ...me.submitted.filter((task) => task.status !== "done").map((task) => `- ${task.title} (submitted)`)].join("\n")
    : "";
  const maxPoints = Math.max(1, ...leaderboard.map((row) => row.points));

  return (
    <div>
      <Link href="/dashboard/tasks" className="text-sm text-ink/60">← Tasks</Link>
      <div className="mt-1 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl">Weekly updates</h1>
          <p className="mt-2 text-sm text-ink/65">
            {weekLabel(week)} · {updates.length}/{team.length} posted
          </p>
        </div>
        <nav className="flex items-center gap-2 text-sm" aria-label="Week">
          <Link href={`/dashboard/updates?week=${prev}`} className="rounded-full border border-ink/15 px-3 py-1.5">← Previous</Link>
          {week !== current ? <Link href="/dashboard/updates" className="rounded-full border border-ink/15 px-3 py-1.5">This week</Link> : null}
          {week < current ? <Link href={`/dashboard/updates?week=${next}`} className="rounded-full border border-ink/15 px-3 py-1.5">Next →</Link> : null}
        </nav>
      </div>
      {!ready ? (
        <p className="mt-4 border border-amber-800/20 bg-amber-50 px-4 py-3 text-sm">Run <code>supabase/workspace.sql</code> in Supabase to turn on weekly updates.</p>
      ) : null}
      {query.saved ? <p className="mt-4 text-sm text-moss">Update posted. Thanks!</p> : null}
      {query.error ? <p className="mt-4 text-sm text-red-800">{query.error === "setup" ? "Sign in with your own account to post updates." : "Could not save your update."}</p> : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-6">
          {ready && editableWeek && !user.bootstrap ? (
            <section className="rounded-2xl border border-ink/10 bg-white p-4">
              <h2 className="font-serif text-2xl">{mine ? "Your update" : "Post your update"}</h2>
              <p className="mt-1 text-sm text-ink/60">
                This week so far: {formatMinutes(me.minutes)} logged · {me.approved.length} approved · {me.submitted.length} submitted · {me.points} pts
                {me.overdue.length ? <span className="text-red-800"> · {me.overdue.length} overdue</span> : null}
              </p>
              <form action={saveWeeklyUpdate} className="mt-3 grid gap-3">
                <input type="hidden" name="week_of" value={week} />
                <input type="hidden" name="next" value={`/dashboard/updates?week=${week}`} />
                <label className="text-sm">Done this week<textarea className={control} name="done" rows={4} defaultValue={mine?.done ?? draftDone} placeholder="What you shipped or moved forward" /></label>
                <label className="text-sm">Plan for next week<textarea className={control} name="next" rows={3} defaultValue={mine?.next} placeholder="Top 2–3 priorities" /></label>
                <label className="text-sm">Blockers<textarea className={control} name="blockers" rows={2} defaultValue={mine?.blockers} placeholder="Anything stopping you? Managers are notified." /></label>
                <fieldset className="text-sm">
                  <legend>How did the week feel?</legend>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {MOODS.map((mood) => (
                      <label key={mood.value} className="cursor-pointer">
                        <input type="radio" name="mood" value={mood.value} defaultChecked={(mine?.mood ?? 3) === mood.value} className="peer sr-only" />
                        <span className="block rounded-full border border-ink/15 px-3 py-1.5 peer-checked:border-ink peer-checked:bg-ink peer-checked:text-paper peer-focus-visible:ring-2 peer-focus-visible:ring-ink/40">
                          {mood.icon} {mood.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <div><SubmitButton label={mine ? "Update" : "Post update"} pendingLabel="Saving" dark /></div>
              </form>
            </section>
          ) : null}

          {manage && blocked.length ? (
            <section className="rounded-2xl border border-red-300 bg-red-50/60 p-4">
              <h2 className="text-sm font-medium text-red-900">Blockers · {blocked.length}</h2>
              <ul className="mt-2 space-y-1 text-sm">
                {blocked.map((row) => <li key={row.person.id}><span className="font-medium">{row.person.name}:</span> {row.update!.blockers}</li>)}
              </ul>
            </section>
          ) : null}

          <section>
            <h2 className="font-serif text-2xl">Team</h2>
            <div className="mt-3 grid gap-3">
              {rows.map(({ person, update, approved, submitted, open, overdue, minutes, points }) => {
                const mood = MOODS.find((item) => item.value === update?.mood);
                const showHours = manage || person.id === user.id;
                return (
                  <article key={person.id} className={`rounded-2xl border bg-white p-4 ${update ? "border-ink/10" : "border-dashed border-ink/20"}`}>
                    <header className="flex flex-wrap items-center gap-3">
                      <span className="grid h-9 w-9 place-items-center rounded-full bg-ink text-sm text-lime">{(person.name || "?").slice(0, 1).toUpperCase()}</span>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{person.name}</p>
                        <p className="text-xs text-ink/50">{person.title || (person.role === "owner" ? "Owner" : "Member")}</p>
                      </div>
                      {update ? (
                        <span className="text-xs text-ink/50">{mood ? `${mood.icon} ${mood.label} · ` : ""}{new Date(update.updated_at).toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" })}</span>
                      ) : (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-900">No update yet</span>
                      )}
                    </header>
                    <dl className="mt-3 flex flex-wrap gap-2 text-xs">
                      {showHours ? <div className="rounded-full bg-ink/[0.04] px-2.5 py-1"><dt className="inline text-ink/50">Hours </dt><dd className="inline">{formatMinutes(minutes)}</dd></div> : null}
                      <div className="rounded-full bg-ink/[0.04] px-2.5 py-1"><dt className="inline text-ink/50">Approved </dt><dd className="inline">{approved.length}</dd></div>
                      <div className="rounded-full bg-ink/[0.04] px-2.5 py-1"><dt className="inline text-ink/50">Submitted </dt><dd className="inline">{submitted.length}</dd></div>
                      <div className="rounded-full bg-ink/[0.04] px-2.5 py-1"><dt className="inline text-ink/50">Open </dt><dd className="inline">{open.length}</dd></div>
                      {overdue.length ? <div className="rounded-full bg-red-50 px-2.5 py-1 text-red-800"><dt className="inline">Overdue </dt><dd className="inline">{overdue.length}</dd></div> : null}
                      <div className="rounded-full bg-lime/40 px-2.5 py-1 font-medium"><dt className="inline">Points </dt><dd className="inline">{points}</dd></div>
                    </dl>
                    {update ? (
                      <div className="mt-3 grid gap-3 text-sm md:grid-cols-2">
                        {update.done ? <div><p className="text-xs uppercase tracking-wide text-ink/45">Done</p><p className="mt-1 whitespace-pre-line">{update.done}</p></div> : null}
                        {update.next ? <div><p className="text-xs uppercase tracking-wide text-ink/45">Next</p><p className="mt-1 whitespace-pre-line">{update.next}</p></div> : null}
                        {update.blockers ? (
                          <div className="md:col-span-2"><p className="text-xs uppercase tracking-wide text-red-800/70">Blockers</p><p className="mt-1 whitespace-pre-line text-red-900">{update.blockers}</p></div>
                        ) : null}
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-ink/10 bg-white p-4">
            <h2 className="text-sm font-medium">Points leaderboard</h2>
            <p className="text-xs text-ink/50">Approved work, {weekLabel(week)}</p>
            <ol className="mt-3 space-y-2">
              {leaderboard.map((row, index) => (
                <li key={row.person.id} className="text-sm">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate">
                      <span className="mr-1.5 inline-block w-5 text-ink/40">{index < 3 && row.points ? ["🥇", "🥈", "🥉"][index] : `${index + 1}.`}</span>
                      {row.person.name}
                    </span>
                    <span className="shrink-0 tabular-nums">
                      <span className="font-medium">{row.points}</span>
                      <span className="text-xs text-ink/45"> · {row.monthPoints} this month</span>
                    </span>
                  </div>
                  <div className="ml-6 mt-1 h-1.5 overflow-hidden rounded-full bg-ink/5">
                    <div className="h-full rounded-full bg-lime" style={{ width: `${(row.points / maxPoints) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {manage && missing.length ? (
            <section className="rounded-2xl border border-amber-400/40 bg-amber-50/60 p-4">
              <h2 className="text-sm font-medium">Still to post · {missing.length}</h2>
              <p className="mt-1 text-sm text-ink/70">{missing.map((row) => row.person.name).join(", ")}</p>
              <p className="mt-2 text-xs text-ink/50">A reminder goes out automatically on Friday.</p>
            </section>
          ) : null}

          <section className="rounded-2xl border border-ink/10 bg-white p-4 text-sm text-ink/70">
            <h2 className="text-sm font-medium text-ink">How it works</h2>
            <ol className="mt-2 list-decimal space-y-1 pl-4">
              <li>Pick up tasks on your project board and tick off steps.</li>
              <li>Submit each task for review with a note or link.</li>
              <li>A manager approves it — points land on the leaderboard.</li>
              <li>Post a weekly update by Friday: done, next, blockers.</li>
            </ol>
          </section>
        </aside>
      </div>
    </div>
  );
}
