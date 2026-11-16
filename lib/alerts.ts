import {
  CircleDot, Container, Flame, Fuel, Gauge, MapPinOff, OctagonAlert, Info, Shovel, Thermometer,
  Timer, TriangleAlert, Tractor, Truck, WifiOff, Weight,
  type LucideIcon,
} from "lucide-react";
import alertsJson from "@/data/alerts.json";
import { makeT, type TFn } from "./i18n";
import type { Alert, AlertType, EquipmentType, RawAlert, Severity } from "./types";

const RAW = alertsJson as RawAlert[];

/** Server side: turn "minutesAgo" into real timestamps so the demo never looks stale. */
export function loadAlerts(now: number): Alert[] {
  return RAW.map(({ minutesAgo, ...rest }) => ({ ...rest, createdAt: now - minutesAgo * 60_000 }));
}

/** Wrapped so server pages can read the clock after opting into dynamic rendering. */
export const currentTime = () => Date.now();

export const SEVERITY_RANK: Record<Severity, number> = { critical: 0, warning: 1, info: 2 };

export const SEVERITY_CONFIG: Record<
  Severity,
  { label: string; icon: LucideIcon; text: string; bg: string; stripe: string; bar: string }
> = {
  critical: { label: "Critical", icon: OctagonAlert, text: "text-bad", bg: "bg-bad-bg", stripe: "bg-bad", bar: "bg-bad" },
  warning: { label: "Warning", icon: TriangleAlert, text: "text-warn", bg: "bg-warn-bg", stripe: "bg-[#c97a2b]", bar: "bg-[#c97a2b]" },
  info: { label: "Info", icon: Info, text: "text-info", bg: "bg-info-bg", stripe: "bg-info", bar: "bg-info" },
};

export const ALERT_TYPE_CONFIG: Record<AlertType, { label: string; icon: LucideIcon; limitWord: string }> = {
  overspeed: { label: "Overspeed", icon: Gauge, limitWord: "Limit" },
  underload: { label: "Underload", icon: Weight, limitWord: "Expected" },
  "coolant-temp": { label: "Coolant temp", icon: Thermometer, limitWord: "Max" },
  "engine-temp": { label: "Engine temp", icon: Flame, limitWord: "Max" },
  "low-fuel": { label: "Low fuel", icon: Fuel, limitWord: "Minimum" },
  offline: { label: "Offline", icon: WifiOff, limitWord: "Allowed" },
  "tyre-pressure": { label: "Tyre pressure", icon: CircleDot, limitWord: "Minimum" },
  geofence: { label: "Geofence", icon: MapPinOff, limitWord: "Boundary" },
  "excess-idle": { label: "Excess idle", icon: Timer, limitWord: "Allowed" },
};

export const EQUIPMENT_CONFIG: Record<EquipmentType, { label: string; icon: LucideIcon }> = {
  truck: { label: "Truck", icon: Truck },
  dumper: { label: "Dumper", icon: Container },
  excavator: { label: "Excavator", icon: Shovel },
  dozer: { label: "Dozer", icon: Tractor },
};

/** How far past the threshold, as a ratio (0.5 = 50%). null when the threshold is 0 (e.g. geofence). */
export function breachRatio(a: Alert): number | null {
  const { actual, threshold, breach } = a.metric;
  if (threshold === 0) return null;
  return breach === "above" ? actual / threshold - 1 : 1 - actual / threshold;
}

export function breachLabel(a: Alert, t: TFn = makeT("en")): string {
  const r = breachRatio(a);
  if (r === null) return t("Outside zone");
  const pct = Math.round(r * 100);
  if (a.type === "underload") return t("{pct}% under expected", { pct });
  return a.metric.breach === "above" ? t("+{pct}% over limit", { pct }) : t("{pct}% below minimum", { pct });
}
