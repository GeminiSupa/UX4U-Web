import { AREAS, levelOf, type Permissions, type Role } from "@/lib/access";

const LEVELS = [
  ["none", "No access"],
  ["view", "View"],
  ["edit", "Edit"]
] as const;

/** Radio grid that submits `perm_<area>` = none | view | edit. Owners always have full access. */
export function AccessGrid({ permissions = {}, role = "member", idPrefix }: { permissions?: Permissions; role?: Role; idPrefix: string }) {
  const subject = { role, permissions };
  return (
    <fieldset className="min-w-0">
      <legend className="text-sm">Area access <span className="text-ink/50">(members only; owners can do everything)</span></legend>
      <div className="mt-2 overflow-x-auto rounded-lg border border-ink/10">
        <table className="w-full min-w-[460px] text-left text-sm">
          <thead className="bg-ink/[0.03] text-xs uppercase tracking-[0.12em] text-ink/45">
            <tr>
              <th className="px-3 py-2 font-medium">Area</th>
              {LEVELS.map(([, label]) => (
                <th key={label} className="px-3 py-2 text-center font-medium">{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {AREAS.map((area) => {
              const current = role === "owner" ? "none" : levelOf(subject, area.id);
              return (
                <tr key={area.id} className="border-t border-ink/5">
                  <td className="px-3 py-2">
                    <span className="font-medium">{area.label}</span>
                    <span className="block text-xs text-ink/50">{area.hint}</span>
                  </td>
                  {LEVELS.map(([level, label]) => (
                    <td key={level} className="px-3 py-2 text-center">
                      <input
                        type="radio"
                        name={`perm_${area.id}`}
                        value={level}
                        defaultChecked={current === level}
                        aria-label={`${area.label}: ${label}`}
                        id={`${idPrefix}-${area.id}-${level}`}
                        className="h-4 w-4 accent-[#0f7a56]"
                      />
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </fieldset>
  );
}
