import { CLASS_CONFIG } from "./constants";
import type { VehicleClass } from "./types";

/* ------------------------------------------------------------------ *
 * Mock site geometry. The map is a 1000 x 600 coordinate space.
 * 1 map unit = 8 m, so 1000 units = 8 km.
 * ------------------------------------------------------------------ */
export const MAP_W = 1000;
export const MAP_H = 600;
const METRES_PER_UNIT = 8;

export type SiteId = "pit-north" | "pit-south" | "ob-bench" | "weighbridge" | "stockyard" | "dump" | "siding";

export const SITES: Record<SiteId, { label: string; x: number; y: number }> = {
  "pit-north": { label: "Pit North · LP1", x: 140, y: 150 },
  "pit-south": { label: "Pit South · LP2", x: 170, y: 450 },
  "ob-bench": { label: "OB Bench 3", x: 300, y: 300 },
  weighbridge: { label: "Weighbridge", x: 560, y: 290 },
  stockyard: { label: "Coal Stockyard", x: 860, y: 150 },
  dump: { label: "Waste Dump 1", x: 800, y: 480 },
  siding: { label: "Rail Siding", x: 900, y: 340 },
};

type Pt = [number, number];
export type Material = "Coal" | "Overburden";

export interface Route {
  id: string;
  material: Material;
  from: SiteId;
  to: SiteId;
  points: Pt[];
  cum: number[]; // cumulative length (map units) at each point
  lengthUnits: number;
  km: number;
}

function buildRoute(id: string, material: Material, from: SiteId, to: SiteId, mid: Pt[]): Route {
  const a = SITES[from];
  const b = SITES[to];
  const points: Pt[] = [[a.x, a.y], ...mid, [b.x, b.y]];
  const cum = [0];
  for (let i = 1; i < points.length; i++) {
    cum.push(cum[i - 1] + Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]));
  }
  const lengthUnits = cum[cum.length - 1];
  return { id, material, from, to, points, cum, lengthUnits, km: (lengthUnits * METRES_PER_UNIT) / 1000 };
}

export const ROUTES: Record<string, Route> = {
  R1: buildRoute("R1", "Coal", "pit-north", "stockyard", [[300, 170], [420, 260], [560, 290], [700, 230]]),
  R2: buildRoute("R2", "Coal", "pit-south", "stockyard", [[330, 420], [450, 330], [560, 290], [700, 230]]),
  R3: buildRoute("R3", "Overburden", "ob-bench", "dump", [[450, 380], [620, 440]]),
  R4: buildRoute("R4", "Overburden", "pit-south", "dump", [[350, 500], [560, 520]]),
  R5: buildRoute("R5", "Coal", "pit-north", "siding", [[300, 170], [420, 260], [560, 290], [730, 320]]),
};

export interface Pos {
  x: number;
  y: number;
  heading: number; // degrees, 0 = east
}

/** Point at fraction f (0..1) along the route, plus the direction of travel. */
export function pointAt(route: Route, f: number): Pos {
  const d = Math.min(Math.max(f, 0), 1) * route.lengthUnits;
  let i = 1;
  while (i < route.cum.length - 1 && route.cum[i] < d) i++;
  const [x0, y0] = route.points[i - 1];
  const [x1, y1] = route.points[i];
  const seg = route.cum[i] - route.cum[i - 1] || 1;
  const t = (d - route.cum[i - 1]) / seg;
  return { x: x0 + (x1 - x0) * t, y: y0 + (y1 - y0) * t, heading: (Math.atan2(y1 - y0, x1 - x0) * 180) / Math.PI };
}

/** Split the route at fraction f into [already travelled, still to go] point lists. */
export function splitRoute(route: Route, f: number, reversed: boolean): { done: Pt[]; todo: Pt[] } {
  const pts = reversed ? [...route.points].reverse() : route.points;
  const total = route.lengthUnits;
  const d = Math.min(Math.max(f, 0), 1) * total;
  const here = pointAt(route, reversed ? 1 - f : f);
  const done: Pt[] = [pts[0]];
  const todo: Pt[] = [[here.x, here.y]];
  let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    acc += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (acc < d) done.push(pts[i]);
    else todo.push(pts[i]);
  }
  done.push([here.x, here.y]);
  return { done, todo };
}

/**
 * Map units -> real GPS. The 1000 x 600 site (8 km x 4.8 km, 8 m per unit) is laid over the Aravalli foothills near Faridabad, Haryana.
 * Trucks and haul roads are simulated, but they sit on real satellite imagery of this area.
 */
const CENTRE = { lat: 28.3400, lon: 77.2600 }; // middle of the map (500, 300)
const DEG_PER_UNIT_LAT = METRES_PER_UNIT / 111_320;
const DEG_PER_UNIT_LON = METRES_PER_UNIT / (111_320 * Math.cos((CENTRE.lat * Math.PI) / 180));
export function toGps(x: number, y: number): { lat: number; lon: number } {
  return {
    lat: CENTRE.lat - (y - MAP_H / 2) * DEG_PER_UNIT_LAT, // y grows downwards, latitude grows upwards
    lon: CENTRE.lon + (x - MAP_W / 2) * DEG_PER_UNIT_LON,
  };
}

