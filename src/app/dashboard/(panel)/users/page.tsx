import { cookies } from "next/headers";
import { AREAS, levelOf, type StaffUser } from "@/lib/access";
import { INVITE_FLASH, listUsers, recentActivity, requireOwner, usersReady } from "@/lib/auth";
import { deleteUser, inviteUser, reissueInvite, signOutEverywhere, updateUser } from "@/lib/user-actions";
import { control } from "@/lib/ui";
import { AccessGrid } from "@/components/AccessGrid";
import { CopyButton } from "@/components/CopyButton";
import { SubmitButton } from "@/components/SubmitButton";

export const dynamic = "force-dynamic";

const errors: Record<string, string> = {
  setup: "Run supabase/users.sql in the Supabase SQL editor first, then add people.",
  fields: "Add a name and a valid email address.",
  taken: "Someone already uses that email address.",
  save: "Could not save that change. Try again.",
  missing: "That person no longer exists.",
  "last-owner": "There must always be at least one active owner.",
  self: "You cannot remove your own account."
};

function when(value: string | null) {
  if (!value) return "Never";
  return new Date(value).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

function readFlash(raw: string | undefined) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { name?: string; link?: string };
    return parsed.link ? { name: parsed.name || "", link: parsed.link } : null;
  } catch {
    return null;
  }
}

function Summary({ user }: { user: StaffUser }) {
  if (user.role === "owner") return <span className="text-ink/60">Everything, including people</span>;
  const parts = AREAS.map((area) => [area.label, levelOf(user, area.id)] as const).filter(([, level]) => level !== "none");
  if (!parts.length) return <span className="text-ink/60">No areas yet</span>;
  return (
    <span className="flex flex-wrap gap-1">
      {parts.map(([label, level]) => (
        <span key={label} className={`rounded-full px-2 py-0.5 text-xs ${level === "edit" ? "bg-moss/10 text-moss" : "bg-ink/5 text-ink/70"}`}>
          {label} · {level}
        </span>
      ))}
    </span>
  );
}

