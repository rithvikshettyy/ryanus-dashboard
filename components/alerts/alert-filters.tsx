"use client";

import { ChevronDown, Search, X } from "lucide-react";
import { useT } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { Segmented } from "@/components/ui/segmented";
import { ALERT_TYPE_CONFIG, EQUIPMENT_CONFIG, SEVERITY_CONFIG } from "@/lib/alerts";
import { hasActiveFilters, type AlertFilters, type StatusFilter, type TimeFilter } from "@/lib/alert-filters";
import type { AlertType, EquipmentType, Severity } from "@/lib/types";
import { cn } from "@/lib/utils";

const SELECT =
  "h-10 w-full appearance-none rounded-lg border border-input bg-card pl-3 pr-9 text-sm transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring";

export function AlertFiltersBar({
  filters,
  onChange,
  onClear,
  counts,
}: {
  filters: AlertFilters;
  onChange: (patch: Partial<AlertFilters>) => void;
  onClear: () => void;
  counts: Record<StatusFilter, number>;
}) {
  const tr = useT();
  function toggleSeverity(s: Severity) {
    const has = filters.severity.includes(s);
    onChange({ severity: has ? filters.severity.filter((x) => x !== s) : [...filters.severity, s] });
  }

  return (
    <Panel aria-label={tr("Alert filters")} className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(220px,1.3fr)_auto_1fr_1fr]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" aria-hidden />
          <input
            type="search"
            value={filters.search}
            onChange={(e) => onChange({ search: e.target.value })}
            placeholder={tr("Search equipment, alert, location")}
            aria-label={tr("Search alerts")}
            className="h-10 w-full rounded-lg border border-input bg-card pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground hover:bg-muted/50 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
          />
        </div>

        <div role="group" aria-label={tr("Severity")} className="flex flex-wrap gap-2">
          {(Object.keys(SEVERITY_CONFIG) as Severity[]).map((s) => {
            const cfg = SEVERITY_CONFIG[s];
            const on = filters.severity.includes(s);
            return (
              <button
                key={s}
                type="button"
                aria-pressed={on}
                onClick={() => toggleSeverity(s)}
                className={cn(
                  "flex h-10 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors",
                  on ? "border-foreground bg-foreground text-background" : "bg-card hover:bg-muted",
                )}
              >
                <cfg.icon className={cn("size-4", !on && cfg.text)} aria-hidden />
                {tr(cfg.label)}
              </button>
            );
          })}
        </div>

        <div className="relative">
          <select
            aria-label={tr("Alert type")}
            value={filters.type}
            onChange={(e) => onChange({ type: e.target.value as AlertType | "all" })}
            className={SELECT}
          >
            <option value="all">{tr("All alert types")}</option>
            {(Object.keys(ALERT_TYPE_CONFIG) as AlertType[]).map((t) => (
              <option key={t} value={t}>{tr(ALERT_TYPE_CONFIG[t].label)}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-3 size-4 text-muted-foreground" aria-hidden />
        </div>

        <div className="relative">
          <select
            aria-label={tr("Equipment type")}
            value={filters.equipment}
            onChange={(e) => onChange({ equipment: e.target.value as EquipmentType | "all" })}
            className={SELECT}
          >
            <option value="all">{tr("All equipment")}</option>
            {(Object.keys(EQUIPMENT_CONFIG) as EquipmentType[]).map((t) => (
              <option key={t} value={t}>{tr(EQUIPMENT_CONFIG[t].label)}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-3 size-4 text-muted-foreground" aria-hidden />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
        <Segmented
          wrap
          label="Status"
          value={filters.status}
          onChange={(status) => onChange({ status })}
          options={[
            { value: "open", label: "Open", count: counts.open },
            { value: "unacknowledged", label: "Unacknowledged", count: counts.unacknowledged },
            { value: "acknowledged", label: "Acknowledged", count: counts.acknowledged },
            { value: "resolved", label: "Resolved", count: counts.resolved },
            { value: "all", label: "All", count: counts.all },
          ]}
        />
        <div className="flex items-center gap-2">
          <Segmented<TimeFilter>
            label="Time range"
            value={filters.time}
            onChange={(time) => onChange({ time })}
            options={[
              { value: "1h", label: "1h" },
              { value: "6h", label: "6h" },
              { value: "24h", label: "24h" },
              { value: "all", label: "All time" },
            ]}
          />
          {hasActiveFilters(filters) && (
            <Button variant="ghost" className="h-10 gap-1.5" onClick={onClear}>
              <X /> {tr("Clear")}
            </Button>
          )}
        </div>
      </div>
    </Panel>
  );
}
