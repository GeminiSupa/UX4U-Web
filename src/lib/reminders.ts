import "server-only";
import { admin } from "./supabase";
import { notify } from "./team";

/**
 * Daily reminders: tasks due in the next 24 hours or already overdue (not done) notify their assignee
 * in the app and by email when Resend is configured. One reminder per task per day.
 */
export async function runTaskReminders(now = new Date()) {
  const supabase = admin();
  const soon = new Date(now.getTime() + 24 * 3600000).toISOString();
  const { data: tasks, error } = await supabase
    .from("tasks")
    .select("id, title, due_at, assignee_id, status")
    .neq("status", "done")
    .not("assignee_id", "is", null)
    .not("due_at", "is", null)
    .lte("due_at", soon)
    .limit(500);
  if (error || !tasks?.length) return { sent: 0 };

  const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
  const { data: already } = await supabase.from("notifications").select("link").eq("kind", "due").gte("created_at", dayStart);
  const done = new Set((already || []).map((row) => String(row.link)));
  const { data: people } = await supabase.from("admins").select("id, email, active");
  const emailOf = new Map((people || []).filter((p) => p.active).map((p) => [String(p.id), String(p.email)]));

  let sent = 0;
  for (const task of tasks) {
    const link = `/dashboard/tasks/${task.id}`;
    const assignee = String(task.assignee_id);
    if (done.has(link) || !emailOf.has(assignee)) continue;
    const overdue = Date.parse(String(task.due_at)) < now.getTime();
    const when = new Date(String(task.due_at)).toUTCString().slice(0, 22);
    const body = overdue ? `Overdue since ${when} UTC: ${task.title}` : `Due ${when} UTC: ${task.title}`;
    await notify(assignee, {
      kind: "due",
      body,
      link,
      email: { to: emailOf.get(assignee)!, subject: overdue ? `Overdue: ${task.title}` : `Due soon: ${task.title}` }
    });
    sent += 1;
  }
  return { sent };
}