export default async function UsersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const me = await requireOwner();
  const query = await searchParams;
  const ready = await usersReady();
  const [users, activity] = ready ? await Promise.all([listUsers(), recentActivity(40)]) : [[], []];
  const flash = readFlash((await cookies()).get(INVITE_FLASH)?.value);

  return (
    <div className="max-w-5xl">
      <h1 className="font-serif text-4xl">People and access</h1>
      <p className="mt-2 max-w-2xl text-sm text-ink/65">
        Invite your team, then choose which desk areas each person can view or edit. Owners can do everything, including managing people.
      </p>

      {!ready ? (
        <p className="mt-6 border border-amber-800/20 bg-amber-50 px-4 py-3 text-sm">
          Run <code>supabase/users.sql</code> in the Supabase SQL editor to turn on personal accounts. You are signed in with the setup password until then.
        </p>
      ) : me.bootstrap ? (
        <p className="mt-6 border border-amber-800/20 bg-amber-50 px-4 py-3 text-sm">
          You are signed in with the setup password. Invite yourself as an owner below, open the link, set a password, and the setup password stops working.
        </p>
      ) : null}
      {query.error ? <p className="mt-4 text-sm text-red-800">{errors[query.error] || "Something went wrong."}</p> : null}
      {query.saved ? <p className="mt-4 text-sm text-moss">Saved.</p> : null}

      {flash ? (
        <div className="mt-6 rounded-xl border border-moss/30 bg-moss/5 p-4">
          <p className="text-sm font-medium">Sign-in link for {flash.name}</p>
          <p className="mt-1 text-sm text-ink/65">
            Send this link privately. It works once, for {7} days, and lets them choose their own password. It is only shown here for a few minutes.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <code className="min-w-0 flex-1 break-all rounded bg-white px-3 py-2 text-xs">{flash.link}</code>
            <CopyButton value={flash.link} />
          </div>
        </div>
      ) : null}

      {ready ? (
        <details className="mt-6 rounded-xl border border-ink/10 bg-white p-4" open={!users.length}>
          <summary className="cursor-pointer text-sm font-medium">Invite a person</summary>
          <form action={inviteUser} className="mt-4 grid gap-4">
            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-sm">Name<input className={control} name="name" required maxLength={120} /></label>
              <label className="text-sm">Email<input className={control} name="email" type="email" required maxLength={200} /></label>
              <label className="text-sm">Job title<input className={control} name="title" maxLength={120} placeholder="Designer, Writer, Sales" /></label>
              <label className="text-sm">
                Role
                <select className={control} name="role" defaultValue={users.length ? "member" : "owner"}>
                  <option value="member">Member: only the areas below</option>
                  <option value="owner">Owner: everything</option>
                </select>
              </label>
            </div>
            <AccessGrid idPrefix="new" />
            <div><SubmitButton label="Create sign-in link" pendingLabel="Creating" dark /></div>
          </form>
        </details>
      ) : null}

      <div className="mt-6 space-y-3">
        {users.map((user) => (
          <details key={user.id} className="rounded-xl border border-ink/10 bg-white p-4">
            <summary className="flex cursor-pointer flex-wrap items-center gap-x-4 gap-y-2 text-sm">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-ink text-xs text-lime">
                {(user.name || user.email).slice(0, 1).toUpperCase()}
              </span>
              <span className="min-w-40">
                <span className="font-medium">{user.name || user.email}</span>
                {user.id === me.id ? <span className="text-ink/50"> (you)</span> : null}
                <span className="block text-xs text-ink/50">{user.email}{user.title ? ` · ${user.title}` : ""}</span>
              </span>
              <span className={`rounded-full px-2 py-0.5 text-xs ${user.role === "owner" ? "bg-ink text-paper" : "bg-ink/5"}`}>{user.role}</span>
              {!user.active ? <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-800">deactivated</span> : null}
              {user.invitePending ? <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-900">invite open</span> : null}
              <span className="flex-1"><Summary user={user} /></span>
              <span className="text-xs text-ink/50">Last sign-in: {when(user.lastLoginAt)}</span>
            </summary>
            <form action={updateUser} className="mt-4 grid gap-4">
              <input type="hidden" name="id" value={user.id} />
              <div className="grid gap-3 md:grid-cols-3">
                <label className="text-sm">Name<input className={control} name="name" defaultValue={user.name} maxLength={120} /></label>
                <label className="text-sm">Job title<input className={control} name="title" defaultValue={user.title} maxLength={120} /></label>
                <label className="text-sm">
                  Role
                  <select className={control} name="role" defaultValue={user.role}>
                    <option value="member">Member</option>
                    <option value="owner">Owner</option>
                  </select>
                </label>
              </div>
              <AccessGrid idPrefix={user.id} permissions={user.permissions} role={user.role} />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="active" defaultChecked={user.active} /> Active (untick to block sign-in immediately)
              </label>
              <div><SubmitButton label="Save access" pendingLabel="Saving" dark /></div>
            </form>
            <div className="mt-4 flex flex-wrap gap-4 border-t border-ink/5 pt-4 text-sm">
              <form action={reissueInvite}>
                <input type="hidden" name="id" value={user.id} />
                <button type="submit" className="text-moss">New sign-in link (password reset)</button>
              </form>
              <form action={signOutEverywhere}>
                <input type="hidden" name="id" value={user.id} />
                <button type="submit" className="text-ink/70">Sign out on all devices</button>
              </form>
              {user.id !== me.id ? (
                <form action={deleteUser}>
                  <input type="hidden" name="id" value={user.id} />
                  <button type="submit" className="text-red-800">Remove person</button>
                </form>
              ) : null}
            </div>
          </details>
        ))}
      </div>

      {ready ? (
        <section className="mt-10">
          <h2 className="font-serif text-2xl">Recent activity</h2>
          <p className="mt-1 text-sm text-ink/60">Sign-ins and changes made in the desk.</p>
          <ol className="mt-4 divide-y divide-ink/5 rounded-xl border border-ink/10 bg-white">
            {activity.map((item) => (
              <li key={item.id} className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3 text-sm">
                <span>
                  <span className="font-medium">{item.actor_name || "Someone"}</span> {item.action.charAt(0).toLowerCase() + item.action.slice(1)}
                  {item.detail ? <span className="text-ink/60">: {item.detail}</span> : null}
                </span>
                <span className="text-xs text-ink/45">{when(item.created_at)}</span>
              </li>
            ))}
            {!activity.length ? <li className="px-4 py-6 text-sm text-ink/50">Nothing yet.</li> : null}
          </ol>
        </section>
      ) : null}
    </div>
  );
}