/* ------------------------------------------------------------------ *
 * Fleet on shift. Names match the fleet used on the analytics tab.
 * ------------------------------------------------------------------ */
interface TruckSpec {
  name: string;
  cls: VehicleClass;
  routeId: keyof typeof ROUTES;
  code: string;
  /** Mock alert behaviour, kept consistent with data/alerts.json */
  mode?: "overspeed" | "underload" | "offline" | "off-route";
}

const SPECS: TruckSpec[] = [
  { name: "Coal Dumper 01", cls: "coal-dumper", routeId: "R1", code: "CD01" },
  { name: "Coal Dumper 02", cls: "coal-dumper", routeId: "R1", code: "CD02" },
  { name: "Coal Dumper 03", cls: "coal-dumper", routeId: "R2", code: "CD03" },
  { name: "Coal Dumper 04", cls: "coal-dumper", routeId: "R1", code: "CD04" },
  { name: "Coal Dumper 05", cls: "coal-dumper", routeId: "R2", code: "CD05" },
  { name: "Coal Dumper 07", cls: "coal-dumper", routeId: "R2", code: "CD07", mode: "off-route" },
  { name: "OB Dumper 01", cls: "ob-dumper", routeId: "R3", code: "OB01" },
  { name: "OB Dumper 02", cls: "ob-dumper", routeId: "R3", code: "OB02" },
  { name: "OB Dumper 03", cls: "ob-dumper", routeId: "R4", code: "OB03" },
  { name: "OB Dumper 04", cls: "ob-dumper", routeId: "R4", code: "OB04" },
  { name: "OB Dumper 05", cls: "ob-dumper", routeId: "R3", code: "OB05" },
  { name: "OB Dumper 06", cls: "ob-dumper", routeId: "R4", code: "OB06" },
  { name: "OB Dumper 07", cls: "ob-dumper", routeId: "R3", code: "OB07", mode: "offline" },
  { name: "Heavy Dumper 02", cls: "heavy-dumper", routeId: "R4", code: "HD02" },
  { name: "Heavy Dumper 03", cls: "heavy-dumper", routeId: "R3", code: "HD03" },
  { name: "Coal Tipper 02", cls: "tipper", routeId: "R5", code: "CT02", mode: "overspeed" },
  { name: "Coal Tipper 05", cls: "tipper", routeId: "R5", code: "CT05" },
  { name: "ADT 03", cls: "adt", routeId: "R3", code: "AD03", mode: "underload" },
];

/** Names of all trucks on the live map. */
export const TRACKED_TRUCKS = SPECS.map((s) => s.name);

const LOAD_MIN = 6;
const DUMP_MIN = 3;
const HAUL_KMH = 24; // loaded
const RETURN_KMH = 32; // empty
const IST_OFFSET_MS = 330 * 60_000;

export type TripStatus = "loading" | "hauling" | "dumping" | "returning" | "no-signal" | "completed";

export interface Trip {
  id: string; // "TRP-1115-CD03-07"
  truck: string;
  cls: VehicleClass;
  material: Material;
  from: string;
  to: string;
  routeId: string;
  status: TripStatus;
  progress: number; // 0..1 along current leg
  payloadT: number;
  capacityT: number;
  speedKmh: number;
  distanceKm: number;
  etaMin: number | null; // minutes to finish the current leg
  startedAt: number; // ms epoch
  arrivalAt: number | null; // ms epoch (ETA or actual)
  pos: Pos;
  gps: { lat: number; lon: number };
  lastPingSec: number;
  heading: number;
}

/** Deterministic pseudo-random integer, so the same truck+trip always gets the same numbers. */
const mix = (a: number, b: number) => Math.abs(Math.imul(a + 7, 2654435761) ^ Math.imul(b + 13, 40503)) >>> 0;

