/** Project workspace helpers with no server dependencies — safe on client and server. */

export const PROJECT_COLORS: Record<string, string> = {
  moss: "#0f7a56",
  lime: "#9cc21f",
  sky: "#2f7fd0",
  violet: "#7a52c7",
  coral: "#e0603f",
  amber: "#d39a12",
  rose: "#c8436e",
  slate: "#56646e"
};

export const PROJECT_STATUSES = [
  { id: "planning", label: "Planning" },
  { id: "active", label: "Active" },
  { id: "paused", label: "Paused" },
  { id: "done", label: "Delivered" }
] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number]["id"];

export const POINT_PRESETS = [0, 1, 2, 3, 5, 8, 13] as const;

export function colorOf(name: string | null | undefined) {
  return PROJECT_COLORS[name || ""] || PROJECT_COLORS.moss;
}

export function isProjectStatus(value: unknown): value is ProjectStatus {
  return PROJECT_STATUSES.some((status) => status.id === value);
}

/** Monday (UTC) of the week holding `date`, as YYYY-MM-DD. */
export function weekStart(date = new Date(), offsetWeeks = 0) {
  const day = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  day.setUTCDate(day.getUTCDate() - ((day.getUTCDay() + 6) % 7) + offsetWeeks * 7);
  return day.toISOString().slice(0, 10);
}

export function weekLabel(weekOf: string) {
  const from = new Date(`${weekOf}T00:00:00Z`);
  const to = new Date(from.getTime() + 6 * 86400000);
  const fmt = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
  return `${fmt(from)} – ${fmt(to)}`;
}

type ProgressTask = { status: string; points: number; due_at: string | null };

/** Progress counts points when tasks carry points, otherwise task count. */
export function progressOf(tasks: ProgressTask[], now = Date.now()) {
  const total = tasks.length;
  const done = tasks.filter((task) => task.status === "done").length;
  const review = tasks.filter((task) => task.status === "review").length;
  const points = tasks.reduce((sum, task) => sum + task.points, 0);
  const pointsDone = tasks.filter((task) => task.status === "done").reduce((sum, task) => sum + task.points, 0);
  const overdue = tasks.filter((task) => task.status !== "done" && task.due_at && Date.parse(task.due_at) < now).length;
  const percent = points ? Math.round((pointsDone / points) * 100) : total ? Math.round((done / total) * 100) : 0;
  return { total, done, review, points, pointsDone, overdue, percent };
}

export const MOODS = [
  { value: 1, label: "Rough", icon: "☹" },
  { value: 2, label: "Meh", icon: "😕" },
  { value: 3, label: "Okay", icon: "😐" },
  { value: 4, label: "Good", icon: "🙂" },
  { value: 5, label: "Great", icon: "🚀" }
] as const;
