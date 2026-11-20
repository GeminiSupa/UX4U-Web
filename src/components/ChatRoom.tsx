"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

type Message = { id: string; channel: string; user_id: string; user_name: string; body: string; created_at: string };

const POLL_MS = 4000;

function day(iso: string) {
  return new Date(iso).toLocaleDateString([], { weekday: "long", day: "numeric", month: "long" });
}

export function ChatRoom({ channel, channels, me, canModerate }: { channel: string; channels: readonly string[]; me: string; canModerate: boolean }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const lastRef = useRef<string>("");
  const listRef = useRef<HTMLDivElement>(null);
  const stick = useRef(true);

  const append = useCallback((incoming: Message[]) => {
    if (!incoming.length) return;
    setMessages((current) => {
      const seen = new Set(current.map((message) => message.id));
      const next = [...current, ...incoming.filter((message) => !seen.has(message.id))];
      lastRef.current = next[next.length - 1]?.created_at || lastRef.current;
      return next;
    });
  }, []);

  useEffect(() => {
    let alive = true;
    setMessages([]);
    lastRef.current = "";
    const load = async () => {
      try {
        const url = `/api/chat?channel=${channel}${lastRef.current ? `&after=${encodeURIComponent(lastRef.current)}` : ""}`;
        const response = await fetch(url, { cache: "no-store" });
        const data = (await response.json()) as { messages?: Message[]; error?: string };
        if (!alive) return;
        if (!response.ok) setError(data.error || "Could not load messages.");
        else {
          setError("");
          append(data.messages || []);
        }
      } catch {
        if (alive) setError("Offline. Retrying…");
      }
    };
    load();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, POLL_MS);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [channel, append]);

  useEffect(() => {
    const list = listRef.current;
    if (list && stick.current) list.scrollTop = list.scrollHeight;
  }, [messages]);

  async function send() {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const response = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ channel, body }) });
      const data = (await response.json()) as { message?: Message; error?: string };
      if (!response.ok || !data.message) setError(data.error || "Could not send.");
      else {
        setDraft("");
        stick.current = true;
        append([data.message]);
      }
    } finally {
      setSending(false);
    }
  }

  async function remove(id: string) {
    const response = await fetch(`/api/chat?id=${id}`, { method: "DELETE" });
    if (response.ok) setMessages((current) => current.filter((message) => message.id !== id));
  }

  let lastDay = "";
  return (
    <div className="grid h-[calc(100vh-10rem)] min-h-[420px] gap-4 md:grid-cols-[180px_minmax(0,1fr)]">
      <nav className="flex gap-1 overflow-x-auto md:block md:space-y-1" aria-label="Channels">
        {channels.map((name) => (
          <Link key={name} href={`/dashboard/chat?channel=${name}`} className={`block whitespace-nowrap rounded-lg px-3 py-2 text-sm ${name === channel ? "bg-ink text-paper" : "hover:bg-ink/5"}`}>
            # {name}
          </Link>
        ))}
      </nav>
      <section className="flex min-h-0 flex-col rounded-2xl border border-ink/10 bg-white">
        <header className="border-b border-ink/10 px-4 py-3 text-sm font-medium"># {channel}</header>
        <div
          ref={listRef}
          className="min-h-0 flex-1 space-y-1 overflow-y-auto px-4 py-3"
          onScroll={(event) => {
            const el = event.currentTarget;
            stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
          }}
          aria-live="polite"
        >
          {messages.map((message) => {
            const label = day(message.created_at);
            const showDay = label !== lastDay;
            lastDay = label;
            const mine = message.user_id === me;
            return (
              <div key={message.id}>
                {showDay ? <p className="my-3 text-center text-xs text-ink/40">{label}</p> : null}
                <div className={`group flex gap-3 rounded-lg px-2 py-1.5 hover:bg-ink/[0.03] ${mine ? "" : ""}`}>
                  <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink text-xs text-lime" aria-hidden>{message.user_name.slice(0, 1).toUpperCase()}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">
                      <span className="font-medium">{message.user_name}</span>{" "}
                      <span className="text-xs text-ink/40">{new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                    </p>
                    <p className="whitespace-pre-wrap break-words text-sm text-ink/85">{message.body}</p>
                  </div>
                  {mine || canModerate ? (
                    <button type="button" onClick={() => remove(message.id)} className="hidden self-start text-xs text-red-800 group-hover:block" aria-label="Delete message">Delete</button>
                  ) : null}
                </div>
              </div>
            );
          })}
          {!messages.length && !error ? <p className="py-10 text-center text-sm text-ink/45">No messages in #{channel} yet. Say hello.</p> : null}
        </div>
        {error ? <p className="px-4 pb-1 text-xs text-red-800">{error}</p> : null}
        <form
          className="flex items-end gap-2 border-t border-ink/10 p-3"
          onSubmit={(event) => {
            event.preventDefault();
            send();
          }}
        >
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                send();
              }
            }}
            rows={1}
            maxLength={4000}
            placeholder={`Message #${channel} — @name to notify someone, Shift+Enter for a new line`}
            className="max-h-40 min-h-[42px] flex-1 resize-none rounded-xl border border-ink/15 px-3 py-2 text-sm outline-none [field-sizing:content] focus:border-moss"
            aria-label="Message"
          />
          <button type="submit" disabled={sending || !draft.trim()} className="rounded-full bg-ink px-4 py-2 text-sm text-paper disabled:opacity-40">Send</button>
        </form>
      </section>
    </div>
  );
}
