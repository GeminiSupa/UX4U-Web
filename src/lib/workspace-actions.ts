"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { can } from "./access";
import { getUserById, listUsers, logActivity, requireArea } from "./auth";
import { admin } from "./supabase";
import { canModifyTask, getTask, notify, type Task } from "./team";
import { getProject } from "./workspace";
import { isProjectStatus, PROJECT_COLORS, weekStart } from "./workspace-shared";

function text(form: FormData, key: string, max = 300) {
  return String(form.get(key) || "").trim().slice(0, max);
}

function uuid(value: string) {
  return /^[0-9a-f-]{36}$/i.test(value) ? value : "";
}

function dateOnly(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

function back(form: FormData, fallback: string) {
  const next = text(form, "next", 200);
  return next.startsWith("/dashboard") ? next : fallback;
}

function withFlag(path: string, flag: string) {
  return `${path}${path.includes("?") ? "&" : "?"}${flag}`;
}

/** People who should hear about a submission: the task creator, the project lead, else the owners. */
async function reviewersFor(task: Task, actorId: string) {
  const ids = new Set<string>();
  if (task.created_by && task.created_by !== actorId) ids.add(task.created_by);
  if (task.project_id) {
    const project = await getProject(task.project_id);
    if (project?.lead_id && project.lead_id !== actorId) ids.add(project.lead_id);
  }
  const users = await listUsers().catch(() => []);
  const managers = users.filter((person) => person.active && person.id !== actorId && can(person, "tasks", "edit"));
  const valid = new Set(managers.map((person) => person.id));
  const chosen = [...ids].filter((id) => valid.has(id));
  if (!chosen.length) return managers.filter((person) => person.role === "owner");
  return managers.filter((person) => chosen.includes(person.id));
}

async function thread(taskId: string, user: { id: string; name: string; bootstrap?: boolean }, kind: string, body: string, link = "") {
  await admin()
    .from("task_updates")
    .insert({ task_id: taskId, user_id: user.bootstrap ? null : user.id, user_name: user.name, kind, body: body.slice(0, 4000), link: link.slice(0, 500) });
}

function safeUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : "";
  } catch {
    return "";
  }
}

/* ---------------------------------------------------------------- Projects */

export async function saveWorkProject(form: FormData) {
  const user = await requireArea("tasks", "edit");
  const id = uuid(text(form, "id"));
  const name = text(form, "name", 120);
  const to = back(form, "/dashboard/tasks/projects");
  if (!name) redirect(withFlag(to, "error=name"));
  const leadId = uuid(text(form, "lead_id"));
  const lead = leadId ? await getUserById(leadId) : null;
  const color = text(form, "color", 20);
  const status = text(form, "status", 20);
  const row = {
    name,
    client: text(form, "client", 120),
    description: text(form, "description", 3000),
    color: color in PROJECT_COLORS ? color : "moss",
    status: isProjectStatus(status) ? status : "active",
    start_date: dateOnly(text(form, "start_date", 10)),
    due_date: dateOnly(text(form, "due_date", 10)),
    lead_id: lead?.id || null,
    lead_name: lead?.name || "",
    updated_at: new Date().toISOString()
  };
  const result = id
    ? await admin().from("work_projects").update(row).eq("id", id).select("id").single()
    : await admin().from("work_projects").insert({ ...row, created_by_name: user.name }).select("id").single();
  if (result.error || !result.data) redirect(withFlag(to, "error=save"));
  await logActivity(user, "tasks", id ? "Updated a project" : "Created a project", name);
  if (lead && lead.id !== user.id && !id) {
    await notify(lead.id, { kind: "project", body: `You are leading the project: ${name}`, link: `/dashboard/tasks?project=${result.data.id}` });
  }
  revalidatePath("/dashboard/tasks", "layout");
  redirect(id ? withFlag(to, "saved=1") : `/dashboard/tasks?project=${result.data.id}`);
}

