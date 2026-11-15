import type { ShiftId, VehicleClass } from "./types";

// Record<K, V> = object that MUST have every key K. Add a class and TS tells you where you forgot it.
export const CLASS_CONFIG: Record<
  VehicleClass,
  { label: string; prefix: string; count: number; capacityT: number; color: string }
> = {
  "coal-dumper": { label: "Coal Dumper", prefix: "CD", count: 8, capacityT: 35, color: "var(--chart-1)" },
  "ob-dumper": { label: "OB Dumper", prefix: "OB", count: 10, capacityT: 60, color: "var(--chart-2)" },
  "heavy-dumper": { label: "Heavy Dumper", prefix: "HD", count: 4, capacityT: 100, color: "var(--chart-3)" },
  tipper: { label: "Coal Tipper", prefix: "CT", count: 6, capacityT: 25, color: "var(--chart-4)" },
  adt: { label: "ADT", prefix: "AD", count: 5, capacityT: 40, color: "var(--chart-5)" },
};

export const ALL_CLASSES = Object.keys(CLASS_CONFIG) as VehicleClass[];

export const SHIFTS: Record<ShiftId, { label: string; hours: string }> = {
  A: { label: "Shift A", hours: "06:00 to 14:00" },
  B: { label: "Shift B", hours: "14:00 to 22:00" },
  C: { label: "Shift C", hours: "22:00 to 06:00" },
};

export const DATA_START = "2026-11-08";
export const DATA_END = "2026-11-14";
export const DEFAULT_FROM = "2026-11-13";
export const DEFAULT_TO = "2026-11-14";
export const DEFAULT_CLASSES: VehicleClass[] = ["coal-dumper", "ob-dumper"];
export const DIESEL_PRICE_PER_L = 92; // INR, assumption (goes in README)
