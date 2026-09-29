import { deleteTeam, saveTeam } from "@/lib/actions";
import { control } from "@/lib/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { getTeam } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function TeamPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const query = await searchParams;
  const team = await getTeam(false);

  return (
    <div>
      <h1 className="font-serif text-4xl">Team</h1>
      <p className="mt-2 text-sm text-ink/65">Names, roles, and a photo. Photos are stored in the studio image bucket.</p>
      {query.error ? (
        <p className="mt-4 text-sm text-red-800">
          Could not save. If this was a photo, run the storage SQL in Supabase, then try again.
        </p>
      ) : null}
      <form action={saveTeam} className="mt-6 grid gap-3 border border-ink/10 bg-white p-4 md:grid-cols-2">
        <label className="text-sm">Name<input className={control} name="name" required /></label>
        <label className="text-sm">Role<input className={control} name="role" required /></label>
        <label className="text-sm md:col-span-2">Bio<textarea className={control} name="bio" rows={3} /></label>
        <label className="text-sm">Photo<input className={control} name="photo" type="file" accept="image/jpeg,image/png,image/webp,image/gif" /></label>
        <label className="text-sm">Order<input className={control} name="sort_order" type="number" defaultValue={team.length + 1} /></label>
        <label className="flex items-end gap-2 text-sm"><input name="published" type="checkbox" defaultChecked /> Published</label>
        <div className="md:col-span-2"><SubmitButton label="Add team member" pendingLabel="Saving" dark /></div>
      </form>
      <div className="mt-6 space-y-3">
        {team.map((person) => (
          <details key={person.id} className="border border-ink/10 bg-white p-4">
            <summary className="flex cursor-pointer items-center gap-3 text-sm">
              {person.photo_url ? (
                <img src={person.photo_url} alt="" className="h-10 w-10 rounded-full object-cover" />
              ) : (
                <span className="grid h-10 w-10 place-items-center rounded-full bg-ink text-xs text-lime">{person.name.slice(0, 1)}</span>
              )}
              <span>
                <span className="font-medium">{person.name}</span>
                <span className="text-ink/50"> — {person.role}</span>
              </span>
            </summary>
            <form action={saveTeam} className="mt-4 grid gap-3 md:grid-cols-2">
              <input type="hidden" name="id" value={person.id} />
              <input type="hidden" name="photo_url" value={person.photo_url} />
              <label className="text-sm">Name<input className={control} name="name" defaultValue={person.name} required /></label>
              <label className="text-sm">Role<input className={control} name="role" defaultValue={person.role} required /></label>
              <label className="text-sm md:col-span-2">Bio<textarea className={control} name="bio" rows={3} defaultValue={person.bio} /></label>
              <label className="text-sm">Replace photo<input className={control} name="photo" type="file" accept="image/jpeg,image/png,image/webp,image/gif" /></label>
              <label className="text-sm">Order<input className={control} name="sort_order" type="number" defaultValue={person.sort_order} /></label>
              <label className="flex items-end gap-2 text-sm">
                <input name="published" type="checkbox" defaultChecked={person.published} /> Published
              </label>
              <div className="flex gap-3 md:col-span-2">
                <SubmitButton label="Save" pendingLabel="Saving" dark />
              </div>
            </form>
            <form action={deleteTeam} className="mt-3">
              <input type="hidden" name="id" value={person.id} />
              <button className="text-sm text-red-800" type="submit">Remove</button>
            </form>
          </details>
        ))}
      </div>
    </div>
  );
}
