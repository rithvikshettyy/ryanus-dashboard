import vehiclesJson from "@/data/vehicles.json";
import {
  ALL_CLASSES, DATA_END, DATA_START, DEFAULT_CLASSES, DEFAULT_FROM, DEFAULT_TO,
} from "./constants";
import type { Vehicle, VehicleClass } from "./types";

export const VEHICLES = vehiclesJson as Vehicle[];

export interface DashboardFilters {
  from: string; // ISO date
  to: string;
  classes: VehicleClass[];
  vehicle: string | null;
}

export const DEFAULT_FILTERS: DashboardFilters = {
  from: DEFAULT_FROM,
  to: DEFAULT_TO,
  classes: DEFAULT_CLASSES,
  vehicle: null,
};

type SearchParams = Record<string, string | string[] | undefined>;

// Type guard: narrows `string` to `VehicleClass` after the check
const isClass = (v: string): v is VehicleClass => (ALL_CLASSES as string[]).includes(v);
const isIsoDate = (v: string | undefined): v is string =>
  !!v && /^\d{4}-\d{2}-\d{2}$/.test(v) && v >= DATA_START && v <= DATA_END;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** Anything in the URL is untrusted: validate every field and fall back to defaults. */
export function parseFilters(sp: SearchParams): DashboardFilters {
  let from = first(sp.from);
  let to = first(sp.to);
  if (!isIsoDate(from)) from = DEFAULT_FROM;
  if (!isIsoDate(to)) to = DEFAULT_TO;
  if (from > to) [from, to] = [to, from];

  const rawClasses = (first(sp.classes) ?? "").split(",").filter(isClass);
  const classes = rawClasses.length ? Array.from(new Set(rawClasses)) : DEFAULT_CLASSES;

  const v = first(sp.vehicle);
  const vehicle = v && VEHICLES.some((x) => x.id === v && classes.includes(x.vehicleClass)) ? v : null;

  return { from, to, classes, vehicle };
}

/** Only writes values that differ from the defaults, so the default URL stays clean. */
export function filtersToQuery(f: DashboardFilters): string {
  const p = new URLSearchParams();
  if (f.from !== DEFAULT_FROM) p.set("from", f.from);
  if (f.to !== DEFAULT_TO) p.set("to", f.to);
  const sameClasses =
    f.classes.length === DEFAULT_CLASSES.length && DEFAULT_CLASSES.every((c) => f.classes.includes(c));
  if (!sameClasses) p.set("classes", f.classes.join(","));
  if (f.vehicle) p.set("vehicle", f.vehicle);
  return p.toString();
}
