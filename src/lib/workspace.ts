import "server-only";
import { admin } from "./supabase";
import type { ProjectStatus } from "./workspace-shared";

export type WorkProject = {
  id: string;
  name: string;
  client: string;
  description: string;
  color: string;
  status: ProjectStatus;
  start_date: string | null;
  due_date: string | null;
  lead_id: string | null;
  lead_name: string;
  created_by_name: string;
  created_at: string;
};

export type TaskStep = {
  id: string;
  task_id: string;
  title: string;
  done: boolean;
  done_at: string | null;
  done_by_name: string;
  position: number;
};

export type TaskUpdate = {
  id: string;
  task_id: string;
  user_id: string | null;
  user_name: string;
  kind: "comment" | "submitted" | "approved" | "changes";
  body: string;
  link: string;
  created_at: string;
};

export type WeeklyUpdate = {
  id: string;
  user_id: string;
  user_name: string;
  week_of: string;
  done: string;
  next: string;
  blockers: string;
  mood: number;
  updated_at: string;
};

/** `ready` is false until supabase/workspace.sql has run. */
export async function listProjects(): Promise<{ ready: boolean; projects: WorkProject[] }> {
  try {
    const { data, error } = await admin().from("work_projects").select("*").order("created_at", { ascending: false }).limit(300);
    if (error) return { ready: false, projects: [] };
    return { ready: true, projects: (data || []) as WorkProject[] };
  } catch {
    return { ready: false, projects: [] };
  }
}

export async function getProject(id: string): Promise<WorkProject | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  try {
    const { data } = await admin().from("work_projects").select("*").eq("id", id).maybeSingle();
    return (data as WorkProject) || null;
  } catch {
    return null;
  }
}

/** Step counts per task, for board cards. */
export async function stepCounts(): Promise<Map<string, { done: number; total: number }>> {
  const counts = new Map<string, { done: number; total: number }>();
  try {
    const { data } = await admin().from("task_steps").select("task_id, done").limit(10000);
    for (const row of data || []) {
      const key = String(row.task_id);
      const entry = counts.get(key) || { done: 0, total: 0 };
      entry.total += 1;
      if (row.done) entry.done += 1;
      counts.set(key, entry);
    }
  } catch {
    // Steps are optional until the migration runs.
  }
  return counts;
}

export async function stepsFor(taskId: string): Promise<TaskStep[]> {
  try {
    const { data } = await admin().from("task_steps").select("*").eq("task_id", taskId).order("position").order("created_at");
    return (data || []) as TaskStep[];
  } catch {
    return [];
  }
}

export async function threadFor(taskId: string): Promise<TaskUpdate[]> {
  try {
    const { data } = await admin().from("task_updates").select("*").eq("task_id", taskId).order("created_at", { ascending: false }).limit(200);
    return (data || []) as TaskUpdate[];
  } catch {
    return [];
  }
}

export async function weeklyUpdates(weekOf: string): Promise<{ ready: boolean; updates: WeeklyUpdate[] }> {
  try {
    const { data, error } = await admin().from("weekly_updates").select("*").eq("week_of", weekOf).order("updated_at", { ascending: false });
    if (error) return { ready: false, updates: [] };
    return { ready: true, updates: (data || []) as WeeklyUpdate[] };
  } catch {
    return { ready: false, updates: [] };
  }
}
