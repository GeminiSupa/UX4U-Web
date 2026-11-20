"use client";

import { useEffect, useState } from "react";
import { stopTimer } from "@/lib/team-actions";

function clock(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function RunningTimer({ startedAt, title }: { startedAt: string; title: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return (
    <form action={stopTimer} className="rounded-lg border border-lime/30 bg-lime/10 px-3 py-2">
      <p className="truncate text-xs text-paper/70" title={title}>● {title}</p>
      <div className="mt-1 flex items-center justify-between gap-2">
        <span className="font-mono text-sm tabular-nums text-lime" suppressHydrationWarning>{clock(now - Date.parse(startedAt))}</span>
        <button type="submit" className="rounded-full bg-paper/10 px-2.5 py-0.5 text-xs text-paper hover:bg-paper/20">Stop</button>
      </div>
    </form>
  );
}
