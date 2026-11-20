import { knownMessage, PASSWORD_MIN, visibleAreas } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { changePassword, updateProfile } from "@/lib/user-actions";
import { control } from "@/lib/ui";
import { SubmitButton } from "@/components/SubmitButton";

export const dynamic = "force-dynamic";

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ error?: string; saved?: string }> }) {
  const user = await requireUser();
  const query = await searchParams;
  const areas = visibleAreas(user);

  return (
    <div className="max-w-2xl">
      <h1 className="font-serif text-4xl">Your account</h1>
      <p className="mt-2 text-sm text-ink/65">
        {user.email || "Setup sign-in"} · {user.role === "owner" ? "Owner" : "Member"}
      </p>
      {query.error === "setup" ? (
        <p className="mt-4 text-sm text-red-800">You are using the setup password. Invite yourself as an owner on the People page first.</p>
      ) : query.error ? (
        <p className="mt-4 text-sm text-red-800">{query.error === "name" ? "Add your name." : knownMessage(query.error)}</p>
      ) : null}
      {query.saved === "password" ? <p className="mt-4 text-sm text-moss">Password changed. Other devices were signed out.</p> : null}
      {query.saved === "profile" ? <p className="mt-4 text-sm text-moss">Profile saved.</p> : null}

      <section className="mt-6 rounded-xl border border-ink/10 bg-white p-4">
        <h2 className="text-sm font-medium">What you can open</h2>
        <ul className="mt-3 flex flex-wrap gap-2 text-sm">
          {user.role === "owner" ? <li className="rounded-full bg-ink px-3 py-1 text-paper">Everything, including people</li> : null}
          {user.role !== "owner"
            ? areas.map((area) => (
                <li key={area.id} className="rounded-full bg-ink/5 px-3 py-1">
                  {area.label} · {user.permissions[area.id]}
                </li>
              ))
            : null}
          {user.role !== "owner" && !areas.length ? <li className="text-ink/60">No areas yet. Ask an owner for access.</li> : null}
        </ul>
      </section>

      {!user.bootstrap ? (
        <>
          <form action={updateProfile} className="mt-6 grid gap-3 rounded-xl border border-ink/10 bg-white p-4">
            <h2 className="text-sm font-medium">Profile</h2>
            <label className="text-sm">Name<input className={control} name="name" defaultValue={user.name} required maxLength={120} /></label>
            <label className="text-sm">Job title<input className={control} name="title" defaultValue={user.title} maxLength={120} /></label>
            <div><SubmitButton label="Save profile" pendingLabel="Saving" dark /></div>
          </form>

          <form action={changePassword} className="mt-6 grid gap-3 rounded-xl border border-ink/10 bg-white p-4">
            <h2 className="text-sm font-medium">Change password</h2>
            <input type="email" name="email" value={user.email} autoComplete="username" readOnly hidden />
            <label className="text-sm">Current password<input className={control} name="current" type="password" required autoComplete="current-password" /></label>
            <label className="text-sm">New password<input className={control} name="password" type="password" required minLength={PASSWORD_MIN} maxLength={200} autoComplete="new-password" /></label>
            <label className="text-sm">Repeat new password<input className={control} name="confirm" type="password" required minLength={PASSWORD_MIN} maxLength={200} autoComplete="new-password" /></label>
            <p className="text-xs text-ink/50">Changing your password signs you out on every other device.</p>
            <div><SubmitButton label="Change password" pendingLabel="Saving" dark /></div>
          </form>
        </>
      ) : null}
    </div>
  );
}
