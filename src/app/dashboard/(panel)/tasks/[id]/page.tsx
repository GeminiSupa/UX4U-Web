import Link from "next/link";
import { notFound } from "next/navigation";
import { can } from "@/lib/access";
import { requireArea } from "@/lib/auth";
import { addTimeEntry, deleteTask, deleteTimeEntry, startTimer, stopTimer, updateTask } from "@/lib/team-actions";
import { canModifyTask, formatMinutes, getTask, minutesOf, PRIORITIES, runningEntry, staffDirectory, STATUSES, type TimeEntry } from "@/lib/team";
import { admin } from "@/lib/supabase";
import { control } from "@/lib/ui";
import { SubmitButton } from "@/components/SubmitButton";

export const dynamic = "force-dynamic";

function local(iso: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default async function TaskPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; error?: string }> }) {
  const user = await requireArea("tasks", "view");
  const { id } = await params;
  const query = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const task = await getTask(id);
  if (!task) notFound();
  const [people, running, entriesResult] = await Promise.all([
    staffDirectory().catch(() => []),
    runningEntry(user.id),
    admin().from("time_entries").select("*").eq("task_id", id).order("started_at", { ascending: false }).limit(200)
  ]);
  const entries = (entriesResult.data || []) as TimeEntry[];
  const logged = entries.reduce((sum, entry) => sum + minutesOf(entry), 0);
  const editable = canModifyTask(user, task);
  const manage = can(user, "tasks", "edit");
  const here = `/dashboard/tasks/${id}`;

  return (
    <div className="max-w-4xl">
      <Link href="/dashboard/tasks" className="text-sm text-ink/60">← Tasks</Link>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="font-serif text-4xl">{task.title}</h1>
        <span className="rounded-full bg-ink/5 px-2 py-0.5 text-xs">{STATUSES.find((status) => status.id === task.status)?.label}</span>
      </div>
      <p className="mt-2 text-sm text-ink/60">
        Created by {task.created_by_name || "someone"} · {formatMinutes(logged)} logged{task.estimate_minutes ? ` of ${formatMinutes(task.estimate_minutes)} estimated` : ""}
        {task.completed_at ? ` · done ${new Date(task.completed_at).toLocaleDateString()}` : ""}
      </p>
      {query.saved ? <p className="mt-3 text-sm text-moss">Saved.</p> : null}
      {query.error ? <p className="mt-3 text-sm text-red-800">{query.error === "time" ? "Enter between 1 minute and 24 hours." : query.error === "denied" ? "You cannot change this task." : "Could not save."}</p> : null}

      {editable ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {running?.task_id === task.id ? (
            <form action={stopTimer}>
              <input type="hidden" name="next" value={here} />
              <button className="rounded-full bg-red-800 px-4 py-2 text-sm text-white" type="submit">■ Stop timer</button>
            </form>
          ) : (
            <form action={startTimer}>
              <input type="hidden" name="task_id" value={task.id} />
              <input type="hidden" name="next" value={here} />
              <button className="rounded-full bg-moss px-4 py-2 text-sm text-white" type="submit">▶ Start timer</button>
            </form>
          )}
        </div>
      ) : null}

      <form action={updateTask} className="mt-6 grid gap-3 rounded-xl border border-ink/10 bg-white p-4 md:grid-cols-3">
        <fieldset disabled={!editable} className="contents">
          <input type="hidden" name="id" value={task.id} />
          <label className="text-sm md:col-span-2">Title<input className={control} name="title" defaultValue={task.title} required maxLength={200} /></label>
          <label className="text-sm">Client or project<input className={control} name="client" defaultValue={task.client} maxLength={120} /></label>
          <label className="text-sm md:col-span-3">Details<textarea className={control} name="description" rows={5} defaultValue={task.description} /></label>
          <label className="text-sm">
            Status
            <select className={control} name="status" defaultValue={task.status}>
              {STATUSES.map((status) => <option key={status.id} value={status.id}>{status.label}</option>)}
            </select>
          </label>
          <label className="text-sm">
            Priority
            <select className={control} name="priority" defaultValue={task.priority}>
              {PRIORITIES.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
            </select>
          </label>
          <label className="text-sm">
            Assigned to
            <select className={control} name="assignee_id" defaultValue={task.assignee_id || ""} disabled={!manage}>
              <option value="">Unassigned</option>
              {people.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
            </select>
          </label>
          <label className="text-sm">Due<input className={control} name="due_at" type="datetime-local" defaultValue={local(task.due_at)} /></label>
          <label className="text-sm">Estimate (hours)<input className={control} name="estimate_hours" type="number" min="0" step="0.25" defaultValue={task.estimate_minutes ? task.estimate_minutes / 60 : ""} /></label>
          <div className="flex items-end"><SubmitButton label="Save task" pendingLabel="Saving" dark /></div>
        </fieldset>
      </form>

      <section className="mt-8">
        <h2 className="font-serif text-2xl">Time on this task</h2>
        {editable ? (
          <form action={addTimeEntry} className="mt-3 flex flex-wrap items-end gap-2 rounded-xl border border-ink/10 bg-white p-3 text-sm">
            <input type="hidden" name="task_id" value={task.id} />
            <input type="hidden" name="next" value={here} />
            <label>Date<input className={control} name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required /></label>
            <label className="w-20">Hours<input className={control} name="hours" type="number" min="0" max="24" defaultValue="1" /></label>
            <label className="w-20">Min<input className={control} name="minutes" type="number" min="0" max="59" defaultValue="0" /></label>
            <label className="min-w-40 flex-1">Note<input className={control} name="note" maxLength={300} /></label>
            <SubmitButton label="Log time" pendingLabel="Saving" dark />
          </form>
        ) : null}
        <ul className="mt-3 divide-y divide-ink/5 rounded-xl border border-ink/10 bg-white">
          {entries.map((entry) => (
            <li key={entry.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm">
              <span>
                <span className="font-medium">{entry.user_name}</span> · {new Date(entry.started_at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                {entry.note ? <span className="text-ink/55"> · {entry.note}</span> : null}
              </span>
              <span className="flex items-center gap-3">
                <span className={entry.ended_at ? "tabular-nums" : "font-medium text-moss"}>{entry.ended_at ? formatMinutes(entry.minutes) : `running ${formatMinutes(minutesOf(entry))}`}</span>
                {entry.user_id === user.id || manage ? (
                  <form action={deleteTimeEntry}>
                    <input type="hidden" name="id" value={entry.id} />
                    <input type="hidden" name="next" value={here} />
                    <button type="submit" className="text-xs text-red-800">Delete</button>
                  </form>
                ) : null}
              </span>
            </li>
          ))}
          {!entries.length ? <li className="px-4 py-6 text-sm text-ink/50">No time logged yet.</li> : null}
        </ul>
      </section>

      {manage || task.created_by === user.id ? (
        <form action={deleteTask} className="mt-8">
          <input type="hidden" name="id" value={task.id} />
          <button type="submit" className="text-sm text-red-800">Delete task</button>
        </form>
      ) : null}
    </div>
  );
}
