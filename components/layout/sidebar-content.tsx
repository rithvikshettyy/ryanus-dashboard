"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, LayoutDashboard, Pickaxe, Radio } from "lucide-react";
import { cn } from "@/lib/utils";
import { loadAlerts } from "@/lib/alerts";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/alerts", label: "Alerts", icon: Bell, badge: true },
];

// Count of open critical alerts (static snapshot for the badge)
const OPEN_CRITICAL = loadAlerts(0).filter((a) => a.status !== "resolved" && a.severity === "critical").length;

export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname(); // client hook: reads the current URL to highlight the active link

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5 px-1 pt-1">
        <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Pickaxe className="size-5" aria-hidden />
        </div>
        <div className="leading-tight">
          <p className="text-[15px] font-semibold">MineOps</p>
          <p className="text-xs text-muted-foreground">Operations console</p>
        </div>
      </div>

      <div className="flex items-center gap-2.5 rounded-xl border bg-card p-2.5 shadow-xs">
        <div className="flex size-9 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary">
          JB
        </div>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-sm font-medium">Jharia Block 4</p>
          <p className="truncate text-xs text-muted-foreground">Open-cast coal mine</p>
        </div>
      </div>

      <nav aria-label="Main" className="flex flex-col gap-1">
        <p className="px-2 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Main menu
        </p>
        {NAV.map(({ href, label, icon: Icon, badge }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
                active ? "bg-primary-soft text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="size-[18px]" aria-hidden />
              <span className="flex-1">{label}</span>
              {badge && OPEN_CRITICAL > 0 && (
                <span className="num flex h-5 min-w-5 items-center justify-center rounded-md bg-bad px-1.5 text-[11px] font-semibold text-white">
                  {OPEN_CRITICAL}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto rounded-xl border bg-card p-3.5 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="relative flex size-2.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-productive opacity-60" />
            <span className="relative inline-flex size-2.5 rounded-full bg-productive" />
          </span>
          <p className="text-sm font-medium">Shift B in progress</p>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">14:00 to 22:00 · 33 vehicles on site</p>
        <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Radio className="size-3.5" aria-hidden /> Telemetry live
        </p>
      </div>
    </div>
  );
}
