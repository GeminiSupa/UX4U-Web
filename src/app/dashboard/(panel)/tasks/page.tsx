import Link from "next/link";
import { can } from "@/lib/access";
import { requireArea } from "@/lib/auth";
import { createTask } from "@/lib/team-actions";
import { canModifyTask, listTasks, PRIORITIES, runningEntry, staffDirectory, STATUSES, type Task } from "@/lib/team";
import { listProjects, stepCounts } from "@/lib/workspace";
import { colorOf, POINT_PRESETS, PROJECT_STATUSES, progressOf, weekStart } from "@/lib/workspace-shared";
import { control } from "@/lib/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { TaskBoard, type BoardTask } from "@/components/TaskBoard";
import { TaskTimeline, type TimelineGroup } from "@/components/TaskTimeline";

export const dynamic = "force-dynamic";

const errors: Record<string, string> = {
  title: "Give the task a title.",
  save: "Could not save. Run supabase/growth.sql if this is the first task.",
  denied: "You can only change tasks assigned to you or created by you.",
  setup: "Sign in with your own account (not the setup password) to track time."
};

const VIEWS = [
  { id: "board", label: "Board" },
  { id: "timeline", label: "Timeline" },
  { id: "list", label: "List" }
] as const;

type Query = { who?: string; error?: string; q?: string; project?: string; view?: string };

function href(query: Query, change: Partial<Query>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...query, ...change, error: undefined })) {
    if (value) params.set(key, value);
  }
  const text = params.toString();
  return `/dashboard/tasks${text ? `?${text}` : ""}`;
}

function shortDate(value: string | null) {
  return value ? new Date(value.length === 10 ? `${value}T00:00:00Z` : value).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "—";
}

