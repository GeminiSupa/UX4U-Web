import { Desk, type DeskLink } from "@/components/Desk";
import { can, visibleAreas } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { runningEntry, unreadCount } from "@/lib/team";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const links: DeskLink[] = [{ href: "/dashboard", label: "Overview" }];
  for (const area of visibleAreas(user)) {
    links.push({ href: area.href, label: area.label });
    if (area.id === "tasks") links.push({ href: "/dashboard/work", label: "Timesheets", child: true });
  }
  if (user.role === "owner") links.push({ href: "/dashboard/users", label: "People & access" });
  const [unread, running] = user.bootstrap
    ? [0, null]
    : await Promise.all([unreadCount(user.id), can(user, "tasks", "view") ? runningEntry(user.id) : Promise.resolve(null)]);
  return (
    <Desk
      links={links}
      who={{ name: user.name || user.email || "Owner", role: user.role, setup: Boolean(user.bootstrap) }}
      unread={unread}
      timer={running ? { startedAt: running.started_at, title: running.task_title || "General work" } : null}
    >
      {children}
    </Desk>
  );
}
