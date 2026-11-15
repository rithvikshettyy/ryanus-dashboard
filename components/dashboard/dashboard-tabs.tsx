import Link from "next/link";
import { BarChart3, Navigation } from "lucide-react";
import { getT } from "@/lib/i18n/server";
import { cn } from "@/lib/utils";

export type DashboardTab = "fleet" | "tracking";

/** Tab state lives in the URL (?tab=tracking), so a tab is linkable and survives refresh. */
export async function DashboardTabs({ active, fleetQuery }: { active: DashboardTab; fleetQuery: string }) {
  const t = await getT();
  const tabs = [
    { id: "fleet" as const, label: "Analytics", icon: BarChart3, href: fleetQuery ? `/dashboard?${fleetQuery}` : "/dashboard" },
    { id: "tracking" as const, label: "Live tracking", icon: Navigation, href: "/dashboard?tab=tracking" },
  ];
  return (
    <nav aria-label={t("Dashboard sections")} className="flex w-full gap-1 rounded-xl bg-muted p-1 sm:inline-flex sm:w-auto">
      {tabs.map((tab) => (
        <Link
          key={tab.id}
          href={tab.href}
          scroll={false}
          aria-current={active === tab.id ? "page" : undefined}
          className={cn(
            "flex h-10 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-2 text-[13px] font-medium transition-all sm:flex-none sm:gap-2 sm:px-4 sm:text-sm",
            active === tab.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <tab.icon className="hidden size-4 min-[400px]:block" aria-hidden />
          {t(tab.label)}
        </Link>
      ))}
    </nav>
  );
}
