import { login } from "@/lib/actions";
import { SubmitButton } from "@/components/SubmitButton";

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const query = await searchParams;
  return (
    <main className="grid min-h-screen place-items-center bg-ink px-5 text-paper">
      <form action={login} className="w-full max-w-sm">
        <p className="text-xs tracking-[0.22em] text-lime">UX4U</p>
        <h1 className="mt-3 font-serif text-4xl">Studio desk</h1>
        <p className="mt-3 text-sm text-paper/65">Team, projects, offers, journal, and the lead list.</p>
        {query.error ? <p className="mt-4 text-sm text-lime">That password did not match.</p> : null}
        <label className="mt-6 block text-sm">
          Password
          <input
            name="password"
            type="password"
            required
            className="mt-2 w-full border border-white/15 bg-white/5 px-3 py-3 text-paper"
          />
        </label>
        <div className="mt-4">
          <SubmitButton label="Enter" pendingLabel="Checking" />
        </div>
      </form>
    </main>
  );
}
