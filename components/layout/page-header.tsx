import Link from "next/link";
import { Bell } from "lucide-react";
import { MobileNav } from "./mobile-nav";

const CREW = ["RK", "SP", "AS"];

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <header className="sticky top-0 z-30 flex min-h-16 items-center gap-3 border-b bg-card/95 px-4 py-3 backdrop-blur md:px-8">
      <MobileNav />
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-lg font-semibold tracking-tight md:text-2xl">{title}</h1>
        {subtitle && <p className="truncate text-xs text-muted-foreground md:text-sm">{subtitle}</p>}
      </div>
      {actions}
      <div className="hidden items-center sm:flex" aria-label="Operators on shift">
        {CREW.map((c, i) => (
          <span
            key={c}
            className="flex size-8 items-center justify-center rounded-full border-2 border-card bg-primary-soft text-[11px] font-semibold text-primary"
            style={{ marginLeft: i ? -8 : 0 }}
          >
            {c}
          </span>
        ))}
        <span className="num ml-1.5 text-xs text-muted-foreground">+30</span>
      </div>
      <Link
        href="/alerts"
        aria-label="Open alerts"
        className="relative flex size-10 items-center justify-center rounded-lg border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <Bell className="size-[18px]" />
        <span className="absolute right-2.5 top-2.5 size-2 rounded-full bg-bad ring-2 ring-card" />
      </Link>
    </header>
  );
}
