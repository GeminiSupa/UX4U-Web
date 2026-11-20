import Link from "next/link";
import { can } from "@/lib/access";
import { requireArea } from "@/lib/auth";
import { createTask } from "@/lib/team-actions";
import { canModifyTask, listTasks, PRIORITIES, runningEntry, staffDirectory, STATUSES } from "@/lib/team";
import { control } from "@/lib/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { TaskBoard, type BoardTask } from "@/components/TaskBoard";

export const dynamic = "force-dynamic";

const errors: Record<string, string> = {
  title: "Give the task a title.",
  save: "Could not save. Run supabase/growth.sql if this is the first task.",
  denied: "You can only change tasks assigned to you or created by you.",
  setup: "Sign in with your own account (not the setup password) to track time."
};

export default async function TasksPage({ searchParams }: { searchParams: Promise<{ who?: string; error?: string; q?: string }> }) {
  const user = await requireArea("tasks", "view");
  const manage = can(user, "tasks", "edit");
  const query = await searchParams;
  const [{ ready, tasks }, people, running] = await Promise.all([listTasks(), staffDirectory().catch(() => []), runningEntry(user.id)]);
  const who = query.who || (manage ? "all" : "me");
  const term = (query.q || "").toLowerCase();
  const visible = tasks.filter((task) => {
    if (who === "me" && task.assignee_id !== user.id) return false;
    if (who !== "me" && who !== "all" && task.assignee_id !== who) return false;
    if (term && !`${task.title} ${task.client} ${task.description}`.toLowerCase().includes(term)) return false;
    return true;
  });
  const board: BoardTask[] = visible.map((task) => ({
    id: task.id,
    title: task.title,
    status: task.status,
    priority: task.priority,
    client: task.client,
    assigneeName: task.assignee_name,
    dueAt: task.due_at,
    estimateMinutes: task.estimate_minutes,
    loggedMinutes: task.logged_minutes,
    position: Number(task.position),
    editable: canModifyTask(user, task),
    running: running?.task_id === task.id
  }));
  const open = tasks.filter((task) => task.status !== "done");
  const overdue = open.filter((task) => task.due_at && Date.parse(task.due_at) < Date.now());
  const mine = open.filter((task) => task.assignee_id === user.id);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl">Tasks</h1>
          <p className="mt-2 text-sm text-ink/65">
            {open.length} open · {mine.length} yours · <span className={overdue.length ? "text-red-800" : ""}>{overdue.length} overdue</span>. Drag cards between columns.
          </p>
        </div>
        <Link href="/dashboard/work" className="rounded-full border border-ink/15 px-4 py-2 text-sm">Timesheets & reports →</Link>
      </div>
      {!ready ? (
        <p className="mt-4 border border-amber-800/20 bg-amber-50 px-4 py-3 text-sm">Run <code>supabase/growth.sql</code> in Supabase to turn on tasks.</p>
      ) : null}
      {query.error ? <p className="mt-4 text-sm text-red-800">{errors[query.error] || "Something went wrong."}</p> : null}

      <details className="mt-5 rounded-xl border border-ink/10 bg-white p-4">
        <summary className="cursor-pointer text-sm font-medium">+ New task</summary>
        <form action={createTask} className="mt-4 grid gap-3 md:grid-cols-3">
          <label className="text-sm md:col-span-2">Title<input className={control} name="title" required maxLength={200} /></label>
          <label className="text-sm">Client or project<input className={control} name="client" maxLength={120} /></label>
          <label className="text-sm md:col-span-3">Details<textarea className={control} name="description" rows={3} /></label>
          <label className="text-sm">
            Assign to
            <select className={control} name="assignee_id" defaultValue={user.bootstrap ? "" : user.id} disabled={!manage}>
              <option value="">Unassigned</option>
              {people.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
            </select>
          </label>
          <label className="text-sm">Due<input className={control} name="due_at" type="datetime-local" /></label>
          <label className="text-sm">Estimate (hours)<input className={control} name="estimate_hours" type="number" min="0" step="0.25" /></label>
          <label className="text-sm">
            Priority
            <select className={control} name="priority" defaultValue="normal">
              {PRIORITIES.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
            </select>
          </label>
          <label className="text-sm">
            Column
            <select className={control} name="status" defaultValue="todo">
              {STATUSES.map((status) => <option key={status.id} value={status.id}>{status.label}</option>)}
            </select>
          </label>
          <div className="flex items-end"><SubmitButton label="Create task" pendingLabel="Saving" dark /></div>
        </form>
      </details>

      <form method="get" className="mt-4 flex flex-wrap items-center gap-2 text-sm">
        <select name="who" defaultValue={who} className="rounded-full border border-ink/15 bg-white px-3 py-1.5">
          <option value="all">Everyone</option>
          <option value="me">Only mine</option>
          {people.filter((person) => person.id !== user.id).map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
        </select>
        <input name="q" defaultValue={query.q || ""} placeholder="Search tasks" className="rounded-full border border-ink/15 bg-white px-3 py-1.5" />
        <button type="submit" className="rounded-full bg-ink px-4 py-1.5 text-paper">Filter</button>
      </form>

      <div className="mt-4">
        <TaskBoard key={`${who}-${term}-${board.length}`} columns={STATUSES.map((status) => ({ id: status.id, label: status.label }))} tasks={board} />
      </div>
    </div>
  );
}