export async function deleteWorkProject(form: FormData) {
  const user = await requireArea("tasks", "edit");
  const project = await getProject(text(form, "id"));
  if (project) {
    // Tasks stay; their project link is cleared by the foreign key.
    await admin().from("work_projects").delete().eq("id", project.id);
    await logActivity(user, "tasks", "Deleted a project", project.name);
  }
  revalidatePath("/dashboard/tasks", "layout");
  redirect("/dashboard/tasks/projects");
}

/* ---------------------------------------------------------------- Steps */

async function taskForChange(form: FormData) {
  const user = await requireArea("tasks", "view");
  const task = await getTask(uuid(text(form, "task_id")));
  if (!task) redirect("/dashboard/tasks");
  if (!canModifyTask(user, task!)) redirect(`/dashboard/tasks/${task!.id}?error=denied`);
  return { user, task: task! };
}

export async function addStep(form: FormData) {
  const { task } = await taskForChange(form);
  const lines = text(form, "title", 4000)
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "").trim().slice(0, 300))
    .filter(Boolean)
    .slice(0, 30);
  if (lines.length) {
    const base = Date.now() / 1000;
    await admin().from("task_steps").insert(lines.map((title, index) => ({ task_id: task.id, title, position: base + index })));
  }
  revalidatePath("/dashboard/tasks");
  redirect(`/dashboard/tasks/${task.id}#steps`);
}

export async function toggleStep(form: FormData) {
  const { user, task } = await taskForChange(form);
  const id = uuid(text(form, "id"));
  const done = text(form, "done") === "1";
  await admin()
    .from("task_steps")
    .update({ done, done_at: done ? new Date().toISOString() : null, done_by_name: done ? user.name : "" })
    .eq("id", id)
    .eq("task_id", task.id);
  if (done && task.status === "todo") {
    await admin().from("tasks").update({ status: "doing", updated_at: new Date().toISOString() }).eq("id", task.id);
  }
  revalidatePath("/dashboard/tasks");
  redirect(`/dashboard/tasks/${task.id}#steps`);
}

export async function deleteStep(form: FormData) {
  const { task } = await taskForChange(form);
  await admin().from("task_steps").delete().eq("id", uuid(text(form, "id"))).eq("task_id", task.id);
  revalidatePath("/dashboard/tasks");
  redirect(`/dashboard/tasks/${task.id}#steps`);
}

/* ---------------------------------------------------------------- Submission and review */

export async function submitTask(form: FormData) {
  const { user, task } = await taskForChange(form);
  const here = `/dashboard/tasks/${task.id}`;
  if (task.status === "done") redirect(withFlag(here, "error=closed"));
  const note = text(form, "note", 4000);
  const link = safeUrl(text(form, "link", 500));
  if (!note && !link) redirect(withFlag(here, "error=submission"));
  const now = new Date().toISOString();
  const { error } = await admin()
    .from("tasks")
    .update({ status: "review", submitted_at: now, submission_note: note, submission_url: link, updated_at: now })
    .eq("id", task.id);
  if (error) redirect(withFlag(here, "error=setup"));
  await thread(task.id, user, "submitted", note, link);
  await logActivity(user, "tasks", "Submitted a task for review", task.title);
  for (const reviewer of await reviewersFor(task, user.id)) {
    await notify(reviewer.id, {
      kind: "review",
      body: `${user.name} submitted “${task.title}” for review`,
      link: here,
      email: { to: reviewer.email, subject: `Review needed: ${task.title}` }
    });
  }
  revalidatePath("/dashboard/tasks");
  redirect(withFlag(here, "submitted=1"));
}

