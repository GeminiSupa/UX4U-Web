/** Desk areas and who may see or change them. Pure logic, safe on client and server. */

export const AREAS = [
  { id: "analytics", label: "Analytics", href: "/dashboard/analytics", hint: "Visitors, sources and KPIs" },
  { id: "tasks", label: "Tasks & time", href: "/dashboard/tasks", hint: "View: own tasks and timer. Edit: manage everyone" },
  { id: "chat", label: "Team chat", href: "/dashboard/chat", hint: "Channels for the team" },
  { id: "trends", label: "Trend watch", href: "/dashboard/trends", hint: "Weekly AI and web briefing" },
  { id: "team", label: "Team page", href: "/dashboard/team", hint: "Public team profiles" },
  { id: "projects", label: "Projects", href: "/dashboard/projects", hint: "Case studies on the site" },
  { id: "offers", label: "Offers", href: "/dashboard/offers", hint: "Packages on the home page" },
  { id: "posts", label: "Journal", href: "/dashboard/posts", hint: "Blog posts" },
  { id: "directory", label: "Directory", href: "/dashboard/directory", hint: "Public map search" },
  { id: "leads", label: "Leads", href: "/dashboard/leads", hint: "Private outreach list" },
  { id: "inquiries", label: "Inquiries", href: "/dashboard/inquiries", hint: "Contact form messages" }
] as const;

export type Area = (typeof AREAS)[number]["id"];
export type Level = "none" | "view" | "edit";
export type Role = "owner" | "member";
export type Permissions = Partial<Record<Area, Level>>;

export type StaffUser = {
  id: string;
  email: string;
  name: string;
  title: string;
  role: Role;
  permissions: Permissions;
  active: boolean;
  sessionVersion: number;
  lastLoginAt: string | null;
  invitePending: boolean;
  /** Signed in with DASHBOARD_PASSWORD before users.sql was run. */
  bootstrap?: boolean;
};

const LEVELS: Level[] = ["none", "view", "edit"];
const AREA_IDS = new Set<string>(AREAS.map((area) => area.id));

export function isArea(value: string): value is Area {
  return AREA_IDS.has(value);
}

export function isLevel(value: unknown): value is Level {
  return typeof value === "string" && (LEVELS as string[]).includes(value);
}

export function levelOf(user: Pick<StaffUser, "role" | "permissions"> | null, area: Area): Level {
  if (!user) return "none";
  if (user.role === "owner") return "edit";
  const level = user.permissions[area];
  return isLevel(level) ? level : "none";
}

export function can(user: Pick<StaffUser, "role" | "permissions"> | null, area: Area, need: "view" | "edit") {
  const level = levelOf(user, area);
  return need === "view" ? level !== "none" : level === "edit";
}

export function isOwner(user: Pick<StaffUser, "role"> | null) {
  return user?.role === "owner";
}

/** Keeps only known areas with known levels; drops "none" to keep rows small. */
export function cleanPermissions(raw: unknown): Permissions {
  const result: Permissions = {};
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return result;
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (isArea(key) && isLevel(value) && value !== "none") result[key] = value;
  }
  return result;
}

/** Reads `perm_<area>` fields from a submitted form. */
export function permissionsFromEntries(entries: Iterable<[string, unknown]>): Permissions {
  const raw: Record<string, unknown> = {};
  for (const [key, value] of entries) {
    if (key.startsWith("perm_")) raw[key.slice(5)] = String(value);
  }
  return cleanPermissions(raw);
}

export function visibleAreas(user: Pick<StaffUser, "role" | "permissions"> | null) {
  return AREAS.filter((area) => can(user, area.id, "view"));
}

/** Directory saves rows into Leads, so saving needs edit rights on Leads. */
export function canSaveDirectoryRows(user: Pick<StaffUser, "role" | "permissions"> | null) {
  return can(user, "directory", "view") && can(user, "leads", "edit");
}

/** Sign-in lockout: too many failures inside the window blocks further tries. */
export const LOCKOUT = { windowMinutes: 15, perEmail: 5, perIp: 20 } as const;

/** Failures since the most recent success; attempts must be newest first. */
export function failuresSinceSuccess(attempts: { success: boolean }[]) {
  let count = 0;
  for (const attempt of attempts) {
    if (attempt.success) break;
    count += 1;
  }
  return count;
}

export function isLockedOut(emailFailures: number, ipFailures: number) {
  return emailFailures >= LOCKOUT.perEmail || ipFailures >= LOCKOUT.perIp;
}

export const PASSWORD_MIN = 10;

export const MESSAGES = {
  short: `Use at least ${PASSWORD_MIN} characters.`,
  long: "That password is too long.",
  mismatch: "The two passwords do not match.",
  badLink: "This link is not valid.",
  expired: "This link has expired or was already used. Ask an owner for a new one.",
  saveFailed: "Could not save the password. Try again.",
  signInFailed: "Could not sign you in.",
  wrongCurrent: "Your current password did not match."
} as const;

const KNOWN_MESSAGES = new Set<string>(Object.values(MESSAGES));

/** Only echo messages this app wrote, so a crafted URL cannot put its own text on the page. */
export function knownMessage(value: string | undefined) {
  return value && KNOWN_MESSAGES.has(value) ? value : value ? "Something went wrong. Try again." : "";
}

export function passwordProblem(password: string, confirm?: string) {
  if (password.length < PASSWORD_MIN) return MESSAGES.short;
  if (password.length > 200) return MESSAGES.long;
  if (confirm !== undefined && password !== confirm) return MESSAGES.mismatch;
  return "";
}
