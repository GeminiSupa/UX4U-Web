import Link from "next/link";
import { collectLeads, deleteLead, saveMapLeads, updateLead } from "@/lib/actions";
import { control } from "@/lib/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { getLeads, type Lead } from "@/lib/data";
import { mapCategories, searchMap, type MapPlace } from "@/lib/maps";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function on(value: string | undefined) {
  return value === "1" || value === "on";
}

function matches(lead: Lead, find: string, hasEmail: boolean, hasPhone: boolean, hasSite: boolean, notContacted: boolean) {
  if (hasEmail && !lead.emails) return false;
  if (hasPhone && !lead.phones) return false;
  if (hasSite && !lead.website) return false;
  if (notContacted && lead.contacted) return false;
  if (!find) return true;
  const haystack = [lead.business_name, lead.emails, lead.phones, lead.city, lead.category, lead.website]
    .join(" ")
    .toLowerCase();
  return haystack.includes(find);
}

export default async function LeadsPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const query = await searchParams;
  const what = query.what || "restaurant";
  const where = query.where || "";
  const keyword = query.keyword || "";
  const needPhone = on(query.needPhone);
  const needSite = on(query.needSite);
  const find = (query.find || "").trim().toLowerCase();
  const hasEmail = on(query.hasEmail);
  const hasPhone = on(query.hasPhone);
  const hasSite = on(query.hasSite);
  const notContacted = on(query.open);

  let places: MapPlace[] = [];
  let mapNote = "";
  let mapError = "";
  if (where) {
    try {
      const found = await searchMap({ category: what, city: where, keyword, needPhone, needWebsite: needSite });
      places = found.places;
      mapNote = found.note;
    } catch (error) {
      mapError = error instanceof Error ? error.message : "The map search failed.";
    }
  }

  const leads = (await getLeads()).filter((lead) => matches(lead, find, hasEmail, hasPhone, hasSite, notContacted));
  const withEmail = leads.filter((lead) => lead.emails).length;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl">Leads</h1>
          <p className="mt-2 max-w-xl text-sm text-ink/65">
            Build a restaurant outreach list for a country, then track owner, current POS, and whether you have contacted them. Listings come from the public map and from pages the business has published.
          </p>
        </div>
        <Link href="/dashboard/leads/export" className="rounded-full border border-ink/15 px-4 py-2 text-sm">
          Download CSV
        </Link>
      </div>

      {query.saved ? <p className="mt-4 text-sm text-moss">Saved {query.saved} listing{query.saved === "1" ? "" : "s"}.</p> : null}
      {query.error ? <p className="mt-4 text-sm text-red-800">{query.error}</p> : null}
      {mapError ? <p className="mt-4 text-sm text-red-800">{mapError}</p> : null}
      {mapNote ? <p className="mt-4 text-sm text-ink/70">{mapNote}</p> : null}

      <form method="get" className="mt-6 grid gap-3 border border-ink/10 bg-white p-4">
        <div className="grid gap-3 md:grid-cols-3">
          <label className="text-sm">
            Category
            <select className={control} name="what" defaultValue={what}>
              {mapCategories.map((item) => (
                <option key={item.id} value={item.id}>{item.label}</option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            City
            <input className={control} name="where" defaultValue={where} placeholder="California or Islamabad" />
          </label>
          <label className="text-sm">
            Name contains
            <input className={control} name="keyword" defaultValue={keyword} placeholder="Optional" />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" name="needPhone" value="1" defaultChecked={needPhone} />
            Has a phone
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="needSite" value="1" defaultChecked={needSite} />
            Has a website
          </label>
          <button className="rounded-full bg-ink px-4 py-2 text-sm text-paper" type="submit">
            Search map
          </button>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          {[
            ["Germany", "Germany"],
            ["UAE", "United Arab Emirates"],
            ["Australia", "Australia"]
          ].map(([label, place]) => (
            <Link
              key={place}
              href={`/dashboard/leads?what=restaurant&where=${encodeURIComponent(place)}`}
              className="rounded-full border border-ink/15 px-3 py-1"
            >
              Restaurants in {label}
            </Link>
          ))}
        </div>
      </form>

      {places.length ? (
        <form action={saveMapLeads} className="mt-4 border border-ink/10 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/10 px-4 py-3">
            <p className="text-sm">{places.length} listings. Tick the ones to keep.</p>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="readSites" />
              Also read up to 4 public websites
            </label>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[760px] w-full text-left text-sm">
              <thead className="border-b border-ink/10 text-xs uppercase tracking-[0.12em] text-ink/45">
                <tr>
                  {["", "Business", "Phone", "Website", "City"].map((heading) => (
                    <th key={heading || "pick"} className="px-3 py-2 font-medium">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {places.map((place) => (
                  <tr key={place.id} className="border-b border-ink/5 align-top">
                    <td className="px-3 py-3">
                      <input type="checkbox" name="pick" value={place.id} defaultChecked />
                      <input type="hidden" name="place" value={JSON.stringify(place)} />
                    </td>
                    <td className="px-3 py-3">
                      <p className="font-medium">{place.business_name}</p>
                      <p className="text-xs text-ink/50">{place.category}{place.address ? ` · ${place.address}` : ""}</p>
                    </td>
                    <td className="px-3 py-3">{place.phones || "—"}</td>
                    <td className="px-3 py-3">
                      {place.website ? (
                        <a className="text-moss" href={place.website} target="_blank" rel="noreferrer">{place.website.replace(/^https?:\/\//, "")}</a>
                      ) : "—"}
                    </td>
                    <td className="px-3 py-3">{place.city}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3">
            <SubmitButton label="Save selected" pendingLabel="Saving" dark />
          </div>
        </form>
      ) : where && !mapError ? (
        <p className="mt-4 text-sm text-ink/60">No listings matched those filters.</p>
      ) : null}

      <details className="mt-6 border border-ink/10 bg-white p-4">
        <summary className="cursor-pointer text-sm">Or paste websites you already have</summary>
        <form action={collectLeads} className="mt-4 grid gap-3">
          <label className="text-sm">
            Website URLs
            <textarea className={control} name="urls" rows={4} placeholder={"https://example.com\nhttps://another-business.com"} />
          </label>
          <label className="text-sm">
            Or one public directory page
            <input className={control} name="directory" placeholder="https://example.com/members" />
          </label>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-sm">City<input className={control} name="city" /></label>
            <label className="text-sm">Category<input className={control} name="category" placeholder="plumbers" /></label>
          </div>
          <SubmitButton label="Collect public contacts" pendingLabel="Reading pages" dark />
        </form>
      </details>

      <form method="get" className="mt-8 flex flex-wrap items-end gap-3">
        {where ? <input type="hidden" name="where" value={where} /> : null}
        {what ? <input type="hidden" name="what" value={what} /> : null}
        {keyword ? <input type="hidden" name="keyword" value={keyword} /> : null}
        {needPhone ? <input type="hidden" name="needPhone" value="1" /> : null}
        {needSite ? <input type="hidden" name="needSite" value="1" /> : null}
        <label className="text-sm">
          Search saved
          <input className={control} name="find" defaultValue={query.find || ""} placeholder="Name, email, phone, city" />
        </label>
        <label className="flex items-center gap-2 pb-2 text-sm">
          <input type="checkbox" name="hasEmail" value="1" defaultChecked={hasEmail} />
          Email
        </label>
        <label className="flex items-center gap-2 pb-2 text-sm">
          <input type="checkbox" name="hasPhone" value="1" defaultChecked={hasPhone} />
          Phone
        </label>
        <label className="flex items-center gap-2 pb-2 text-sm">
          <input type="checkbox" name="hasSite" value="1" defaultChecked={hasSite} />
          Website
        </label>
        <label className="flex items-center gap-2 pb-2 text-sm">
          <input type="checkbox" name="open" value="1" defaultChecked={notContacted} />
          Not contacted
        </label>
        <button className="mb-0.5 rounded-full border border-ink/15 px-4 py-2 text-sm" type="submit">
          Filter
        </button>
      </form>
      <p className="mt-4 text-sm text-ink/60">
        {leads.length} saved rows, {withEmail} with an email.
      </p>
      <div className="mt-3 overflow-x-auto border border-ink/10 bg-white">
        <table className="min-w-[1100px] w-full text-left text-sm">
          <thead className="border-b border-ink/10 text-xs uppercase tracking-[0.12em] text-ink/45">
            <tr>
              {["Restaurant", "City", "Owner", "Email", "Phone", "Website", "Current POS", "Contacted", ""].map((heading) => (
                <th key={heading || "actions"} className="px-3 py-2 font-medium">{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => {
              const formId = `lead-${lead.id}`;
              return (
                <tr key={lead.id} className="border-b border-ink/5 align-top">
                  <td className="px-3 py-3 font-medium">{lead.business_name || "Untitled"}</td>
                  <td className="px-3 py-3">{lead.city}</td>
                  <td className="px-3 py-3">
                    <form id={formId} action={updateLead}>
                      <input type="hidden" name="id" value={lead.id} />
                      <input className={control} name="contact_name" defaultValue={lead.contact_name} placeholder="Owner" />
                    </form>
                  </td>
                  <td className="px-3 py-3 text-xs">{lead.emails || "—"}</td>
                  <td className="px-3 py-3 text-xs">{lead.phones || "—"}</td>
                  <td className="px-3 py-3 text-xs">
                    {lead.website ? (
                      <a className="text-moss" href={lead.website} target="_blank" rel="noreferrer">{lead.website.replace(/^https?:\/\//, "")}</a>
                    ) : "—"}
                  </td>
                  <td className="px-3 py-3">
                    <input className={control} name="current_pos" form={formId} defaultValue={lead.current_pos || ""} placeholder="Square, Toast..." />
                  </td>
                  <td className="px-3 py-3">
                    <select className={control} name="contacted" form={formId} defaultValue={lead.contacted ? "yes" : "no"}>
                      <option value="no">Not contacted</option>
                      <option value="yes">Contacted</option>
                    </select>
                  </td>
                  <td className="px-3 py-3">
                    <button className="text-xs text-moss" type="submit" form={formId}>Save</button>
                    <form action={deleteLead} className="mt-2">
                      <input type="hidden" name="id" value={lead.id} />
                      <button className="text-xs text-red-800" type="submit">Remove</button>
                    </form>
                  </td>
                </tr>
              );
            })}
            {!leads.length ? (
              <tr>
                <td className="px-3 py-6 text-ink/50" colSpan={3}>No leads yet.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
