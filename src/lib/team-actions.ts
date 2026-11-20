"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { can } from "./access";
import { getUserById, logActivity, requireArea, requireUser } from "./auth";
import { admin } from "./supabase";
import { canModifyTask, getTask, isPriority, isStatus, notify, runningEntry, type TaskStatus } from "./team";

function text(form: FormData, key: string, max = 300) {
  return String(form.get(key) || "").trim().slice(0, max);
}

function uuid(value: string) {
  return /^[0-9a-f-]{36}$/i.test(value) ? value : "";
}

function dueFrom(value: string) {
  if (!value) return null;
  const time = Date.parse(value);
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
}

async function assignTo(actorCanManage: boolean, actorId: string, requested: string) {
  const id = uuid(requested);
  if (!id) return actorCanManage ? null : actorId;
  if (!actorCanManage && id !== actorId) return actorId;
  const person = await getUserById(id);
  return person && person.active ? person.id : null;
}

async function tellAssignee(assigneeId: string | null, actorId: string, title: string, taskId: string) {
  if (!assigneeId || assigneeId === actorId) return;
  const person = await getUserById(assigneeId);
  if (!person) return;
  await notify(person.id, {
    kind: "assigned",
    body: `You were assigned: ${title}`,
    link: `/dashboard/tasks/${taskId}`,
    email: { to: person.email, subject: `New task: ${title}` }
  });
}

export async function createTask(form: FormData) {
  const user = await requireArea("tasks", "view");
  const manage = can(user, "tasks", "edit");
  const title = text(form, "title", 200);
  if (!title) redirect("/dashboard/tasks?error=title");
  const assignee_id = await assignTo(manage, user.id, text(form, "assignee_id"));
  const assignee = assignee_id ? await getUserById(assignee_id) : null;
  const status = isStatus(form.get("status")) ? (form.get("status") as TaskStatus) : "todo";
  const { data, error } = await admin()
    .from("tasks")
    .insert({
      title,
      description: text(form, "description", 5000),
      status,
      priority: isPriority(form.get("priority")) ? form.get("priority") : "normal",
      client: text(form, "client", 120),
      assignee_id,
      assignee_name: assignee?.name || "",
      created_by: user.bootstrap ? null : user.id,
      created_by_name: user.name,
      due_at: dueFrom(text(form, "due_at", 40)),
      estimate_minutes: Math.max(0, Math.min(100000, Math.round(Number(text(form, "estimate_hours", 10) || 0) * 60))),
      position: Date.now() / 1000
    })
    .select("id")
    .single();
  if (error || !data) redirect("/dashboard/tasks?error=save");
  await logActivity(user, "tasks", "Created a task", title);
  await tellAssignee(assignee_id, user.id, title, String(data.id));
  revalidatePath("/dashboard/tasks");
  redirect(text(form, "next", 200).startsWith("/dashboard/") ? text(form, "next", 200) : "/dashboard/tasks");
}

export async function updateTask(form: FormData) {
  const user = await requireArea("tasks", "view");
  const id = uuid(text(form, "id"));
  const task = id ? await getTask(id) : null;
  if (!task || !canModifyTask(user, task)) redirect("/dashboard/tasks?error=denied");
  const manage = can(user, "tasks", "edit");
  const assignee_id = manage ? await assignTo(true, user.id, text(form, "assignee_id")) : task!.assignee_id;
  const assignee = assignee_id ? await getUserById(assignee_id) : null;
  const status = isStatus(form.get("status")) ? (form.get("status") as TaskStatus) : task!.status;
  const title = text(form, "title", 200) || task!.title;
  const { error } = await admin()
    .from("tasks")
    .update({
      title,
      description: text(form, "description", 5000),
      status,
      priority: isPriority(form.get("priority")) ? form.get("priority") : task!.priority,
      client: text(form, "client", 120),
      assignee_id,
      assignee_name: assignee?.name || "",
      due_at: dueFrom(text(form, "due_at", 40)),
      estimate_minutes: Math.max(0, Math.min(100000, Math.round(Number(text(form, "estimate_hours", 10) || 0) * 60))),
      completed_at: status === "done" ? task!.completed_at || new Date().toISOString() : null,
      updated_at: new Date().toISOString()
    })
    .eq("id", id);
  if (error) redirect(`/dashboard/tasks/${id}?error=save`);
  await logActivity(user, "tasks", status === "done" && task!.status !== "done" ? "Completed a task" : "Updated a task", title);
  if (assignee_id !== task!.assignee_id) await tellAssignee(assignee_id, user.id, title, id);
  revalidatePath("/dashboard/tasks");
  redirect(`/dashboard/tasks/${id}?saved=1`);
}

