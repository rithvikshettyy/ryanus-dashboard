"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell, ChevronDown, Fuel, IdCard, Languages, LayoutDashboard, LifeBuoy, ListTree, Package, PanelLeftClose, PanelLeftOpen,
  Route, Settings, Truck, Wrench, Activity, type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { applyStatuses, useAlertStatuses } from "@/hooks/use-alert-statuses";
import { loadAlerts } from "@/lib/alerts";
import { useLang, useT } from "@/components/i18n-provider";
import { LanguageSwitcher, useSetLang } from "./language-switcher";

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

/**
 * `collapsed` + `onToggle` are only passed by the desktop sidebar: collapsed shows an icon rail
 * (labels move into title/aria-label so it stays accessible). The mobile drawer never collapses.
 */
export function SidebarContent({
  onNavigate,
  collapsed = false,
  onToggle,
}: {
  onNavigate?: () => void;
  collapsed?: boolean;
  onToggle?: () => void;
}) {
  const t = useT();
  const lang = useLang();
  const { set: setLang, pending: langPending } = useSetLang();
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
        aria-label={collapsed ? t(label) : undefined}
        title={collapsed ? t(label) : undefined}
        className={cn(
          "relative flex items-center gap-3 rounded-lg text-sm font-medium transition-colors",
          collapsed
            ? "mx-auto size-11 shrink-0 justify-center rounded-xl p-0" // square icon button, centred in the rail
            : nested ? "h-10 px-2.5 text-[13px]" : "h-11 px-3 md:h-10",
          active ? "bg-primary-soft text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        <Icon className={nested ? "size-4" : "size-[18px]"} aria-hidden />
        {!collapsed && <span className="min-w-0 flex-1 truncate">{t(label)}</span>}
        {badge && openCritical > 0 && (
          <span className={cn("num flex h-5 min-w-5 items-center justify-center rounded-md bg-bad px-1.5 text-xs font-semibold text-white", collapsed && "absolute -right-1 -top-1 h-[18px] min-w-[18px] px-1 ring-2 ring-card")}>
            {openCritical}
          </span>
        )}
      </Link>
    );
  };

  const toggleBtn = onToggle && (
    <button
      type="button"
      onClick={onToggle}
      aria-label={collapsed ? t("Expand sidebar") : t("Collapse sidebar")}
      aria-expanded={!collapsed}
      title={collapsed ? t("Expand sidebar") : t("Collapse sidebar")}
      className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring", collapsed && "size-11 rounded-xl")}
    >
      {collapsed ? <PanelLeftOpen className="size-[18px]" aria-hidden /> : <PanelLeftClose className="size-[18px]" aria-hidden />}
    </button>
  );

  return (
    <div className={cn("flex h-full flex-col pb-2", collapsed ? "gap-4 px-3 py-4" : "gap-3 p-4")}>
      <div className={cn("flex pt-1", collapsed ? "flex-col items-center gap-3" : "items-center gap-2.5 px-1")}>
        {!collapsed && (
          <div className="min-w-0 flex-1 leading-tight">
            <p className="whitespace-nowrap text-sm font-semibold">{t("GEOVIA Fleetsched")}</p>
            <p className="text-xs text-muted-foreground">{t("Operations console")}</p>
          </div>
        )}
        {toggleBtn}
      </div>

      <div className={cn("flex items-center", collapsed ? "justify-center" : "gap-2.5 rounded-xl border bg-card p-2.5 shadow-xs")}>
        <div
          className={cn("flex shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary", collapsed ? "size-11" : "size-9")}
          title={collapsed ? t("Faridabad Site") : undefined}
        >
          JB
        </div>
        {!collapsed && (
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-medium">{t("Faridabad Site")}</p>
            <p className="truncate text-xs text-muted-foreground">{t("Faridabad, Haryana")}</p>
          </div>
        )}
      </div>

      {/* Scrolls on its own when the menu is taller than the screen (phones, small laptops) */}
      <nav aria-label={t("Main")} className={cn("-mx-1 flex min-h-0 flex-1 flex-col overflow-y-auto px-1", collapsed ? "gap-2 border-t pt-4" : "gap-1")}>
        {MAIN.map((i) => link(i))}

        <button
          type="button"
          // Collapsed: there is no room for the sub-menu, so the icon re-opens the sidebar instead.
          onClick={() => (collapsed ? onToggle?.() : setToggled(!fleetOpen))}
          aria-expanded={collapsed ? false : fleetOpen}
          aria-controls="fleet-menu"
          aria-label={collapsed ? t("Fleet management") : undefined}
          title={collapsed ? t("Fleet management") : undefined}
          className={cn(
            "flex items-center gap-3 rounded-lg text-sm font-medium transition-colors hover:bg-muted",
            collapsed ? "mx-auto size-11 shrink-0 justify-center rounded-xl p-0" : "h-11 px-3 md:h-10",
            fleetActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <ListTree className="size-[18px]" aria-hidden />
          {!collapsed && <span className="flex-1 text-left">{t("Fleet management")}</span>}
          {!collapsed && <ChevronDown className={cn("size-4 transition-transform", fleetOpen && "rotate-180")} aria-hidden />}
        </button>
        {fleetOpen && !collapsed && (
          <div id="fleet-menu" className="ml-[21px] flex flex-col border-l pl-1.5">
            {FLEET.map((i) => link(i, true))}
          </div>
        )}

        {link(HELP)}
      </nav>

      {/* Pinned to the bottom: stays visible while the menu above scrolls */}
      <div className={cn("border-t", collapsed ? "flex flex-col gap-2 pt-4" : "space-y-2 pt-2")}>
        {collapsed ? (
          <button
            type="button"
            disabled={langPending}
            onClick={() => setLang(lang === "en" ? "hi" : "en")}
            aria-label={t("Switch language")}
            title={t("Switch language")}
            className="mx-auto flex size-11 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-70"
          >
            <Languages className="size-[18px]" aria-hidden />
          </button>
        ) : (
          <LanguageSwitcher />
        )}
        {link(SETTINGS)}
      </div>
    </div>
  );
}
