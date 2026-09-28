import { deleteOffer, saveOffer } from "@/lib/actions";
import { control } from "@/lib/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { getOffers } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function OffersPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const query = await searchParams;
  const offers = await getOffers(false);

  return (
    <div>
      <h1 className="font-serif text-4xl">Offers</h1>
      <p className="mt-2 text-sm text-ink/65">The engagements on the home page. One point per line.</p>
      {query.error ? <p className="mt-4 text-sm text-red-800">Could not save that offer.</p> : null}
      <form action={saveOffer} className="mt-6 grid gap-3 border border-ink/10 bg-white p-4">
        <label className="text-sm">Name<input className={control} name="name" required /></label>
        <label className="text-sm">Summary<textarea className={control} name="summary" rows={2} /></label>
        <label className="text-sm">Points<textarea className={control} name="points" rows={4} /></label>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-sm">Order<input className={control} name="sort_order" type="number" defaultValue={offers.length + 1} /></label>
          <label className="flex items-end gap-2 text-sm"><input name="published" type="checkbox" defaultChecked /> Published</label>
        </div>
        <SubmitButton label="Add offer" pendingLabel="Saving" dark />
      </form>
      <div className="mt-6 space-y-3">
        {offers.map((offer) => (
          <details key={offer.id} className="border border-ink/10 bg-white p-4">
            <summary className="cursor-pointer text-sm font-medium">{offer.name}</summary>
            <form action={saveOffer} className="mt-4 grid gap-3">
              <input type="hidden" name="id" value={offer.id} />
              <label className="text-sm">Name<input className={control} name="name" defaultValue={offer.name} required /></label>
              <label className="text-sm">Summary<textarea className={control} name="summary" rows={2} defaultValue={offer.summary} /></label>
              <label className="text-sm">Points<textarea className={control} name="points" rows={4} defaultValue={offer.points} /></label>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="text-sm">Order<input className={control} name="sort_order" type="number" defaultValue={offer.sort_order} /></label>
                <label className="flex items-end gap-2 text-sm">
                  <input name="published" type="checkbox" defaultChecked={offer.published} /> Published
                </label>
              </div>
              <SubmitButton label="Save offer" pendingLabel="Saving" dark />
            </form>
            <form action={deleteOffer} className="mt-3">
              <input type="hidden" name="id" value={offer.id} />
              <button className="text-sm text-red-800" type="submit">Remove</button>
            </form>
          </details>
        ))}
      </div>
    </div>
  );
}
