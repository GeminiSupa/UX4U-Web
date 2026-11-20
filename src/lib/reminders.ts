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

/**
 * Friday nudge: people with task access who have not posted this week's update get one reminder.
 * Runs from the daily cron; does nothing on other days or before supabase/workspace.sql has run.
 */
export async function runWeeklyUpdateReminders(now = new Date()) {
  if (now.getUTCDay() !== 5) return { sent: 0, skipped: "not Friday" };
  const supabase = admin();
  const day = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  day.setUTCDate(day.getUTCDate() - ((day.getUTCDay() + 6) % 7));
  const week = day.toISOString().slice(0, 10);
  const posted = await supabase.from("weekly_updates").select("user_id").eq("week_of", week);
  if (posted.error) return { sent: 0, skipped: "not set up" };
  const done = new Set((posted.data || []).map((row) => String(row.user_id)));
  const { data: people } = await supabase.from("admins").select("id, email, role, permissions, active");
  let sent = 0;
  for (const person of people || []) {
    const permissions = (person.permissions || {}) as Record<string, string>;
    const allowed = person.role === "owner" || permissions.tasks === "view" || permissions.tasks === "edit";
    if (!person.active || !allowed || done.has(String(person.id))) continue;
    await notify(String(person.id), {
      kind: "weekly",
      body: "It's Friday — post your weekly update: done, next and blockers.",
      link: "/dashboard/updates",
      email: { to: String(person.email), subject: "Your weekly update" }
    });
    sent += 1;
  }
  return { sent };
}
