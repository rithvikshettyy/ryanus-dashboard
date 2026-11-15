import { SEVERITY_RANK } from "./alerts";
import type { Alert, AlertType, EquipmentType, Severity } from "./types";

export type StatusFilter = "open" | "unacknowledged" | "acknowledged" | "resolved" | "all";
export type TimeFilter = "1h" | "6h" | "24h" | "all";

export interface AlertFilters {
  search: string;
  severity: Severity[]; // empty = all
  type: AlertType | "all";
  equipment: EquipmentType | "all";
  status: StatusFilter;
  time: TimeFilter;
}

export const DEFAULT_ALERT_FILTERS: AlertFilters = {
  search: "",
  severity: [],
  type: "all",
  equipment: "all",
  status: "open",
  time: "all",
};

const TIME_MS: Record<TimeFilter, number> = { "1h": 3_600_000, "6h": 21_600_000, "24h": 86_400_000, all: Infinity };

export function matchesStatus(a: Alert, s: StatusFilter): boolean {
  switch (s) {
    case "open": return a.status !== "resolved";
    case "unacknowledged": return a.status === "active";
    case "acknowledged": return a.status === "acknowledged";
    case "resolved": return a.status === "resolved";
    default: return true;
  }
}

export function filterAlerts(alerts: Alert[], f: AlertFilters, search: string, now: number): Alert[] {
  const q = search.trim().toLowerCase();
  return alerts.filter(
    (a) =>
      matchesStatus(a, f.status) &&
      (f.severity.length === 0 || f.severity.includes(a.severity)) &&
      (f.type === "all" || a.type === f.type) &&
      (f.equipment === "all" || a.equipmentType === f.equipment) &&
      now - a.createdAt <= TIME_MS[f.time] &&
      (q === "" || `${a.equipmentName} ${a.title} ${a.location} ${a.operator ?? ""}`.toLowerCase().includes(q)),
  );
}

/** Comparator: most severe first, then newest first. Copy before sort so state is never mutated. */
export function sortAlerts(alerts: Alert[]): Alert[] {
  return [...alerts].sort(
    (a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] || b.createdAt - a.createdAt,
  );
}

export function hasActiveFilters(f: AlertFilters): boolean {
  return (
    f.search !== "" || f.severity.length > 0 || f.type !== "all" || f.equipment !== "all" ||
    f.status !== DEFAULT_ALERT_FILTERS.status || f.time !== "all"
  );
}
