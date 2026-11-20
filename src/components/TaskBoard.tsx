"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { moveTask, startTimer } from "@/lib/team-actions";

export type BoardTask = {
  id: string;
  title: string;
  status: string;
  priority: string;
  client: string;
  assigneeName: string;
  dueAt: string | null;
  estimateMinutes: number;
  loggedMinutes: number;
  position: number;
  editable: boolean;
  running: boolean;
  projectName?: string;
  projectColor?: string;
  points?: number;
  steps?: { done: number; total: number };
};

const PRIORITY: Record<string, string> = {
  urgent: "border-red-300 bg-red-50 text-red-800",
  high: "border-amber-300 bg-amber-50 text-amber-900",
  normal: "border-ink/10 bg-ink/5 text-ink/60",
  low: "border-ink/10 text-ink/45"
};

function hours(minutes: number) {
  if (!minutes) return "0h";
  const h = minutes / 60;
  return h >= 10 ? `${Math.round(h)}h` : `${h.toFixed(1).replace(/\.0$/, "")}h`;
}

function due(value: string | null, done: boolean) {
  if (!value) return null;
  const date = new Date(value);
  const late = !done && date.getTime() < Date.now();
  const soon = !done && !late && date.getTime() - Date.now() < 86400000;
  return (
    <span className={`text-xs ${late ? "font-medium text-red-800" : soon ? "text-amber-800" : "text-ink/50"}`}>
      {late ? "Overdue · " : soon ? "Due soon · " : "Due "}
      {date.toLocaleDateString([], { day: "numeric", month: "short" })}
    </span>
  );
}

const HINTS: Record<string, string> = {
  todo: "Not started",
  doing: "Being worked on",
  review: "Submitted — waiting for approval",
  done: "Approved"
};

