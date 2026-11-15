"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell, ChevronDown, Fuel, IdCard, LayoutDashboard, LifeBuoy, ListTree, Package, Pickaxe, Route,
  Settings, Truck, Wrench, Activity, type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { applyStatuses, useAlertStatuses } from "@/hooks/use-alert-statuses";
import { loadAlerts } from "@/lib/alerts";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: boolean;
}

const MAIN: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/alerts", label: "Alerts", icon: Bell, badge: true },
  { href: "/shipments", label: "Shipments & deliveries", icon: Package },
];

const FLEET: NavItem[] = [
  { href: "/fleet/vehicles", label: "All vehicles", icon: Truck },
  { href: "/fleet/active-trucks", label: "Active trucks", icon: Activity },
  { href: "/fleet/maintenance", label: "Maintenance & repairs", icon: Wrench },
  { href: "/fleet/fuel-telematics", label: "Fuel & telematics", icon: Fuel },
  { href: "/fleet/drivers", label: "Driver directory", icon: IdCard },
  { href: "/fleet/route-planning", label: "Route planning", icon: Route },
];

const HELP: NavItem = { href: "/help", label: "Help & support", icon: LifeBuoy };
const SETTINGS: NavItem = { href: "/settings", label: "Settings", icon: Settings };

// Seed alerts for the badge; the user's acknowledge/resolve choices are applied on top inside the component
const SEED_CRITICAL = loadAlerts(0).filter((a) => a.severity === "critical");

const isActive = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-2 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{children}</p>
  );
}

export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname(); // client hook: reads the current URL to highlight the active link
  // Badge = critical alerts nobody has acknowledged or resolved yet
  const { overrides } = useAlertStatuses();
  const openCritical = applyStatuses(SEED_CRITICAL, overrides).filter((a) => a.status === "active").length;
  const fleetActive = FLEET.some((i) => isActive(pathname, i.href));
  // null = user has not touched it: follow the route (open on fleet pages, closed elsewhere)
  const [toggled, setToggled] = useState<boolean | null>(null);
  const fleetOpen = toggled ?? fleetActive;

  const link = ({ href, label, icon: Icon, badge }: NavItem, nested = false) => {
    const active = isActive(pathname, href);
    return (
      <Link
        key={href}
        href={href}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex items-center gap-3 rounded-lg text-sm font-medium transition-colors",
          nested ? "h-9 px-2.5 text-[13px]" : "h-11 px-3 md:h-10",
          active ? "bg-primary-soft text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        <Icon className={nested ? "size-4" : "size-[18px]"} aria-hidden />
        <span className="min-w-0 flex-1 truncate">{label}</span>
        {badge && openCritical > 0 && (
          <span className="num flex h-5 min-w-5 items-center justify-center rounded-md bg-bad px-1.5 text-[11px] font-semibold text-white">
            {openCritical}
          </span>
        )}
      </Link>
    );
  };

  return (
    <div className="flex h-full flex-col gap-3 p-4 pb-2">
      <div className="flex items-center gap-2.5 px-1 pt-1">
        <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Pickaxe className="size-5" aria-hidden />
        </div>
        <div className="leading-tight">
          <p className="text-[15px] font-semibold">Ryanus Mining</p>
          <p className="text-xs text-muted-foreground">Operations console</p>
        </div>
      </div>

      <div className="flex items-center gap-2.5 rounded-xl border bg-card p-2.5 shadow-xs">
        <div className="flex size-9 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary">
          JB
        </div>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-sm font-medium">Faridabad Site</p>
          <p className="truncate text-xs text-muted-foreground">Faridabad, Haryana</p>
        </div>
      </div>

      {/* Scrolls on its own when the menu is taller than the screen (phones, small laptops) */}
      <nav aria-label="Main" className="-mx-1 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-1">
        <SectionLabel>Main menu</SectionLabel>
        {MAIN.map((i) => link(i))}

        <button
          type="button"
          onClick={() => setToggled(!fleetOpen)}
          aria-expanded={fleetOpen}
          aria-controls="fleet-menu"
          className={cn(
            "flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors hover:bg-muted md:h-10",
            fleetActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <ListTree className="size-[18px]" aria-hidden />
          <span className="flex-1 text-left">Fleet management</span>
          <ChevronDown className={cn("size-4 transition-transform", fleetOpen && "rotate-180")} aria-hidden />
        </button>
        {fleetOpen && (
          <div id="fleet-menu" className="ml-[21px] flex flex-col border-l pl-1.5">
            {FLEET.map((i) => link(i, true))}
          </div>
        )}

        {link(HELP)}

      </nav>

      {/* Pinned to the bottom: stays visible while the menu above scrolls */}
      <div className="border-t pt-2">{link(SETTINGS)}</div>
    </div>
  );
}
