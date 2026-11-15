"use client";

import { Activity, CheckCircle2, OctagonAlert, TriangleAlert, type LucideIcon } from "lucide-react";
import { useT } from "@/components/i18n-provider";
import type { Alert } from "@/lib/types";
import type { AlertFilters } from "@/lib/alert-filters";
import { cn } from "@/lib/utils";

export type QuickFilter = "active" | "critical" | "warning" | "resolved";

export function StatCards({
  alerts,
  filters,
  onSelect,
}: {
  alerts: Alert[];
  filters: AlertFilters;
  onSelect: (k: QuickFilter) => void;
}) {
  const t = useT();
  // Derived state: counts are computed from the alerts every render, never stored separately.
  const open = alerts.filter((a) => a.status !== "resolved");
  const cards: { key: QuickFilter; label: string; value: number; icon: LucideIcon; tone: string; on: boolean }[] = [
    { key: "active", label: "Total active", value: open.length, icon: Activity, tone: "bg-primary-soft text-primary", on: filters.status === "open" && filters.severity.length === 0 },
    { key: "critical", label: "Critical", value: open.filter((a) => a.severity === "critical").length, icon: OctagonAlert, tone: "bg-bad-bg text-bad", on: filters.severity.length === 1 && filters.severity[0] === "critical" },
    { key: "warning", label: "Warnings", value: open.filter((a) => a.severity === "warning").length, icon: TriangleAlert, tone: "bg-warn-bg text-warn", on: filters.severity.length === 1 && filters.severity[0] === "warning" },
    { key: "resolved", label: "Resolved", value: alerts.filter((a) => a.status === "resolved").length, icon: CheckCircle2, tone: "bg-good-bg text-good", on: filters.status === "resolved" },
  ];

  return (
    <section aria-label={t("Alert overview")} className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
      {cards.map((c) => (
        <button
          key={c.key}
          type="button"
          onClick={() => onSelect(c.key)}
          aria-pressed={c.on}
          className={cn(
            "flex min-h-24 items-center justify-between gap-3 rounded-2xl border bg-card p-4 text-left shadow-xs transition-shadow hover:shadow-md md:p-5",
            c.on && "border-primary ring-2 ring-primary/20",
          )}
        >
          <div>
            <p className="text-sm text-muted-foreground">{t(c.label)}</p>
            <p className="num mt-1 text-3xl font-semibold tracking-tight">{c.value}</p>
          </div>
          <span className={cn("flex size-10 items-center justify-center rounded-xl", c.tone)}>
            <c.icon className="size-5" aria-hidden />
          </span>
        </button>
      ))}
    </section>
  );
}
