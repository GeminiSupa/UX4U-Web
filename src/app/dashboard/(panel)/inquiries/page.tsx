import { getInquiries } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function InquiriesPage() {
  const inquiries = await getInquiries();

  return (
    <div>
      <h1 className="font-serif text-4xl">Inquiries</h1>
      <p className="mt-2 text-sm text-ink/65">Messages from the contact form.</p>
      <div className="mt-6 space-y-3">
        {inquiries.map((item) => (
          <article key={item.id} className="border border-ink/10 bg-white p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-medium">{item.name}</h2>
              <p className="text-xs text-ink/45">{new Date(item.created_at).toLocaleString()}</p>
            </div>
            <p className="mt-1 text-sm">
              <a className="text-moss" href={`mailto:${item.email}`}>{item.email}</a>
              {item.company ? ` · ${item.company}` : ""}
              {item.service ? ` · ${item.service}` : ""}
            </p>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ink/80">{item.message}</p>
          </article>
        ))}
        {!inquiries.length ? <p className="text-sm text-ink/50">No messages yet.</p> : null}
      </div>
    </div>
  );
}
