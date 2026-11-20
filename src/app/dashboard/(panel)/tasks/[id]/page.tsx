import Link from "next/link";
import { notFound } from "next/navigation";
import { can } from "@/lib/access";
import { requireArea } from "@/lib/auth";
import { addTimeEntry, deleteTask, deleteTimeEntry, startTimer, stopTimer, updateTask } from "@/lib/team-actions";
import { canCloseTask, canModifyTask, formatMinutes, getTask, minutesOf, PRIORITIES, runningEntry, staffDirectory, STATUSES, type TimeEntry } from "@/lib/team";
import { listProjects, stepsFor, threadFor } from "@/lib/workspace";
import { addComment, addStep, deleteStep, reviewTask, submitTask, toggleStep } from "@/lib/workspace-actions";
import { colorOf, POINT_PRESETS } from "@/lib/workspace-shared";
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

const MESSAGES: Record<string, string> = {
  saved: "Saved.",
  submitted: "Submitted for review. Your manager has been notified.",
  approved: "Approved — points awarded.",
  returned: "Sent back with your feedback."
};

const ERRORS: Record<string, string> = {
  time: "Enter between 1 minute and 24 hours.",
  denied: "You cannot change this task.",
  submission: "Add a short note or a link to what you delivered.",
  feedback: "Say what needs to change so they can fix it.",
  closed: "This task is already approved.",
  setup: "Run supabase/workspace.sql in Supabase to turn on submissions."
};

const KIND: Record<string, { label: string; tone: string }> = {
  comment: { label: "commented", tone: "border-ink/10" },
  submitted: { label: "submitted for review", tone: "border-amber-400/50 bg-amber-50/60" },
  approved: { label: "approved", tone: "border-moss/40 bg-moss/5" },
  changes: { label: "requested changes", tone: "border-red-300 bg-red-50/60" }
};

