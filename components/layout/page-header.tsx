import { currentTime, loadAlerts, SEVERITY_RANK } from "@/lib/alerts";
import { ActiveUsers } from "./active-users";
import { MobileNav } from "./mobile-nav";
import { NotificationBell } from "./notification-bell";

// Async server component: it loads the open alerts so the bell can show them without navigating away.
export async function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  const now = currentTime();
  const open = loadAlerts(now)
    .filter((a) => a.status !== "resolved")
    .sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] || b.createdAt - a.createdAt);

  return (
    <header className="sticky top-0 z-30 flex min-h-16 items-center gap-3 border-b bg-card/95 px-4 py-3 backdrop-blur md:px-8">
      <MobileNav />
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-lg font-semibold tracking-tight md:text-2xl">{title}</h1>
        {subtitle && <p className="truncate text-xs text-muted-foreground md:text-sm">{subtitle}</p>}
      </div>
      {actions}
      <ActiveUsers serverNow={now} />
      <NotificationBell alerts={open} serverNow={now} />
    </header>
  );
}
