import "server-only";
import { can, type StaffUser } from "./access";
import { sendEmail } from "./email";
import { SITE_URL } from "./site";
import { admin } from "./supabase";

export const STATUSES = [
  { id: "todo", label: "To do" },
  { id: "doing", label: "In progress" },
  { id: "review", label: "Review" },
  { id: "done", label: "Done" }
] as const;
export type TaskStatus = (typeof STATUSES)[number]["id"];
export const PRIORITIES = ["low", "normal", "high", "urgent"] as const;
export type Priority = (typeof PRIORITIES)[number];

export type Task = {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  client: string;
  assignee_id: string | null;
  assignee_name: string;
  created_by: string | null;
  created_by_name: string;
  due_at: string | null;
  estimate_minutes: number;
  position: number;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  logged_minutes: number;
};

export type TimeEntry = {
  id: string;
  user_id: string;
  user_name: string;
  task_id: string | null;
  task_title: string;
  started_at: string;
  ended_at: string | null;
  minutes: number;
  note: string;
};

export function isStatus(value: unknown): value is TaskStatus {
  return STATUSES.some((status) => status.id === value);
}

export function isPriority(value: unknown): value is Priority {
  return (PRIORITIES as readonly string[]).includes(String(value));
}

/** Members with view access can work on tasks assigned to or created by them; edit access manages all. */
export function canModifyTask(user: StaffUser, task: Pick<Task, "assignee_id" | "created_by">) {
  if (can(user, "tasks", "edit")) return true;
  return can(user, "tasks", "view") && (task.assignee_id === user.id || task.created_by === user.id);
}

export async function listTasks(): Promise<{ ready: boolean; tasks: Task[] }> {
  try {
    const supabase = admin();
    const [tasks, totals] = await Promise.all([
      supabase.from("tasks").select("*").order("position", { ascending: true }).order("created_at", { ascending: false }).limit(1000),
      supabase.from("task_time").select("task_id, minutes")
    ]);
    if (tasks.error) return { ready: false, tasks: [] };
    const minutes = new Map((totals.data || []).map((row) => [String(row.task_id), Number(row.minutes) || 0]));
    return {
      ready: true,
      tasks: (tasks.data || []).map((row) => ({ ...(row as Task), logged_minutes: minutes.get(String(row.id)) || 0 }))
    };
  } catch {
    return { ready: false, tasks: [] };
  }
}

export async function getTask(id: string): Promise<Task | null> {
  const { data } = await admin().from("tasks").select("*").eq("id", id).maybeSingle();
  return data ? ({ ...(data as Task), logged_minutes: 0 } as Task) : null;
}

export async function runningEntry(userId: string): Promise<TimeEntry | null> {
  try {
    const { data } = await admin()
      .from("time_entries")
      .select("*")
      .eq("user_id", userId)
      .is("ended_at", null)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return (data as TimeEntry) || null;
  } catch {
    return null;
  }
}

export async function entriesBetween(from: Date, to: Date, userId?: string): Promise<TimeEntry[]> {
  let query = admin()
    .from("time_entries")
    .select("*")
    .gte("started_at", from.toISOString())
    .lt("started_at", to.toISOString())
    .order("started_at", { ascending: false })
    .limit(5000);
  if (userId) query = query.eq("user_id", userId);
  const { data } = await query;
  return (data || []) as TimeEntry[];
}

export function minutesOf(entry: TimeEntry, now = Date.now()) {
  if (entry.ended_at) return entry.minutes;
  return Math.max(0, Math.round((now - Date.parse(entry.started_at)) / 60000));
}

export function formatMinutes(total: number) {
  const hours = Math.floor(total / 60);
  const minutes = Math.round(total % 60);
  return hours ? `${hours}h ${String(minutes).padStart(2, "0")}m` : `${minutes}m`;
}

export async function unreadCount(userId: string) {
  try {
    const { count } = await admin()
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("read_at", null);
    return count || 0;
  } catch {
    return 0;
  }
}

/** In-app notification, plus an email when Resend is configured and `email` is set. */
export async function notify(
  userId: string,
  { kind, body, link, email }: { kind: string; body: string; link: string; email?: { to: string; subject: string } }
) {
  try {
    await admin().from("notifications").insert({ user_id: userId, kind, body: body.slice(0, 500), link });
  } catch {
    // Notifications are best effort.
  }
  if (email) {
    const base = process.env.APP_URL || SITE_URL;
    await sendEmail({ to: email.to, subject: email.subject, text: `${body}\n\n${base}${link}` });
  }
}

export async function staffDirectory() {
  const { data } = await admin().from("admins").select("id, name, email, active").eq("active", true).order("name");
  return (data || []).map((row) => ({ id: String(row.id), name: String(row.name || row.email), email: String(row.email) }));
}