function when(iso: string) {
  return new Date(iso).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

export default async function TaskPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; submitted?: string; approved?: string; returned?: string; error?: string }>;
}) {
  const user = await requireArea("tasks", "view");
  const { id } = await params;
  const query = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const task = await getTask(id);
  if (!task) notFound();
  const [people, running, entriesResult, { ready: workspaceReady, projects }, steps, updates] = await Promise.all([
    staffDirectory().catch(() => []),
    runningEntry(user.id),
    admin().from("time_entries").select("*").eq("task_id", id).order("started_at", { ascending: false }).limit(200),
    listProjects(),
    stepsFor(id),
    threadFor(id)
  ]);
  const entries = (entriesResult.data || []) as TimeEntry[];
  const logged = entries.reduce((sum, entry) => sum + minutesOf(entry), 0);
  const editable = canModifyTask(user, task);
  const manage = can(user, "tasks", "edit");
  const here = `/dashboard/tasks/${id}`;
  const project = task.project_id ? projects.find((item) => item.id === task.project_id) : undefined;
  const stepsDone = steps.filter((step) => step.done).length;
  const notice = Object.keys(MESSAGES).find((key) => query[key as keyof typeof query]);
  const lastChange = updates.find((update) => update.kind === "changes");
  const returned = task.status === "doing" && lastChange && (!task.submitted_at || Date.parse(lastChange.created_at) > Date.parse(task.submitted_at));
  const selfClose = canCloseTask(user, task);

  return (
    <div className="max-w-5xl">
      <Link href={project ? `/dashboard/tasks?project=${project.id}` : "/dashboard/tasks"} className="text-sm text-ink/60">
        ← {project ? project.name : "Tasks"}
      </Link>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="font-serif text-4xl">{task.title}</h1>
        <span className={`rounded-full px-2 py-0.5 text-xs ${task.status === "review" ? "bg-amber-100 text-amber-900" : task.status === "done" ? "bg-moss/10 text-moss" : "bg-ink/5"}`}>
          {task.status === "done" ? "Approved" : STATUSES.find((status) => status.id === task.status)?.label}
        </span>
        {task.points ? <span className="rounded-full bg-lime/50 px-2 py-0.5 text-xs font-medium">{task.points} pts</span> : null}
      </div>
      <p className="mt-2 flex flex-wrap items-center gap-x-2 text-sm text-ink/60">
        {project ? (
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: colorOf(project.color) }} />
            {project.name} ·
          </span>
        ) : null}
        Created by {task.created_by_name || "someone"} · {formatMinutes(logged)} logged{task.estimate_minutes ? ` of ${formatMinutes(task.estimate_minutes)} estimated` : ""}
        {task.completed_at ? ` · approved ${new Date(task.completed_at).toLocaleDateString()}${task.approved_by_name ? ` by ${task.approved_by_name}` : ""}` : ""}
      </p>
      {notice ? <p className="mt-3 text-sm text-moss">{MESSAGES[notice]}</p> : null}
      {query.error ? <p className="mt-3 text-sm text-red-800">{ERRORS[query.error] || "Could not save."}</p> : null}
      {returned ? (
        <div className="mt-4 rounded-xl border border-red-300 bg-red-50/70 px-4 py-3 text-sm">
          <p className="font-medium text-red-900">Changes requested by {lastChange!.user_name}</p>
          <p className="mt-1 whitespace-pre-line text-ink/75">{lastChange!.body}</p>
        </div>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-8">
          {/* Steps */}
          <section id="steps">
            <div className="flex items-baseline justify-between">
              <h2 className="font-serif text-2xl">Steps</h2>
              {steps.length ? <span className="text-sm text-ink/55">{stepsDone}/{steps.length} done</span> : null}
            </div>
            {steps.length ? (
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink/5">
                <div className="h-full rounded-full bg-moss/70" style={{ width: `${(stepsDone / steps.length) * 100}%` }} />
              </div>
            ) : null}
            <ol className="mt-3 divide-y divide-ink/5 rounded-xl border border-ink/10 bg-white">
              {steps.map((step, index) => (
                <li key={step.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                  <form action={toggleStep}>
                    <input type="hidden" name="task_id" value={task.id} />
                    <input type="hidden" name="id" value={step.id} />
                    <input type="hidden" name="done" value={step.done ? "0" : "1"} />
                    <button
                      type="submit"
                      disabled={!editable}
                      aria-label={step.done ? `Mark step ${index + 1} not done` : `Mark step ${index + 1} done`}
                      className={`grid h-5 w-5 place-items-center rounded border text-[11px] ${step.done ? "border-moss bg-moss text-white" : "border-ink/25 bg-white hover:border-moss"}`}
                    >
                      {step.done ? "✓" : ""}
                    </button>
                  </form>
                  <span className="w-5 text-xs text-ink/40">{index + 1}.</span>
                  <span className={`flex-1 ${step.done ? "text-ink/45 line-through" : ""}`}>{step.title}</span>
                  {step.done && step.done_by_name ? <span className="hidden text-xs text-ink/40 sm:inline">{step.done_by_name}</span> : null}
                  {editable ? (
                    <form action={deleteStep}>
                      <input type="hidden" name="task_id" value={task.id} />
                      <input type="hidden" name="id" value={step.id} />
                      <button type="submit" className="text-xs text-ink/35 hover:text-red-800" aria-label={`Remove step ${index + 1}`}>✕</button>
                    </form>
                  ) : null}
                </li>
              ))}
              {!steps.length ? <li className="px-3 py-4 text-sm text-ink/50">Break the work into steps so progress is visible.</li> : null}
            </ol>
            {editable && workspaceReady ? (
              <form action={addStep} className="mt-2 flex flex-wrap items-start gap-2">
                <input type="hidden" name="task_id" value={task.id} />
                <textarea name="title" rows={1} placeholder="Add a step — paste several lines to add many" className="min-h-[40px] min-w-0 flex-1 rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm" />
                <button type="submit" className="rounded-full bg-ink px-4 py-2 text-sm text-paper">Add</button>
              </form>
            ) : null}
          </section>

          {/* Submission / review */}
          {workspaceReady ? (
            <section id="review" className="rounded-2xl border border-ink/10 bg-white p-4">
              <h2 className="font-serif text-2xl">Submission</h2>
              {task.status === "review" ? (
                <div className="mt-3 rounded-xl border border-amber-400/50 bg-amber-50/60 p-3 text-sm">
                  <p className="font-medium">Submitted {task.submitted_at ? when(task.submitted_at) : ""} — waiting for approval</p>
                  {task.submission_note ? <p className="mt-1 whitespace-pre-line text-ink/75">{task.submission_note}</p> : null}
                  {task.submission_url ? (
                    <a href={task.submission_url} target="_blank" rel="noreferrer noopener" className="mt-2 inline-block break-all text-moss underline">{task.submission_url}</a>
                  ) : null}
                </div>
              ) : task.status === "done" ? (
                <p className="mt-2 text-sm text-moss">✓ Approved{task.approved_by_name ? ` by ${task.approved_by_name}` : ""}{task.points ? ` · ${task.points} points to ${task.assignee_name || "the assignee"}` : ""}.</p>
              ) : null}

              {editable && task.status !== "done" ? (
                <form action={submitTask} className="mt-3 grid gap-2">
                  <input type="hidden" name="task_id" value={task.id} />
                  <label className="text-sm">
                    {task.status === "review" ? "Update your submission" : "What did you deliver?"}
                    <textarea className={control} name="note" rows={3} defaultValue={task.status === "review" ? task.submission_note : ""} placeholder="Summary of the work, anything the reviewer should check" />
                  </label>
                  <label className="text-sm">
                    Link (Figma, staging URL, file, PR)
                    <input className={control} name="link" type="url" defaultValue={task.status === "review" ? task.submission_url : ""} placeholder="https://" />
                  </label>
                  <div className="flex flex-wrap items-center gap-3">
                    <SubmitButton label={task.status === "review" ? "Resubmit" : "Submit for review"} pendingLabel="Submitting" />
                    {steps.length && stepsDone < steps.length ? <span className="text-xs text-amber-800">{steps.length - stepsDone} step(s) still open</span> : null}
                    {selfClose && !manage ? <span className="text-xs text-ink/50">Personal task — you can also drag it to Done yourself.</span> : null}
                  </div>
                </form>
              ) : null}

              {manage && task.status !== "done" ? (
                <form action={reviewTask} className="mt-4 grid gap-2 border-t border-ink/10 pt-4">
                  <input type="hidden" name="task_id" value={task.id} />
                  <p className="text-sm font-medium">Review</p>
                  <label className="text-sm">Feedback<textarea className={control} name="note" rows={2} placeholder="Required when requesting changes" /></label>
                  <div className="flex flex-wrap items-end gap-2">
                    <label className="text-sm">
                      Points
                      <select className={control} name="points" defaultValue={String(task.points)}>
                        {[...new Set([...POINT_PRESETS, task.points])].sort((a, b) => a - b).map((value) => (
                          <option key={value} value={value}>{value} pts</option>
                        ))}
                      </select>
                    </label>
                    <button type="submit" name="decision" value="approve" className="rounded-full bg-moss px-4 py-2.5 text-sm text-white">✓ Approve</button>
                    <button type="submit" name="decision" value="changes" className="rounded-full border border-red-300 px-4 py-2.5 text-sm text-red-800">Request changes</button>
                  </div>
                </form>
              ) : null}
            </section>
          ) : null}

          {/* Thread */}
          <section id="thread">
            <h2 className="font-serif text-2xl">Updates & comments</h2>
            {workspaceReady ? (
              <form action={addComment} className="mt-3 grid gap-2">
                <input type="hidden" name="task_id" value={task.id} />
                <textarea name="body" rows={2} placeholder="Post a progress update or ask a question" className="rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm" />
                <div className="flex flex-wrap gap-2">
                  <input name="link" type="url" placeholder="Optional link" className="min-w-0 flex-1 rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm" />
                  <SubmitButton label="Post" pendingLabel="Posting" dark />
                </div>
              </form>
            ) : null}
            <ol className="mt-4 space-y-3">
              {updates.map((update) => (
                <li key={update.id} className={`rounded-xl border bg-white p-3 text-sm ${KIND[update.kind]?.tone || "border-ink/10"}`}>
                  <p className="text-xs text-ink/55">
                    <span className="font-medium text-ink">{update.user_name}</span> {KIND[update.kind]?.label || "posted"} · {when(update.created_at)}
                  </p>
                  {update.body ? <p className="mt-1 whitespace-pre-line">{update.body}</p> : null}
                  {update.link ? <a href={update.link} target="_blank" rel="noreferrer noopener" className="mt-1 inline-block break-all text-moss underline">{update.link}</a> : null}
                </li>
              ))}
              {!updates.length ? <li className="text-sm text-ink/50">No updates yet.</li> : null}
            </ol>
          </section>

          {/* Time */}
          <section>
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
                    <span className="font-medium">{entry.user_name}</span> · {when(entry.started_at)}
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
        </div>

        {/* Sidebar: details */}
        <aside className="space-y-4">
          {editable ? (
            running?.task_id === task.id ? (
              <form action={stopTimer}>
                <input type="hidden" name="next" value={here} />
                <button className="w-full rounded-full bg-red-800 px-4 py-2.5 text-sm text-white" type="submit">■ Stop timer</button>
              </form>
            ) : task.status !== "done" ? (
              <form action={startTimer}>
                <input type="hidden" name="task_id" value={task.id} />
                <input type="hidden" name="next" value={here} />
                <button className="w-full rounded-full bg-moss px-4 py-2.5 text-sm text-white" type="submit">▶ Start timer</button>
              </form>
            ) : null
          ) : null}

          <form action={updateTask} className="grid gap-3 rounded-xl border border-ink/10 bg-white p-4">
            <fieldset disabled={!editable} className="contents">
              <input type="hidden" name="id" value={task.id} />
              <label className="text-sm">Title<input className={control} name="title" defaultValue={task.title} required maxLength={200} /></label>
              {workspaceReady ? (
                <label className="text-sm">
                  Project
                  <select className={control} name="project_id" defaultValue={task.project_id || ""}>
                    <option value="">No project</option>
                    {projects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                </label>
              ) : null}
              <label className="text-sm">Client<input className={control} name="client" defaultValue={task.client} maxLength={120} /></label>
              <label className="text-sm">Details<textarea className={control} name="description" rows={5} defaultValue={task.description} /></label>
              <label className="text-sm">
                Status
                <select className={control} name="status" defaultValue={task.status}>
                  {STATUSES.filter((status) => status.id !== "done" || selfClose || task.status === "done").map((status) => (
                    <option key={status.id} value={status.id}>{status.id === "done" ? "Done (approved)" : status.label}</option>
                  ))}
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
              {workspaceReady ? <label className="text-sm">Start<input className={control} name="start_at" type="datetime-local" defaultValue={local(task.start_at)} /></label> : null}
              <label className="text-sm">Due<input className={control} name="due_at" type="datetime-local" defaultValue={local(task.due_at)} /></label>
              <label className="text-sm">Estimate (hours)<input className={control} name="estimate_hours" type="number" min="0" step="0.25" defaultValue={task.estimate_minutes ? task.estimate_minutes / 60 : ""} /></label>
              {workspaceReady ? (
                manage ? (
                  <label className="text-sm">
                    Points
                    <select className={control} name="points" defaultValue={String(task.points)}>
                      {[...new Set([...POINT_PRESETS, task.points])].sort((a, b) => a - b).map((value) => <option key={value} value={value}>{value ? `${value} pts` : "No points"}</option>)}
                    </select>
                  </label>
                ) : (
                  <p className="text-sm text-ink/60">Points: {task.points || "—"} <span className="text-xs">(set by a manager)</span></p>
                )
              ) : null}
              <SubmitButton label="Save details" pendingLabel="Saving" dark />
            </fieldset>
          </form>

          {manage || task.created_by === user.id ? (
            <form action={deleteTask}>
              <input type="hidden" name="id" value={task.id} />
              <button type="submit" className="text-sm text-red-800">Delete task</button>
            </form>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
