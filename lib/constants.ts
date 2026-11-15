import type { ShiftId, VehicleClass } from "./types";

// Record<K, V> = object that MUST have every key K. Add a class and TS tells you where you forgot it.
export const CLASS_CONFIG: Record<
  VehicleClass,
  { label: string; count: number; capacityT: number; color: string }
> = {
  "coal-dumper": { label: "Coal Dumper", count: 8, capacityT: 35, color: "var(--chart-1)" },
  "ob-dumper": { label: "OB Dumper", count: 10, capacityT: 60, color: "var(--chart-2)" },
  "heavy-dumper": { label: "Heavy Dumper", count: 4, capacityT: 100, color: "var(--chart-3)" },
  tipper: { label: "Coal Tipper", count: 6, capacityT: 25, color: "var(--chart-4)" },
  adt: { label: "ADT", count: 5, capacityT: 40, color: "var(--chart-5)" },
};

// Photos in /public (transparent PNGs). Classes without a photo fall back to an icon.
export const CLASS_IMAGE: Partial<Record<VehicleClass, string>> = {
  "coal-dumper": "/coal_dumper.png",
  "ob-dumper": "/ob_truck.png",
};

export const ALL_CLASSES = Object.keys(CLASS_CONFIG) as VehicleClass[];

export const SHIFTS: Record<ShiftId, { label: string; hours: string }> = {
  A: { label: "Shift A", hours: "06:00 to 14:00" },
  B: { label: "Shift B", hours: "14:00 to 22:00" },
  C: { label: "Shift C", hours: "22:00 to 06:00" },
};

export const DATA_START = "2026-11-01";
export const DATA_END = "2026-11-17";
// First load: today only, one class. The user picks more classes / a wider period to compare.
export const DEFAULT_CLASSES: VehicleClass[] = ["coal-dumper"];
export const DIESEL_PRICE_PER_L = 92; // INR, assumption (goes in README)
