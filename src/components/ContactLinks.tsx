import { mailHref, telHref } from "@/lib/contact";

export function ContactLinks({ phones, emails, name }: { phones: string; emails: string; name: string }) {
  const call = telHref(phones);
  const email = mailHref(emails, name);
  if (!call && !email) return <span className="text-xs text-ink/35">No contact</span>;
  return (
    <div className="flex flex-col gap-1">
      {call ? (
        <a className="rounded-full bg-ink px-3 py-1.5 text-center text-xs text-paper" href={call}>
          Call
        </a>
      ) : null}
      {email ? (
        <a className="rounded-full border border-ink/15 px-3 py-1.5 text-center text-xs" href={email}>
          Email
        </a>
      ) : null}
    </div>
  );
}
