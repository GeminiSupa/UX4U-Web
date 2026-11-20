import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { markAllRead } from "@/lib/team-actions";
import { admin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type Note = { id: string; kind: string; body: string; link: string; read_at: string | null; created_at: string };

export default async function NotificationsPage() {
  const user = await requireUser();
  let notes: Note[] = [];
  if (!user.bootstrap) {
    try {
      const { data } = await admin()
        .from("notifications")
        .select("id, kind, body, link, read_at, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100);
      notes = (data || []) as Note[];
    } catch {
      notes = [];
    }
  }
  const unread = notes.filter((note) => !note.read_at).length;

  return (
    <div className="max-w-3xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-serif text-4xl">Notifications</h1>
        {unread ? (
          <form action={markAllRead}>
            <button type="submit" className="rounded-full border border-ink/15 px-4 py-2 text-sm">Mark all as read</button>
          </form>
        ) : null}
      </div>
      <ul className="mt-6 divide-y divide-ink/5 rounded-xl border border-ink/10 bg-white">
        {notes.map((note) => (
          <li key={note.id} className={`flex gap-3 px-4 py-3 text-sm ${note.read_at ? "text-ink/60" : ""}`}>
            <span aria-hidden className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${note.read_at ? "bg-transparent" : "bg-moss"}`} />
            <span className="min-w-0 flex-1">
              {note.link.startsWith("/dashboard") ? <Link href={note.link} className="hover:underline">{note.body}</Link> : note.body}
              <span className="block text-xs text-ink/45">
                {{ due: "Reminder", assigned: "Assignment", mention: "Mention", trends: "Trend watch" }[note.kind] || "Update"} · {new Date(note.created_at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
              </span>
            </span>
          </li>
        ))}
        {!notes.length ? <li className="px-4 py-8 text-center text-sm text-ink/50">Nothing yet. Reminders, assignments and @mentions show up here.</li> : null}
      </ul>
    </div>
  );
}
