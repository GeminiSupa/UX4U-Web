import Link from "next/link";
import { collectLeads, deleteLead } from "@/lib/actions";
import { control } from "@/lib/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { getLeads } from "@/lib/data";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export default async function LeadsPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const query = await searchParams;
  const leads = await getLeads();
  const withEmail = leads.filter((lead) => lead.emails).length;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl">Leads</h1>
          <p className="mt-2 max-w-xl text-sm text-ink/65">
            Reads public pages for published emails, phone numbers, WhatsApp links, and names next to roles such as owner.
            Each run covers up to four sites so the host does not time out. Private pages are skipped.
          </p>
        </div>
        <Link href="/dashboard/leads/export" className="rounded-full border border-ink/15 px-4 py-2 text-sm">
          Download CSV
        </Link>
      </div>
      {query.saved ? <p className="mt-4 text-sm text-moss">Saved the latest rows below.</p> : null}
      {query.error ? <p className="mt-4 text-sm text-red-800">{query.error}</p> : null}
      <form action={collectLeads} className="mt-6 grid gap-3 border border-ink/10 bg-white p-4">
        <label className="text-sm">
          Website URLs
          <textarea className={control} name="urls" rows={5} placeholder={"https://example.com\nhttps://another-business.com"} />
        </label>
        <label className="text-sm">
          Or one public directory page
          <input className={control} name="directory" placeholder="https://example.com/members" />
        </label>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-sm">City, stored on the rows<input className={control} name="city" /></label>
          <label className="text-sm">Category<input className={control} name="category" placeholder="plumbers" /></label>
        </div>
        <SubmitButton label="Collect public contacts" pendingLabel="Reading pages" dark />
      </form>
      <p className="mt-6 text-sm text-ink/60">
        {leads.length} rows, {withEmail} with an email.
      </p>
      <div className="mt-3 overflow-x-auto border border-ink/10 bg-white">
        <table className="min-w-[880px] w-full text-left text-sm">
          <thead className="border-b border-ink/10 text-xs uppercase tracking-[0.12em] text-ink/45">
            <tr>
              {["Business", "Email", "Phone", "WhatsApp", "Name", ""].map((heading) => (
                <th key={heading} className="px-3 py-2 font-medium">{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr key={lead.id} className="border-b border-ink/5 align-top">
                <td className="px-3 py-3">
                  <p className="font-medium">{lead.business_name || "Untitled"}</p>
                  <a className="text-xs text-moss" href={lead.website} target="_blank" rel="noreferrer">{lead.website}</a>
                </td>
                <td className="px-3 py-3">{lead.emails}</td>
                <td className="px-3 py-3">{lead.phones}</td>
                <td className="px-3 py-3">{lead.whatsapp}</td>
                <td className="px-3 py-3">{lead.contact_name}</td>
                <td className="px-3 py-3">
                  <form action={deleteLead}>
                    <input type="hidden" name="id" value={lead.id} />
                    <button className="text-xs text-red-800" type="submit">Remove</button>
                  </form>
                </td>
              </tr>
            ))}
            {!leads.length ? (
              <tr>
                <td className="px-3 py-6 text-ink/50" colSpan={6}>No leads yet.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
