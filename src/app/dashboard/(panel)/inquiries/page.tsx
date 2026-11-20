import { can } from "@/lib/access";
import { requireArea } from "@/lib/auth";
import { deleteInquiry } from "@/lib/actions";
import { getInquiries } from "@/lib/data";

export const dynamic = "force-dynamic";

function replyByEmail(email: string, name: string, service: string) {
  if (!email.includes("@")) return "";
  const subject = `Re: ${service || "your UX4U inquiry"}`;
  const body = `Hi ${name},\n\nThanks for contacting UX4U.\n\n`;
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function phoneLinks(phone: string, name: string, service: string) {
  const dial = phone.replace(/[^\d+]/g, "");
  const whatsapp = phone.replace(/\D/g, "");
  const message = `Hi ${name}, thanks for contacting UX4U about ${service || "your inquiry"}.`;
  return {
    call: dial ? `tel:${dial}` : "",
    whatsapp: whatsapp ? `https://wa.me/${whatsapp}?text=${encodeURIComponent(message)}` : ""
  };
}

function inquiryPhone(phone: string | undefined, message: string) {
  if (phone) return { phone, message };
  const match = message.match(/\n\nPhone \/ WhatsApp: ([^\n]+)$/);
  return match ? { phone: match[1].trim(), message: message.slice(0, match.index).trimEnd() } : { phone: "", message };
}

export default async function InquiriesPage({ searchParams }: { searchParams: Promise<{ deleted?: string; error?: string }> }) {
  const user = await requireArea("inquiries", "view");
  const query = await searchParams;
  const canEdit = can(user, "inquiries", "edit");
  const inquiries = await getInquiries();

  return (
    <div>
      <h1 className="font-serif text-4xl">Inquiries</h1>
      <p className="mt-2 text-sm text-ink/65">Messages from the contact form.</p>
      {query.deleted ? <p className="mt-4 border border-moss/20 bg-lime/20 px-4 py-2 text-sm">Inquiry deleted.</p> : null}
      {query.error ? <p className="mt-4 border border-red-900/20 bg-red-50 px-4 py-2 text-sm">The inquiry could not be deleted. Try again.</p> : null}
      <div className="mt-6 space-y-3">
        {inquiries.map((item) => {
          const emailReply = replyByEmail(item.email || "", item.name, item.service);
          const normalized = inquiryPhone(item.phone, item.message);
          const phone = phoneLinks(normalized.phone, item.name, item.service);
          return (
          <article key={item.id} className="border border-ink/10 bg-white p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-medium">{item.name}</h2>
              <p className="text-xs text-ink/45">{new Date(item.created_at).toLocaleString()}</p>
            </div>
            <p className="mt-1 text-sm">
              {item.email ? <a className="text-moss" href={`mailto:${item.email}`}>{item.email}</a> : null}
              {item.email && normalized.phone ? " · " : ""}
              {normalized.phone ? <a className="text-moss" href={phone.call}>{normalized.phone}</a> : null}
              {item.company ? ` · ${item.company}` : ""}
              {item.service ? ` · ${item.service}` : ""}
            </p>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ink/80">{normalized.message}</p>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
              {emailReply ? <a className="rounded-full bg-ink px-4 py-2 text-paper" href={emailReply}>Reply by email</a> : null}
              {phone.whatsapp ? <a className="rounded-full bg-moss px-4 py-2 text-white" href={phone.whatsapp} target="_blank" rel="noreferrer">Reply on WhatsApp</a> : null}
              {phone.call ? <a className="rounded-full border border-ink/15 px-4 py-2" href={phone.call}>Call</a> : null}
              {canEdit ? (
                <form action={deleteInquiry} className="ml-auto">
                  <input type="hidden" name="id" value={item.id} />
                  <button className="px-2 py-2 text-red-800" type="submit">Delete</button>
                </form>
              ) : null}
            </div>
          </article>
          );
        })}
        {!inquiries.length ? <p className="text-sm text-ink/50">No messages yet.</p> : null}
      </div>
    </div>
  );
}
