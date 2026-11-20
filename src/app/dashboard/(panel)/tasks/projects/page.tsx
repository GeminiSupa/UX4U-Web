import Link from "next/link";
import { can } from "@/lib/access";
import { requireArea } from "@/lib/auth";
import { listTasks, staffDirectory } from "@/lib/team";
import { listProjects, type WorkProject } from "@/lib/workspace";
import { deleteWorkProject, saveWorkProject } from "@/lib/workspace-actions";
import { colorOf, PROJECT_COLORS, PROJECT_STATUSES, progressOf } from "@/lib/workspace-shared";
import { control } from "@/lib/ui";
import { SubmitButton } from "@/components/SubmitButton";

export const dynamic = "force-dynamic";

function fmt(value: string | null) {
  return value ? new Date(`${value}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : "—";
}

function ProjectFields({ project, people, wide = true }: { project?: WorkProject; people: { id: string; name: string }[]; wide?: boolean }) {
  const two = wide ? "md:col-span-2" : "";
  const three = wide ? "md:col-span-3" : "";
  return (
    <>
      <label className={`text-sm ${two}`}>Name<input className={control} name="name" required maxLength={120} defaultValue={project?.name} /></label>
      <label className="text-sm">Client<input className={control} name="client" maxLength={120} defaultValue={project?.client} /></label>
      <label className={`text-sm ${three}`}>Goal and scope<textarea className={control} name="description" rows={3} defaultValue={project?.description} placeholder="What are we delivering, for whom, and how do we know it is done?" /></label>
      <label className="text-sm">
        Lead
        <select className={control} name="lead_id" defaultValue={project?.lead_id || ""}>
          <option value="">No lead</option>
          {people.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
        </select>
      </label>
      <label className="text-sm">Start<input className={control} name="start_date" type="date" defaultValue={project?.start_date || ""} /></label>
      <label className="text-sm">Deadline<input className={control} name="due_date" type="date" defaultValue={project?.due_date || ""} /></label>
      <label className="text-sm">
        Status
        <select className={control} name="status" defaultValue={project?.status || "active"}>
          {PROJECT_STATUSES.map((status) => <option key={status.id} value={status.id}>{status.label}</option>)}
        </select>
      </label>
      <fieldset className={`text-sm ${two}`}>
        <legend>Colour</legend>
        <div className="mt-1 flex flex-wrap gap-2">
          {Object.entries(PROJECT_COLORS).map(([name, hex]) => (
            <label key={name} className="cursor-pointer">
              <input type="radio" name="color" value={name} defaultChecked={(project?.color || "moss") === name} className="peer sr-only" />
              <span className="block h-7 w-7 rounded-full ring-offset-2 peer-checked:ring-2 peer-checked:ring-ink peer-focus-visible:ring-2 peer-focus-visible:ring-ink/50" style={{ background: hex }} title={name} />
            </label>
          ))}
        </div>
      </fieldset>
    </>
  );
}

export default async function WorkProjectsPage({ searchParams }: { searchParams: Promise<{ error?: string; saved?: string; show?: string }> }) {
  const user = await requireArea("tasks", "view");
  const manage = can(user, "tasks", "edit");
  const query = await searchParams;
  const [{ ready, projects }, { tasks }, people] = await Promise.all([listProjects(), listTasks(), staffDirectory().catch(() => [])]);
  const showAll = query.show === "all";
  const shown = projects.filter((project) => showAll || project.status !== "done");
  const now = Date.now();

  return (
    <div>
      <Link href="/dashboard/tasks" className="text-sm text-ink/60">← Tasks</Link>
      <div className="mt-1 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl">Projects</h1>
          <p className="mt-2 max-w-xl text-sm text-ink/65">Each project has its own board, timeline and progress. Tasks are submitted for review and approved here before points count.</p>
        </div>
        <Link href={showAll ? "/dashboard/tasks/projects" : "/dashboard/tasks/projects?show=all"} className="rounded-full border border-ink/15 px-4 py-2 text-sm">
          {showAll ? "Hide delivered" : "Show delivered"}
        </Link>
      </div>
      {!ready ? (
        <p className="mt-4 border border-amber-800/20 bg-amber-50 px-4 py-3 text-sm">Run <code>supabase/workspace.sql</code> in Supabase to turn on projects.</p>
      ) : null}
      {query.error ? <p className="mt-4 text-sm text-red-800">{query.error === "name" ? "Give the project a name." : "Could not save that project."}</p> : null}
      {query.saved ? <p className="mt-4 text-sm text-moss">Saved.</p> : null}

      {manage && ready ? (
        <details className="mt-5 rounded-xl border border-ink/10 bg-white p-4" open={!projects.length}>
          <summary className="cursor-pointer text-sm font-medium">+ New project</summary>
          <form action={saveWorkProject} className="mt-4 grid gap-3 md:grid-cols-3">
            <ProjectFields people={people} />
            <div className="flex items-end"><SubmitButton label="Create project" pendingLabel="Saving" dark /></div>
          </form>
        </details>
      ) : null}

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {shown.map((project) => {
          const own = tasks.filter((task) => task.project_id === project.id);
          const progress = progressOf(own, now);
          const team = [...new Set(own.map((task) => task.assignee_name).filter(Boolean))];
          const color = colorOf(project.color);
          const daysLeft = project.due_date ? Math.ceil((Date.parse(`${project.due_date}T23:59:59Z`) - now) / 86400000) : null;
          const late = daysLeft !== null && daysLeft < 0 && project.status !== "done";
          return (
            <article key={project.id} className="flex flex-col overflow-hidden rounded-2xl border border-ink/10 bg-white">
              <div className="h-1.5" style={{ background: color }} />
              <div className="flex flex-1 flex-col p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Link href={`/dashboard/tasks?project=${project.id}`} className="block truncate text-lg font-medium hover:underline">{project.name}</Link>
                    <p className="truncate text-xs text-ink/55">{[project.client, project.lead_name ? `Lead: ${project.lead_name}` : ""].filter(Boolean).join(" · ") || "No client"}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-ink/5 px-2 py-0.5 text-xs">{PROJECT_STATUSES.find((s) => s.id === project.status)?.label}</span>
                </div>
                <div className="mt-4 flex items-baseline justify-between text-xs">
                  <span className="font-medium">{progress.percent}%</span>
                  <span className="text-ink/55">{progress.done}/{progress.total} tasks{progress.points ? ` · ${progress.pointsDone}/${progress.points} pts` : ""}</span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-ink/5">
                  <div className="h-full rounded-full" style={{ width: `${progress.percent}%`, background: color }} />
                </div>
                <dl className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded-lg bg-ink/[0.03] py-2"><dt className="text-ink/50">Open</dt><dd className="text-base">{progress.total - progress.done}</dd></div>
                  <div className="rounded-lg bg-ink/[0.03] py-2"><dt className="text-ink/50">Review</dt><dd className="text-base">{progress.review}</dd></div>
                  <div className="rounded-lg bg-ink/[0.03] py-2"><dt className="text-ink/50">Overdue</dt><dd className={`text-base ${progress.overdue ? "text-red-800" : ""}`}>{progress.overdue}</dd></div>
                </dl>
                <p className="mt-3 text-xs text-ink/55">
                  {fmt(project.start_date)} → {fmt(project.due_date)}
                  {daysLeft !== null && project.status !== "done" ? (
                    <span className={late ? "ml-1 font-medium text-red-800" : "ml-1"}>· {late ? `${-daysLeft}d late` : `${daysLeft}d left`}</span>
                  ) : null}
                </p>
                {team.length ? (
                  <div className="mt-3 flex -space-x-1.5" title={team.join(", ")}>
                    {team.slice(0, 6).map((name) => (
                      <span key={name} className="grid h-7 w-7 place-items-center rounded-full border-2 border-white bg-ink text-[10px] text-lime">{name.slice(0, 1).toUpperCase()}</span>
                    ))}
                    {team.length > 6 ? <span className="grid h-7 w-7 place-items-center rounded-full border-2 border-white bg-ink/10 text-[10px]">+{team.length - 6}</span> : null}
                  </div>
                ) : null}
                <div className="mt-auto flex flex-wrap gap-2 pt-4 text-xs">
                  <Link href={`/dashboard/tasks?project=${project.id}`} className="rounded-full bg-ink px-3 py-1.5 text-paper">Board</Link>
                  <Link href={`/dashboard/tasks?project=${project.id}&view=timeline`} className="rounded-full border border-ink/15 px-3 py-1.5">Timeline</Link>
                  <Link href={`/dashboard/tasks?project=${project.id}&view=list`} className="rounded-full border border-ink/15 px-3 py-1.5">List</Link>
                </div>
                {manage ? (
                  <details className="mt-3 border-t border-ink/10 pt-3">
                    <summary className="cursor-pointer text-xs text-ink/60">Edit project</summary>
                    <form action={saveWorkProject} className="mt-3 grid gap-3">
                      <input type="hidden" name="id" value={project.id} />
                      <ProjectFields project={project} people={people} wide={false} />
                      <div className="flex items-end"><SubmitButton label="Save" pendingLabel="Saving" dark /></div>
                    </form>
                    <form action={deleteWorkProject} className="mt-3">
                      <input type="hidden" name="id" value={project.id} />
                      <button type="submit" className="text-xs text-red-800">Delete project (tasks are kept)</button>
                    </form>
                  </details>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
      {ready && !shown.length ? (
        <p className="mt-6 rounded-xl border border-ink/10 bg-white px-4 py-8 text-center text-sm text-ink/50">
          {manage ? "No projects yet. Create one above, then add tasks to it." : "No projects yet. A manager will set them up."}
        </p>
      ) : null}
    </div>
  );
}
