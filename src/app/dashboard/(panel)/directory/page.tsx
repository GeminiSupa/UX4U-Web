import Link from "next/link";
import { saveMapLeads } from "@/lib/actions";
import { control } from "@/lib/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { FindingRow, SelectAllButton } from "@/components/FindingRow";
import { mapCategories, searchDirectory, type MapPlace } from "@/lib/maps";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function share(count: number, total: number) {
  if (!total) return "0%";
  return `${Math.round((count / total) * 1000) / 10}%`;
}

function Stat({ label, count, total }: { label: string; count: number; total: number }) {
  return (
    <div className="border border-ink/10 bg-white p-4">
      <p className="text-xs uppercase tracking-[0.14em] text-ink/45">{label}</p>
      <p className="mt-2 font-serif text-3xl">{share(count, total)}</p>
      <p className="mt-1 text-sm text-ink/60">{count} of {total}</p>
    </div>
  );
}

export default async function DirectoryPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const query = await searchParams;
  const what = query.what || "restaurant";
  const place = query.place || "";
  let rows: MapPlace[] = [];
  let label = "";
  let note = "";
  let error = query.error || "";
  if (place && !error) {
    try {
      const found = await searchDirectory({ category: what, place });
      rows = found.places;
      label = found.label;
      note = found.note;
    } catch (caught) {
      error = caught instanceof Error ? caught.message : "The directory search failed.";
    }
  }
  const withPhone = rows.filter((row) => row.phones).length;
  const withEmail = rows.filter((row) => row.emails).length;
  const withSite = rows.filter((row) => row.website).length;
  const category = mapCategories.find((item) => item.id === what)?.label || "Restaurants";

  return (
    <div>
      <h1 className="font-serif text-4xl">Directory</h1>
      <p className="mt-2 max-w-2xl text-sm text-ink/65">
        A city list from the public map, in the same shape as a business database: name, address, phone, email, and website.
        Save the rows you want and they land in Leads.
      </p>
      {query.saved ? <p className="mt-4 text-sm text-moss">Saved {query.saved} into Leads.</p> : null}
      {error ? <p className="mt-4 text-sm text-red-800">{error}</p> : null}

      <form method="get" className="mt-6 grid gap-3 border border-ink/10 bg-white p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
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
          <input className={control} name="place" defaultValue={place} placeholder="Melbourne, Victoria, Australia" />
        </label>
        <button className="rounded-full bg-ink px-4 py-2 text-sm text-paper" type="submit">
          Build list
        </button>
      </form>
      <div className="mt-3 flex flex-wrap gap-2 text-sm">
        <Link className="rounded-full border border-ink/15 px-3 py-1" href="/dashboard/directory?what=restaurant&place=Melbourne%2C%20Victoria%2C%20Australia">
          Restaurants in Melbourne
        </Link>
        <Link className="rounded-full border border-ink/15 px-3 py-1" href="/dashboard/directory?what=restaurant&place=Sydney%2C%20Australia">
          Restaurants in Sydney
        </Link>
        <Link className="rounded-full border border-ink/15 px-3 py-1" href="/dashboard/directory?what=cafe&place=Berlin">
          Cafes in Berlin
        </Link>
      </div>

      {rows.length ? (
        <>
          <div className="mt-8">
            <p className="text-xs uppercase tracking-[0.16em] text-moss">{category}</p>
            <h2 className="mt-2 font-serif text-3xl sm:text-4xl">{category} in {label}</h2>
            <p className="mt-3 max-w-2xl text-sm text-ink/70">
              {rows.length} listings from the public map. {note} Emails appear only when the business published one. This is not a purchased contact database.
            </p>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="Listings" count={rows.length} total={rows.length} />
            <Stat label="Phone" count={withPhone} total={rows.length} />
            <Stat label="Email" count={withEmail} total={rows.length} />
            <Stat label="Website" count={withSite} total={rows.length} />
          </div>

          <form action={saveMapLeads} className="mt-6 border border-ink/10 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/10 px-4 py-3">
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-sm">Edit a cell if it is wrong, then save the ticked rows into Leads.</p>
                <SelectAllButton />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="readSites" />
                Also read up to 4 public websites
              </label>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="border-b border-ink/10 text-xs uppercase tracking-[0.12em] text-ink/45">
                  <tr>
                    {["", "Name", "Address", "City", "Phone", "Email", "Website", "Contact"].map((heading) => (
                      <th key={heading || "pick"} className="px-3 py-2 font-medium">{heading}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <FindingRow key={row.id} place={row} />
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center gap-3 px-4 py-3">
              <SubmitButton label="Save ticked rows to Leads" pendingLabel="Saving" dark />
              <Link href="/dashboard/leads" className="text-sm underline">Open Leads</Link>
            </div>
          </form>
        </>
      ) : place && !error ? (
        <p className="mt-6 text-sm text-ink/60">No public listings matched that city and category.</p>
      ) : null}
    </div>
  );
}
