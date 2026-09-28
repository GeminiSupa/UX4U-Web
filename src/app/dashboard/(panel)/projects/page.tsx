import { deleteProject, saveProject } from "@/lib/actions";
import { control } from "@/lib/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { getProjects } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const query = await searchParams;
  const projects = await getProjects(false);

  return (
    <div>
      <h1 className="font-serif text-4xl">Projects</h1>
      <p className="mt-2 max-w-xl text-sm text-ink/65">
        One feature per line. Paste an image URL when you have a screenshot; it shows on the work page.
      </p>
      {query.error ? <p className="mt-4 text-sm text-red-800">Could not save that project.</p> : null}
      <form action={saveProject} className="mt-6 grid gap-3 border border-ink/10 bg-white p-4">
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-sm">Name<input className={control} name="name" required /></label>
          <label className="text-sm">URL<input className={control} name="url" placeholder="https://" required /></label>
        </div>
        <label className="text-sm">Summary<textarea className={control} name="summary" rows={2} /></label>
        <label className="text-sm">Features, one per line<textarea className={control} name="features" rows={4} /></label>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-sm">Services<input className={control} name="services" placeholder="Product, SEO" /></label>
          <label className="text-sm">Image URL<input className={control} name="image_url" /></label>
          <label className="text-sm">Order<input className={control} name="sort_order" type="number" defaultValue={projects.length + 1} /></label>
          <label className="flex items-end gap-2 text-sm"><input name="published" type="checkbox" defaultChecked /> Published</label>
        </div>
        <SubmitButton label="Add project" pendingLabel="Saving" dark />
      </form>
      <div className="mt-6 space-y-3">
        {projects.map((project) => (
          <details key={project.id} className="border border-ink/10 bg-white p-4">
            <summary className="cursor-pointer text-sm font-medium">{project.name}</summary>
            <form action={saveProject} className="mt-4 grid gap-3">
              <input type="hidden" name="id" value={project.id} />
              <div className="grid gap-3 md:grid-cols-2">
                <label className="text-sm">Name<input className={control} name="name" defaultValue={project.name} required /></label>
                <label className="text-sm">URL<input className={control} name="url" defaultValue={project.url} required /></label>
              </div>
              <label className="text-sm">Summary<textarea className={control} name="summary" rows={2} defaultValue={project.summary} /></label>
              <label className="text-sm">Features<textarea className={control} name="features" rows={5} defaultValue={project.features} /></label>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="text-sm">Services<input className={control} name="services" defaultValue={project.services} /></label>
                <label className="text-sm">Image URL<input className={control} name="image_url" defaultValue={project.image_url} /></label>
                <label className="text-sm">Order<input className={control} name="sort_order" type="number" defaultValue={project.sort_order} /></label>
                <label className="flex items-end gap-2 text-sm">
                  <input name="published" type="checkbox" defaultChecked={project.published} /> Published
                </label>
              </div>
              <SubmitButton label="Save project" pendingLabel="Saving" dark />
            </form>
            <form action={deleteProject} className="mt-3">
              <input type="hidden" name="id" value={project.id} />
              <button className="text-sm text-red-800" type="submit">Remove</button>
            </form>
          </details>
        ))}
      </div>
    </div>
  );
}
