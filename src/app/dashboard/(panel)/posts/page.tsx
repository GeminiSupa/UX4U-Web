import { deletePost, savePost } from "@/lib/actions";
import { control } from "@/lib/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { getPosts } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function PostsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const query = await searchParams;
  const posts = await getPosts(false);

  return (
    <div>
      <h1 className="font-serif text-4xl">Journal</h1>
      <p className="mt-2 text-sm text-ink/65">Published notes appear on the site. Separate paragraphs with a blank line.</p>
      {query.error ? <p className="mt-4 text-sm text-red-800">Could not save that note. The web address may already be in use.</p> : null}
      <form action={savePost} className="mt-6 grid gap-3 border border-ink/10 bg-white p-4">
        <label className="text-sm">Title<input className={control} name="title" required /></label>
        <label className="text-sm">Slug<input className={control} name="slug" placeholder="left blank to generate" /></label>
        <label className="text-sm">Excerpt<textarea className={control} name="excerpt" rows={2} /></label>
        <label className="text-sm">Body<textarea className={control} name="body" rows={8} /></label>
        <label className="flex items-center gap-2 text-sm"><input name="published" type="checkbox" defaultChecked /> Published</label>
        <SubmitButton label="Add note" pendingLabel="Saving" dark />
      </form>
      <div className="mt-6 space-y-3">
        {posts.map((post) => (
          <details key={post.id} className="border border-ink/10 bg-white p-4">
            <summary className="cursor-pointer text-sm font-medium">{post.title}</summary>
            <form action={savePost} className="mt-4 grid gap-3">
              <input type="hidden" name="id" value={post.id} />
              <label className="text-sm">Title<input className={control} name="title" defaultValue={post.title} required /></label>
              <label className="text-sm">Slug<input className={control} name="slug" defaultValue={post.slug} /></label>
              <label className="text-sm">Excerpt<textarea className={control} name="excerpt" rows={2} defaultValue={post.excerpt} /></label>
              <label className="text-sm">Body<textarea className={control} name="body" rows={8} defaultValue={post.body} /></label>
              <label className="flex items-center gap-2 text-sm">
                <input name="published" type="checkbox" defaultChecked={post.published} /> Published
              </label>
              <SubmitButton label="Save note" pendingLabel="Saving" dark />
            </form>
            <form action={deletePost} className="mt-3">
              <input type="hidden" name="id" value={post.id} />
              <button className="text-sm text-red-800" type="submit">Remove</button>
            </form>
          </details>
        ))}
      </div>
    </div>
  );
}