function simulate(spec: TruckSpec, idx: number, now: number, seqShift: 0 | -1): Trip {
  const route = ROUTES[spec.routeId];
  const haulMin = (route.km / HAUL_KMH) * 60;
  const retMin = (route.km / RETURN_KMH) * 60;
  const cycle = LOAD_MIN + haulMin + DUMP_MIN + retMin;
  const offline = spec.mode === "offline";

  // minutes since local (IST) midnight, shifted per truck so they are spread out along the road
  const ist = now + IST_OFFSET_MS;
  const minOfDay = (ist % 86_400_000) / 60_000;
  const offset = (idx * 7.3 + 3) % cycle;
  const clock = offline ? 0 : minOfDay + offset;
  const seq = (offline ? 6 + 20 : Math.floor(clock / cycle)) + seqShift;
  const t = offline ? LOAD_MIN + haulMin * 0.45 : seqShift === -1 ? cycle : clock % cycle; // finished trip = end of cycle

  const cap = CLASS_CONFIG[spec.cls].capacityT;
  const factor = 0.86 + (mix(idx, seq) % 13) / 100;
  const fullLoad = Math.round(cap * factor * 10) / 10;
  const payloadWhenLoaded = spec.mode === "underload" ? 12 : fullLoad;

  const cycleStart = now - (offline ? 0 : (clock % cycle) * 60_000) + (seqShift === -1 ? -cycle * 60_000 : 0);

  let status: TripStatus;
  let progress = 0;
  let payload = 0;
  let speed = 0;
  let eta: number | null = null;
  let pos: Pos;
  const dumpEnd = LOAD_MIN + haulMin + DUMP_MIN;
  const jitter = (mix(idx, Math.floor(now / 15_000)) % 5) - 2; // wobbles every 15 s

  if (seqShift === -1) {
    status = "completed";
    progress = 1;
    payload = payloadWhenLoaded;
    pos = pointAt(route, 1);
  } else if (t < LOAD_MIN) {
    status = "loading";
    payload = Math.round(fullLoad * (t / LOAD_MIN) * 10) / 10;
    eta = Math.ceil(LOAD_MIN - t);
    pos = pointAt(route, 0);
  } else if (t < LOAD_MIN + haulMin) {
    status = "hauling";
    progress = (t - LOAD_MIN) / haulMin;
    payload = payloadWhenLoaded;
    speed = spec.mode === "overspeed" ? 45 : HAUL_KMH + jitter;
    eta = Math.max(1, Math.round(((1 - progress) * route.km) / speed * 60));
    pos = pointAt(route, progress);
  } else if (t < dumpEnd) {
    status = "dumping";
    progress = 1;
    payload = payloadWhenLoaded;
    eta = Math.ceil(dumpEnd - t);
    pos = pointAt(route, 1);
  } else {
    status = "returning";
    progress = (t - dumpEnd) / retMin;
    speed = spec.mode === "overspeed" ? 38 : RETURN_KMH + jitter;
    eta = Math.max(1, Math.round(((1 - progress) * route.km) / speed * 60));
    pos = pointAt(route, 1 - progress);
    pos = { ...pos, heading: pos.heading + 180 };
  }

  if (offline && seqShift === 0) {
    status = "no-signal";
    speed = 0;
    eta = null;
  }
  if (spec.mode === "off-route" && seqShift === 0) {
    // geofence breach: drifts ~35 map units (280 m) away from the haul road
    pos = { ...pos, x: pos.x + 22, y: pos.y - 28 };
  }

  const date = new Date(ist);
  const mmdd = `${String(date.getUTCMonth() + 1).padStart(2, "0")}${String(date.getUTCDate()).padStart(2, "0")}`;
  const arrivalBase = cycleStart + (LOAD_MIN + haulMin) * 60_000;

  return {
    id: `TRP-${mmdd}-${spec.code}-${String(((seq % 90) + 90) % 90 + 1).padStart(2, "0")}`,
    truck: spec.name,
    cls: spec.cls,
    material: route.material,
    from: SITES[route.from].label,
    to: SITES[route.to].label,
    routeId: route.id,
    status,
    progress,
    payloadT: payload,
    capacityT: cap,
    speedKmh: speed,
    distanceKm: Math.round(route.km * 10) / 10,
    etaMin: eta,
    startedAt: cycleStart,
    arrivalAt:
      seqShift === -1 ? arrivalBase : status === "hauling" && eta !== null ? now + eta * 60_000 : arrivalBase > now ? arrivalBase : null,
    pos,
    gps: toGps(pos.x, pos.y),
    lastPingSec: offline && seqShift === 0 ? 15 * 60 + 20 : 1 + (mix(idx, Math.floor(now / 1000)) % 3),
    heading: pos.heading,
  };
}

/** Current trip for every truck on shift. */
export function currentTrips(now: number): Trip[] {
  return SPECS.map((s, i) => simulate(s, i, now, 0));
}

/** Current + previous (completed) trip for every truck: used by the trip log. */
export function tripLog(now: number): Trip[] {
  return SPECS.flatMap((s, i) => [simulate(s, i, now, 0), simulate(s, i, now, -1)]);
}

export const STATUS_ORDER: Record<TripStatus, number> = {
  "no-signal": 0,
  hauling: 1,
  loading: 2,
  dumping: 3,
  returning: 4,
  completed: 5,
};

/** "16:42" in IST. Uses UTC getters on a shifted date so server and browser always agree. */
export function fmtClock(ms: number): string {
  const d = new Date(ms + IST_OFFSET_MS);
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export function fmtDay(ms: number): string {
  const d = new Date(ms + IST_OFFSET_MS);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export function fmtGps(g: { lat: number; lon: number }): string {
  return `${g.lat.toFixed(4)}° N, ${g.lon.toFixed(4)}° E`;
}

/** Open alert info for a truck, shown as a badge on the list and the map. */
export interface TruckFlag {
  severity: "critical" | "warning" | "info";
  label: string; // e.g. "Overspeeding 45 km/h"
}