export function TaskBoard({ columns, tasks: initial, back = "/dashboard/tasks" }: { columns: { id: string; label: string }[]; tasks: BoardTask[]; back?: string }) {
  const [tasks, setTasks] = useState(initial);
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [, startTransition] = useTransition();

  const byColumn = useMemo(() => {
    const map = new Map<string, BoardTask[]>();
    columns.forEach((column) => map.set(column.id, []));
    [...tasks].sort((a, b) => a.position - b.position).forEach((task) => map.get(task.status)?.push(task));
    return map;
  }, [tasks, columns]);

  function drop(status: string, beforeId: string | null) {
    const id = dragging;
    setDragging(null);
    setOver(null);
    if (!id) return;
    const list = (byColumn.get(status) || []).filter((task) => task.id !== id);
    const index = beforeId ? list.findIndex((task) => task.id === beforeId) : list.length;
    const prev = list[index - 1]?.position;
    const next = list[index]?.position;
    const position = prev === undefined && next === undefined ? Date.now() / 1000 : prev === undefined ? next! - 1 : next === undefined ? prev + 1 : (prev + next) / 2;
    const before = tasks;
    setTasks((current) => current.map((task) => (task.id === id ? { ...task, status, position } : task)));
    startTransition(async () => {
      const result = await moveTask(id, status, position);
      if (!result.ok) {
        setTasks(before);
        setError(result.error || "Could not move that task.");
      } else setError("");
    });
  }

  return (
    <div>
      {error ? <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">{error}</p> : null}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {columns.map((column) => {
          const list = byColumn.get(column.id) || [];
          const total = list.reduce((sum, task) => sum + task.loggedMinutes, 0);
          return (
            <section
              key={column.id}
              onDragOver={(event) => {
                if (!dragging) return;
                event.preventDefault();
                setOver(column.id);
              }}
              onDragLeave={() => setOver((value) => (value === column.id ? null : value))}
              onDrop={(event) => {
                event.preventDefault();
                drop(column.id, null);
              }}
              className={`flex min-h-[220px] flex-col rounded-2xl border p-3 transition ${over === column.id ? "border-moss bg-moss/5" : "border-ink/10 bg-ink/[0.025]"}`}
              aria-label={column.label}
            >
              <header className="mb-3 px-1">
                <div className="flex items-baseline justify-between">
                  <h2 className="text-sm font-medium">{column.label} <span className="text-ink/40">{list.length}</span></h2>
                  <span className="text-xs text-ink/45">
                    {hours(total)}
                    {list.some((task) => task.points) ? ` · ${list.reduce((sum, task) => sum + (task.points || 0), 0)} pts` : ""}
                  </span>
                </div>
                {HINTS[column.id] ? <p className="mt-0.5 text-[11px] text-ink/40">{HINTS[column.id]}</p> : null}
              </header>
              <ol className="space-y-2">
                {list.map((task) => (
                  <li
                    key={task.id}
                    draggable={task.editable}
                    onDragStart={(event) => {
                      event.dataTransfer.effectAllowed = "move";
                      event.dataTransfer.setData("text/plain", task.id);
                      setDragging(task.id);
                    }}
                    onDragEnd={() => {
                      setDragging(null);
                      setOver(null);
                    }}
                    onDragOver={(event) => {
                      if (dragging && dragging !== task.id) event.preventDefault();
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      drop(column.id, task.id);
                    }}
                    className={`rounded-xl border bg-white p-3 shadow-[0_1px_0_rgba(11,18,16,0.04)] ${task.editable ? "cursor-grab active:cursor-grabbing" : ""} ${dragging === task.id ? "opacity-40" : ""} ${task.running ? "border-moss ring-2 ring-moss/20" : "border-ink/10"}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <Link href={`/dashboard/tasks/${task.id}`} className="text-sm font-medium leading-snug hover:underline">{task.title}</Link>
                      <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] ${PRIORITY[task.priority] || PRIORITY.normal}`}>{task.priority}</span>
                    </div>
                    {task.projectName || task.client ? (
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-ink/55">
                        {task.projectName ? <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: task.projectColor }} aria-hidden /> : null}
                        <span className="truncate">{[task.projectName, task.client].filter(Boolean).join(" · ")}</span>
                      </p>
                    ) : null}
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                      {due(task.dueAt, task.status === "done")}
                      <span className="text-xs text-ink/50">
                        {hours(task.loggedMinutes)}{task.estimateMinutes ? ` / ${hours(task.estimateMinutes)}` : ""}
                      </span>
                      {task.steps?.total ? (
                        <span className={`text-xs ${task.steps.done === task.steps.total ? "text-moss" : "text-ink/50"}`}>
                          ☑ {task.steps.done}/{task.steps.total}
                        </span>
                      ) : null}
                      {task.points ? <span className="rounded-full bg-lime/40 px-1.5 py-0.5 text-[11px] font-medium text-ink">{task.points} pts</span> : null}
                    </div>
                    {task.steps?.total ? (
                      <div className="mt-2 h-1 overflow-hidden rounded-full bg-ink/5" aria-hidden>
                        <div className="h-full rounded-full bg-sky-600/60" style={{ width: `${(task.steps.done / task.steps.total) * 100}%` }} />
                      </div>
                    ) : null}
                    {task.estimateMinutes ? (
                      <div className="mt-2 h-1 overflow-hidden rounded-full bg-ink/5" aria-hidden>
                        <div className={`h-full rounded-full ${task.loggedMinutes > task.estimateMinutes ? "bg-red-700/60" : "bg-moss/60"}`} style={{ width: `${Math.min(100, (task.loggedMinutes / task.estimateMinutes) * 100)}%` }} />
                      </div>
                    ) : null}
                    <div className="mt-3 flex items-center justify-between">
                      <span className="flex items-center gap-2 text-xs text-ink/60">
                        <span className="grid h-6 w-6 place-items-center rounded-full bg-ink text-[10px] text-lime" aria-hidden>
                          {(task.assigneeName || "?").slice(0, 1).toUpperCase()}
                        </span>
                        {task.assigneeName || "Unassigned"}
                      </span>
                      {task.editable && task.status !== "done" ? (
                        task.running ? (
                          <span className="text-xs font-medium text-moss">● Timer running</span>
                        ) : (
                          <form action={startTimer}>
                            <input type="hidden" name="task_id" value={task.id} />
                            <input type="hidden" name="next" value={back} />
                            <button type="submit" className="rounded-full border border-ink/15 px-2.5 py-1 text-xs hover:bg-ink/5">▶ Start</button>
                          </form>
                        )
                      ) : null}
                    </div>
                  </li>
                ))}
              </ol>
              {!list.length ? <p className="mt-6 text-center text-xs text-ink/40">Drop tasks here</p> : null}
            </section>
          );
        })}
      </div>
    </div>
  );
}