export default async function TasksPage({ searchParams }: { searchParams: Promise<Query> }) {
  const user = await requireArea("tasks", "view");
  const manage = can(user, "tasks", "edit");
  const query = await searchParams;
  const [{ ready, tasks }, people, running, { ready: workspaceReady, projects }, steps] = await Promise.all([
    listTasks(),
    staffDirectory().catch(() => []),
    runningEntry(user.id),
    listProjects(),
    stepCounts()
  ]);
  const projectById = new Map(projects.map((project) => [project.id, project]));
  const project = query.project && query.project !== "none" ? projectById.get(query.project) || null : null;
  const view = VIEWS.some((item) => item.id === query.view) ? query.view! : "board";
  const who = query.who || (manage || project ? "all" : "me");
  const term = (query.q || "").toLowerCase();
  const here = href(query, {});

  const inScope = (task: Task) => {
    if (query.project === "none") return !task.project_id;
    if (project) return task.project_id === project.id;
    return true;
  };
  const scoped = tasks.filter(inScope);
  const visible = scoped.filter((task) => {
    if (who === "me" && task.assignee_id !== user.id) return false;
    if (who !== "me" && who !== "all" && task.assignee_id !== who) return false;
    if (term && !`${task.title} ${task.client} ${task.description}`.toLowerCase().includes(term)) return false;
    return true;
  });

  const board: BoardTask[] = visible.map((task) => {
    const owner = task.project_id ? projectById.get(task.project_id) : undefined;
    return {
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
      running: running?.task_id === task.id,
      projectName: project ? undefined : owner?.name,
      projectColor: owner ? colorOf(owner.color) : undefined,
      points: task.points,
      steps: steps.get(task.id)
    };
  });

  const open = scoped.filter((task) => task.status !== "done");
  const overdue = open.filter((task) => task.due_at && Date.parse(task.due_at) < Date.now());
  const mine = open.filter((task) => task.assignee_id === user.id);
  const toReview = tasks.filter((task) => task.status === "review");
  const weekFrom = Date.parse(`${weekStart()}T00:00:00Z`);
  const myPoints = tasks
    .filter((task) => task.assignee_id === user.id && task.status === "done" && task.completed_at && Date.parse(task.completed_at) >= weekFrom)
    .reduce((sum, task) => sum + task.points, 0);
  const progress = progressOf(scoped);

  const stepPercent = (task: Task) => {
    const count = steps.get(task.id);
    return count?.total ? Math.round((count.done / count.total) * 100) : undefined;
  };
  const groupsSource = project ? [project] : projects.filter((item) => scoped.some((task) => task.project_id === item.id));
  const timeline: TimelineGroup[] = groupsSource.map((item) => {
    const own = visible.filter((task) => task.project_id === item.id);
    return {
      id: item.id,
      label: item.name,
      color: colorOf(item.color),
      start: item.start_date,
      end: item.due_date,
      progress: progressOf(scoped.filter((task) => task.project_id === item.id)).percent,
      rows: own
        .filter((task) => task.due_at || task.start_at)
        .map((task) => ({
          id: task.id,
          title: task.title,
          href: `/dashboard/tasks/${task.id}`,
          start: task.start_at || task.created_at,
          end: task.due_at,
          status: task.status,
          assignee: task.assignee_name,
          color: colorOf(item.color),
          progress: stepPercent(task)
        }))
    };
  });
  if (!project) {
    const loose = visible.filter((task) => !task.project_id && (task.due_at || task.start_at));
    if (loose.length) {
      timeline.push({
        id: "none",
        label: "No project",
        color: colorOf("slate"),
        rows: loose.map((task) => ({
          id: task.id,
          title: task.title,
          href: `/dashboard/tasks/${task.id}`,
          start: task.start_at || task.created_at,
          end: task.due_at,
          status: task.status,
          assignee: task.assignee_name,
          color: colorOf("slate"),
          progress: stepPercent(task)
        }))
      });
    }
  }
  const undated = visible.filter((task) => !task.due_at && !task.start_at).length;
  const activeProjects = projects.filter((item) => item.status !== "done");

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          {project ? (
            <>
              <Link href="/dashboard/tasks/projects" className="text-sm text-ink/60">← Projects</Link>
              <h1 className="mt-1 flex items-center gap-3 font-serif text-4xl">
                <span className="h-4 w-4 shrink-0 rounded-full" style={{ background: colorOf(project.color) }} aria-hidden />
                <span className="truncate">{project.name}</span>
              </h1>
              <p className="mt-2 text-sm text-ink/65">
                {[project.client, PROJECT_STATUSES.find((s) => s.id === project.status)?.label, project.lead_name ? `Lead: ${project.lead_name}` : "", `${shortDate(project.start_date)} → ${shortDate(project.due_date)}`]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </>
          ) : (
            <>
              <h1 className="font-serif text-4xl">Tasks</h1>
              <p className="mt-2 text-sm text-ink/65">
                {open.length} open · {mine.length} yours · <span className={overdue.length ? "text-red-800" : ""}>{overdue.length} overdue</span> · {myPoints} pts earned this week
              </p>
            </>
          )}
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <Link href="/dashboard/tasks/projects" className="rounded-full border border-ink/15 px-4 py-2">Projects</Link>
          <Link href="/dashboard/updates" className="rounded-full border border-ink/15 px-4 py-2">Weekly updates</Link>
          <Link href="/dashboard/work" className="rounded-full border border-ink/15 px-4 py-2">Timesheets →</Link>
        </div>
      </div>

      {project ? (
        <div className="mt-4 grid gap-3 rounded-2xl border border-ink/10 bg-white p-4 sm:grid-cols-[1fr_auto]">
          <div>
            <div className="flex items-baseline justify-between text-sm">
              <span className="font-medium">{progress.percent}% complete</span>
              <span className="text-ink/55">
                {progress.done}/{progress.total} tasks{progress.points ? ` · ${progress.pointsDone}/${progress.points} pts` : ""}
              </span>
            </div>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-ink/5">
              <div className="h-full rounded-full" style={{ width: `${progress.percent}%`, background: colorOf(project.color) }} />
            </div>
            {project.description ? <p className="mt-3 whitespace-pre-line text-sm text-ink/70">{project.description}</p> : null}
          </div>
          <dl className="grid grid-cols-3 gap-4 text-center text-sm sm:w-72">
            <div><dt className="text-xs text-ink/50">Open</dt><dd className="text-xl">{open.length}</dd></div>
            <div><dt className="text-xs text-ink/50">In review</dt><dd className="text-xl">{progress.review}</dd></div>
            <div><dt className="text-xs text-ink/50">Overdue</dt><dd className={`text-xl ${overdue.length ? "text-red-800" : ""}`}>{overdue.length}</dd></div>
          </dl>
        </div>
      ) : null}

      {!ready ? (
        <p className="mt-4 border border-amber-800/20 bg-amber-50 px-4 py-3 text-sm">Run <code>supabase/growth.sql</code> in Supabase to turn on tasks.</p>
      ) : !workspaceReady ? (
        <p className="mt-4 border border-amber-800/20 bg-amber-50 px-4 py-3 text-sm">
          Run <code>supabase/workspace.sql</code> in Supabase to turn on projects, steps, submissions, points and weekly updates.
        </p>
      ) : null}
      {query.error ? <p className="mt-4 text-sm text-red-800">{errors[query.error] || "Something went wrong."}</p> : null}

      {manage && toReview.length ? (
        <section className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-50/70 p-4">
          <h2 className="text-sm font-medium">Waiting for your review · {toReview.length}</h2>
          <ul className="mt-2 flex flex-wrap gap-2">
            {toReview.slice(0, 12).map((task) => (
              <li key={task.id}>
                <Link href={`/dashboard/tasks/${task.id}#review`} className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-white px-3 py-1 text-xs hover:bg-amber-100">
                  {task.title}
                  <span className="text-ink/45">{task.assignee_name || "—"}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {workspaceReady && projects.length ? (
        <nav className="mt-5 flex gap-2 overflow-x-auto pb-1 text-sm" aria-label="Projects">
          <Link href={href(query, { project: undefined })} className={`shrink-0 rounded-full border px-3 py-1.5 ${!query.project ? "border-ink bg-ink text-paper" : "border-ink/15 bg-white"}`}>
            All projects
          </Link>
          {activeProjects.map((item) => {
            const count = tasks.filter((task) => task.project_id === item.id && task.status !== "done").length;
            const active = query.project === item.id;
            return (
              <Link key={item.id} href={href(query, { project: item.id })} className={`flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 ${active ? "border-ink bg-ink text-paper" : "border-ink/15 bg-white"}`}>
                <span className="h-2 w-2 rounded-full" style={{ background: colorOf(item.color) }} aria-hidden />
                {item.name}
                <span className={active ? "text-paper/60" : "text-ink/40"}>{count}</span>
              </Link>
            );
          })}
          <Link href={href(query, { project: "none" })} className={`shrink-0 rounded-full border px-3 py-1.5 ${query.project === "none" ? "border-ink bg-ink text-paper" : "border-ink/15 bg-white"}`}>
            No project
          </Link>
        </nav>
      ) : null}

      <details className="mt-4 rounded-xl border border-ink/10 bg-white p-4">
        <summary className="cursor-pointer text-sm font-medium">+ New task{project ? ` in ${project.name}` : ""}</summary>
        <form action={createTask} className="mt-4 grid gap-3 md:grid-cols-3">
          <input type="hidden" name="next" value={here} />
          <label className="text-sm md:col-span-2">Title<input className={control} name="title" required maxLength={200} /></label>
          {workspaceReady ? (
            <label className="text-sm">
              Project
              <select className={control} name="project_id" defaultValue={project?.id || ""}>
                <option value="">No project</option>
                {activeProjects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
          ) : (
            <label className="text-sm">Client or project<input className={control} name="client" maxLength={120} /></label>
          )}
          <label className="text-sm md:col-span-3">Details<textarea className={control} name="description" rows={3} placeholder="What does done look like? Add steps on the task page after creating it." /></label>
          <label className="text-sm">
            Assign to
            <select className={control} name="assignee_id" defaultValue={user.bootstrap ? "" : user.id} disabled={!manage}>
              <option value="">Unassigned</option>
              {people.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
            </select>
          </label>
          <label className="text-sm">Start<input className={control} name="start_at" type="datetime-local" /></label>
          <label className="text-sm">Due<input className={control} name="due_at" type="datetime-local" /></label>
          <label className="text-sm">Estimate (hours)<input className={control} name="estimate_hours" type="number" min="0" step="0.25" /></label>
          <label className="text-sm">
            Priority
            <select className={control} name="priority" defaultValue="normal">
              {PRIORITIES.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
            </select>
          </label>
          {manage && workspaceReady ? (
            <label className="text-sm">
              Points
              <select className={control} name="points" defaultValue="0">
                {POINT_PRESETS.map((value) => <option key={value} value={value}>{value ? `${value} pts` : "No points"}</option>)}
              </select>
            </label>
          ) : (
            <label className="text-sm">
              Column
              <select className={control} name="status" defaultValue="todo">
                {STATUSES.filter((status) => status.id !== "done").map((status) => <option key={status.id} value={status.id}>{status.label}</option>)}
              </select>
            </label>
          )}
          {workspaceReady ? <label className="text-sm">Client (optional)<input className={control} name="client" maxLength={120} defaultValue={project?.client || ""} /></label> : null}
          <div className="flex items-end"><SubmitButton label="Create task" pendingLabel="Saving" dark /></div>
        </form>
      </details>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <form method="get" className="flex flex-wrap items-center gap-2 text-sm">
          {query.project ? <input type="hidden" name="project" value={query.project} /> : null}
          <input type="hidden" name="view" value={view} />
          <select name="who" defaultValue={who} className="rounded-full border border-ink/15 bg-white px-3 py-1.5">
            <option value="all">Everyone</option>
            <option value="me">Only mine</option>
            {people.filter((person) => person.id !== user.id).map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
          </select>
          <input name="q" defaultValue={query.q || ""} placeholder="Search tasks" className="rounded-full border border-ink/15 bg-white px-3 py-1.5" />
          <button type="submit" className="rounded-full bg-ink px-4 py-1.5 text-paper">Filter</button>
        </form>
        <div className="flex rounded-full border border-ink/15 bg-white p-0.5 text-sm" role="tablist" aria-label="View">
          {VIEWS.map((item) => (
            <Link key={item.id} href={href(query, { view: item.id === "board" ? undefined : item.id })} role="tab" aria-selected={view === item.id} className={`rounded-full px-3 py-1 ${view === item.id ? "bg-ink text-paper" : "text-ink/65"}`}>
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-4">
        {view === "timeline" ? (
          <TaskTimeline groups={timeline} undated={undated} />
        ) : view === "list" ? (
          <div className="overflow-x-auto rounded-2xl border border-ink/10 bg-white">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-ink/10 text-xs text-ink/50">
                <tr>
                  <th className="px-3 py-2 font-normal">Task</th>
                  {!project ? <th className="px-3 py-2 font-normal">Project</th> : null}
                  <th className="px-3 py-2 font-normal">Assignee</th>
                  <th className="px-3 py-2 font-normal">Status</th>
                  <th className="px-3 py-2 font-normal">Steps</th>
                  <th className="px-3 py-2 font-normal">Points</th>
                  <th className="px-3 py-2 font-normal">Due</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/5">
                {[...visible]
                  .sort((a, b) => (Date.parse(a.due_at || "9999-01-01") || 0) - (Date.parse(b.due_at || "9999-01-01") || 0))
                  .map((task) => {
                    const owner = task.project_id ? projectById.get(task.project_id) : undefined;
                    const count = steps.get(task.id);
                    const late = task.status !== "done" && task.due_at && Date.parse(task.due_at) < Date.now();
                    return (
                      <tr key={task.id} className="hover:bg-ink/[0.02]">
                        <td className="px-3 py-2"><Link href={`/dashboard/tasks/${task.id}`} className="font-medium hover:underline">{task.title}</Link></td>
                        {!project ? (
                          <td className="px-3 py-2 text-ink/65">
                            {owner ? <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: colorOf(owner.color) }} />{owner.name}</span> : "—"}
                          </td>
                        ) : null}
                        <td className="px-3 py-2 text-ink/65">{task.assignee_name || "Unassigned"}</td>
                        <td className="px-3 py-2">{STATUSES.find((status) => status.id === task.status)?.label}</td>
                        <td className="px-3 py-2 text-ink/65">{count?.total ? `${count.done}/${count.total}` : "—"}</td>
                        <td className="px-3 py-2 text-ink/65">{task.points || "—"}</td>
                        <td className={`px-3 py-2 ${late ? "font-medium text-red-800" : "text-ink/65"}`}>{task.due_at ? shortDate(task.due_at) : "—"}</td>
                      </tr>
                    );
                  })}
                {!visible.length ? <tr><td colSpan={7} className="px-3 py-8 text-center text-ink/50">No tasks match.</td></tr> : null}
              </tbody>
            </table>
          </div>
        ) : (
          <TaskBoard key={`${who}-${term}-${query.project}-${board.length}`} columns={STATUSES.map((status) => ({ id: status.id, label: status.id === "done" ? "Done ✓ approved" : status.label }))} tasks={board} back={here} />
        )}
      </div>
    </div>
  );
}
