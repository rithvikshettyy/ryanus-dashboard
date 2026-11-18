import vehiclesJson from "@/data/vehicles.json";
import { ALL_CLASSES, DEFAULT_CLASSES } from "./constants";
import { dataEnd, dataStart, todayIso } from "./today";
import type { Vehicle, VehicleClass } from "./types";

export const VEHICLES = vehiclesJson as Vehicle[];

export interface DashboardFilters {
  from: string; // ISO date
  to: string;
  classes: VehicleClass[];
  vehicle: string | null;
}

/** Defaults: today's date, one class, all vehicles. A function (not a constant) because "today" changes. */
export function defaultFilters(): DashboardFilters {
  const today = todayIso();
  return { from: today, to: today, classes: DEFAULT_CLASSES, vehicle: null };
}

type SearchParams = Record<string, string | string[] | undefined>;

// Type guard: narrows `string` to `VehicleClass` after the check
const isClass = (v: string): v is VehicleClass => (ALL_CLASSES as string[]).includes(v);
const isIsoDate = (v: string | undefined): v is string =>
  !!v && /^\d{4}-\d{2}-\d{2}$/.test(v) && v >= dataStart() && v <= dataEnd();
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** Anything in the URL is untrusted: validate every field and fall back to defaults. */
export function parseFilters(sp: SearchParams): DashboardFilters {
  const d = defaultFilters();
  let from = first(sp.from);
  let to = first(sp.to);
  if (!isIsoDate(from)) from = isIsoDate(to) ? to : d.from;
  if (!isIsoDate(to)) to = from;
  if (from > to) [from, to] = [to, from];

  const rawClasses = (first(sp.classes) ?? "").split(",").filter(isClass);
  const classes = rawClasses.length ? Array.from(new Set(rawClasses)) : d.classes;

  const v = first(sp.vehicle);
  const vehicle = v && VEHICLES.some((x) => x.id === v && classes.includes(x.vehicleClass)) ? v : null;

  return { from, to, classes, vehicle };
}

/** Only writes values that differ from the defaults, so the default URL stays clean. */
export function filtersToQuery(f: DashboardFilters): string {
  const d = defaultFilters();
  const p = new URLSearchParams();
  if (f.from !== d.from) p.set("from", f.from);
  if (f.to !== d.to) p.set("to", f.to);
  const sameClasses = f.classes.length === d.classes.length && d.classes.every((c) => f.classes.includes(c));
  if (!sameClasses) p.set("classes", f.classes.join(","));
  if (f.vehicle) p.set("vehicle", f.vehicle);
  return p.toString();
}