/** Called by the drag-and-drop board. */
export async function moveTask(id: string, status: string, position: number): Promise<{ ok: boolean; error?: string }> {
  const user = await requireArea("tasks", "view");
  const task = uuid(id) ? await getTask(id) : null;
  if (!task || !isStatus(status) || !Number.isFinite(position)) return { ok: false, error: "Could not move that task." };
  if (!canModifyTask(user, task)) return { ok: false, error: "You can only move your own tasks." };
  const { error } = await admin()
    .from("tasks")
    .update({
      status,
      position,
      completed_at: status === "done" ? task.completed_at || new Date().toISOString() : null,
      updated_at: new Date().toISOString()
    })
    .eq("id", id);
  if (error) return { ok: false, error: "Could not move that task." };
  if (status !== task.status) {
    await logActivity(user, "tasks", status === "done" ? "Completed a task" : `Moved a task to ${status}`, task.title);
  }
  return { ok: true };
}

export async function deleteTask(form: FormData) {
  const user = await requireArea("tasks", "view");
  const task = await getTask(uuid(text(form, "id")));
  if (!task) redirect("/dashboard/tasks");
  if (!can(user, "tasks", "edit") && task!.created_by !== user.id) redirect(`/dashboard/tasks/${task!.id}?error=denied`);
  await admin().from("tasks").delete().eq("id", task!.id);
  await logActivity(user, "tasks", "Deleted a task", task!.title);
  revalidatePath("/dashboard/tasks");
  redirect("/dashboard/tasks");
}

async function stopRunning(userId: string) {
  const running = await runningEntry(userId);
  if (!running) return null;
  const ended = new Date();
  const minutes = Math.max(1, Math.round((ended.getTime() - Date.parse(running.started_at)) / 60000));
  await admin().from("time_entries").update({ ended_at: ended.toISOString(), minutes }).eq("id", running.id);
  return { ...running, minutes };
}

export async function startTimer(form: FormData) {
  const user = await requireArea("tasks", "view");
  if (user.bootstrap) redirect("/dashboard/tasks?error=setup");
  const task = uuid(text(form, "task_id")) ? await getTask(text(form, "task_id")) : null;
  if (task && !canModifyTask(user, task)) redirect("/dashboard/tasks?error=denied");
  await stopRunning(user.id);
  await admin().from("time_entries").insert({
    user_id: user.id,
    user_name: user.name,
    task_id: task?.id || null,
    task_title: task?.title || text(form, "note", 200) || "General work",
    started_at: new Date().toISOString(),
    note: text(form, "note", 300)
  });
  if (task && task.status === "todo") await admin().from("tasks").update({ status: "doing", updated_at: new Date().toISOString() }).eq("id", task.id);
  await logActivity(user, "tasks", "Started a timer", task?.title || "General work");
  revalidatePath("/dashboard", "layout");
  const next = text(form, "next", 200);
  redirect(next.startsWith("/dashboard") ? next : "/dashboard/tasks");
}

export async function stopTimer(form: FormData) {
  const user = await requireUser();
  const stopped = await stopRunning(user.id);
  if (stopped) await logActivity(user, "tasks", "Stopped a timer", `${stopped.task_title} · ${stopped.minutes} min`);
  revalidatePath("/dashboard", "layout");
  const next = text(form, "next", 200);
  redirect(next.startsWith("/dashboard") ? next : "/dashboard/tasks");
}

export async function addTimeEntry(form: FormData) {
  const user = await requireArea("tasks", "view");
  if (user.bootstrap) redirect("/dashboard/work?error=setup");
  const minutes = Math.round(Number(text(form, "hours", 10) || 0) * 60) + Math.round(Number(text(form, "minutes", 10) || 0));
  const day = Date.parse(text(form, "date", 20) || "");
  const task = uuid(text(form, "task_id")) ? await getTask(text(form, "task_id")) : null;
  const back = text(form, "next", 200).startsWith("/dashboard") ? text(form, "next", 200) : "/dashboard/work";
  if (!minutes || minutes < 1 || minutes > 24 * 60 || !Number.isFinite(day)) redirect(`${back}${back.includes("?") ? "&" : "?"}error=time`);
  if (task && !canModifyTask(user, task)) redirect(`${back}${back.includes("?") ? "&" : "?"}error=denied`);
  const started = new Date(day + 9 * 3600000);
  await admin().from("time_entries").insert({
    user_id: user.id,
    user_name: user.name,
    task_id: task?.id || null,
    task_title: task?.title || "General work",
    started_at: started.toISOString(),
    ended_at: new Date(started.getTime() + minutes * 60000).toISOString(),
    minutes,
    note: text(form, "note", 300)
  });
  await logActivity(user, "tasks", "Logged time", `${task?.title || "General work"} · ${minutes} min`);
  redirect(back);
}

export async function deleteTimeEntry(form: FormData) {
  const user = await requireArea("tasks", "view");
  const id = uuid(text(form, "id"));
  const { data } = await admin().from("time_entries").select("user_id").eq("id", id).maybeSingle();
  if (data && (data.user_id === user.id || can(user, "tasks", "edit"))) {
    await admin().from("time_entries").delete().eq("id", id);
    await logActivity(user, "tasks", "Deleted a time entry");
  }
  const back = text(form, "next", 200);
  redirect(back.startsWith("/dashboard") ? back : "/dashboard/work");
}

export async function markAllRead() {
  const user = await requireUser();
  await admin().from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", user.id).is("read_at", null);
  revalidatePath("/dashboard", "layout");
  redirect("/dashboard/notifications");
}
