import { acceptInvite } from "@/lib/user-actions";
import { knownMessage, PASSWORD_MIN } from "@/lib/access";
import { sha256Hex } from "@/lib/session";
import { admin } from "@/lib/supabase";
import { SubmitButton } from "@/components/SubmitButton";

export const dynamic = "force-dynamic";

const field = "mt-2 w-full border border-white/15 bg-white/5 px-3 py-3 text-paper";

async function lookup(token: string) {
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(token)) return null;
  try {
    const { data } = await admin()
      .from("admins")
      .select("name, email, active, invite_expires")
      .eq("invite_hash", await sha256Hex(token))
      .maybeSingle();
    if (!data || !data.active || !data.invite_expires || Date.parse(String(data.invite_expires)) < Date.now()) return null;
    return { name: String(data.name || ""), email: String(data.email || "") };
  } catch {
    return null;
  }
}

export default async function InvitePage({
  params,
  searchParams
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { token } = await params;
  const query = await searchParams;
  const person = await lookup(token);

  return (
    <main className="grid min-h-screen place-items-center bg-ink px-5 text-paper">
      <div className="w-full max-w-sm">
        <img src="/logo-on-dark.png" alt="UX4U" className="h-8 w-auto" />
        {person ? (
          <form action={acceptInvite}>
            <h1 className="mt-3 font-serif text-4xl">Welcome{person.name ? `, ${person.name.split(" ")[0]}` : ""}</h1>
            <p className="mt-3 text-sm text-paper/65">
              Choose a password for <span className="text-paper">{person.email}</span>. You will use it to sign in to the studio desk.
            </p>
            {query.error ? <p className="mt-4 text-sm text-lime">{knownMessage(query.error)}</p> : null}
            <input type="hidden" name="token" value={token} />
            <input type="email" name="email" value={person.email} autoComplete="username" readOnly hidden />
            <label className="mt-6 block text-sm">
              New password
              <input name="password" type="password" required minLength={PASSWORD_MIN} maxLength={200} autoComplete="new-password" className={field} />
            </label>
            <label className="mt-4 block text-sm">
              Repeat password
              <input name="confirm" type="password" required minLength={PASSWORD_MIN} maxLength={200} autoComplete="new-password" className={field} />
            </label>
            <p className="mt-2 text-xs text-paper/50">At least {PASSWORD_MIN} characters. A short sentence is easy to remember and hard to guess.</p>
            <div className="mt-4">
              <SubmitButton label="Set password and sign in" pendingLabel="Saving" />
            </div>
          </form>
        ) : (
          <>
            <h1 className="mt-3 font-serif text-4xl">Link expired</h1>
            <p className="mt-3 text-sm text-paper/65">
              This sign-in link is not valid any more. It may have been used already or be older than 7 days. Ask an owner to send you a new one.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