export async function reviewTask(form: FormData) {
  const user = await requireArea("tasks", "edit");
  const task = await getTask(uuid(text(form, "task_id")));
  if (!task) redirect("/dashboard/tasks");
  const here = `/dashboard/tasks/${task!.id}`;
  const approve = text(form, "decision") === "approve";
  const note = text(form, "note", 4000);
  if (!approve && !note) redirect(withFlag(here, "error=feedback"));
  const now = new Date().toISOString();
  const pointsRaw = text(form, "points", 6);
  const points = pointsRaw ? Math.max(0, Math.min(100, Math.round(Number(pointsRaw) || 0))) : task!.points;
  const { error } = await admin()
    .from("tasks")
    .update(
      approve
        ? { status: "done", completed_at: task!.completed_at || now, approved_by_name: user.name, points, updated_at: now }
        : { status: "doing", completed_at: null, approved_by_name: "", updated_at: now }
    )
    .eq("id", task!.id);
  if (error) redirect(withFlag(here, "error=setup"));
  await thread(task!.id, user, approve ? "approved" : "changes", note || (approve ? `Approved · ${points} pts` : ""));
  await logActivity(user, "tasks", approve ? "Approved a task" : "Requested changes", task!.title);
  if (task!.assignee_id && task!.assignee_id !== user.id) {
    const person = await getUserById(task!.assignee_id);
    if (person) {
      await notify(person.id, {
        kind: approve ? "approved" : "changes",
        body: approve ? `Approved: ${task!.title}${points ? ` (+${points} pts)` : ""}` : `Changes requested on ${task!.title}: ${note}`,
        link: here,
        email: { to: person.email, subject: approve ? `Approved: ${task!.title}` : `Changes requested: ${task!.title}` }
      });
    }
  }
  revalidatePath("/dashboard/tasks");
  redirect(withFlag(here, approve ? "approved=1" : "returned=1"));
}

export async function addComment(form: FormData) {
  const user = await requireArea("tasks", "view");
  const task = await getTask(uuid(text(form, "task_id")));
  if (!task) redirect("/dashboard/tasks");
  const body = text(form, "body", 4000);
  const here = `/dashboard/tasks/${task!.id}`;
  if (!body) redirect(`${here}#thread`);
  await thread(task!.id, user, "comment", body, safeUrl(text(form, "link", 500)));
  const told = new Set<string>([user.id]);
  for (const id of [task!.assignee_id, task!.created_by]) {
    if (!id || told.has(id)) continue;
    told.add(id);
    await notify(id, { kind: "comment", body: `${user.name} commented on ${task!.title}: ${body.slice(0, 160)}`, link: here });
  }
  revalidatePath(here);
  redirect(`${here}#thread`);
}

/* ---------------------------------------------------------------- Weekly updates */

export async function saveWeeklyUpdate(form: FormData) {
  const user = await requireArea("tasks", "view");
  const to = back(form, "/dashboard/updates");
  if (user.bootstrap) redirect(withFlag(to, "error=setup"));
  const requested = dateOnly(text(form, "week_of", 10));
  // Updates may be written for this week or the previous one only.
  const allowed = [weekStart(), weekStart(new Date(), -1)];
  const week_of = requested && allowed.includes(requested) ? requested : allowed[0];
  const mood = Math.max(1, Math.min(5, Math.round(Number(text(form, "mood", 2)) || 3)));
  const { error } = await admin()
    .from("weekly_updates")
    .upsert(
      {
        user_id: user.id,
        user_name: user.name,
        week_of,
        done: text(form, "done", 4000),
        next: text(form, "next", 4000),
        blockers: text(form, "blockers", 2000),
        mood,
        updated_at: new Date().toISOString()
      },
      { onConflict: "user_id,week_of" }
    );
  if (error) redirect(withFlag(to, "error=save"));
  await logActivity(user, "tasks", "Posted a weekly update", week_of);
  const blockers = text(form, "blockers", 300);
  if (blockers) {
    const users = await listUsers().catch(() => []);
    for (const person of users.filter((p) => p.active && p.id !== user.id && can(p, "tasks", "edit"))) {
      await notify(person.id, { kind: "blocker", body: `${user.name} is blocked: ${blockers}`, link: `/dashboard/updates?week=${week_of}` });
    }
  }
  revalidatePath("/dashboard/updates");
  redirect(withFlag(to, "saved=1"));
}
