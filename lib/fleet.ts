import { CLASS_CONFIG, CLASS_IMAGE, DIESEL_PRICE_PER_L } from "./constants";
import { getRecords } from "./records";
import { shiftDays, todayIso } from "./today";
import { VEHICLES } from "./filters";
import { fmt0, fmt1, fmt2, fmtINR } from "./format";
import { hash, type TableRow, type Tone } from "./table";
import { currentTrips, ROUTES, SITES, type Trip, type TripStatus } from "./tracking";
import type { ShiftRecord, VehicleClass } from "./types";
import { ACTIVE_USERS } from "./users";

const MODELS: Record<VehicleClass, string> = {
  "coal-dumper": "BEML BH35",
  "ob-dumper": "Komatsu HD605",
  "heavy-dumper": "CAT 793D",
  tipper: "25 t heavy-duty tipper",
  adt: "Hyundai ADT",
};

/** Machines currently in the workshop (never on the live map). */
const IN_WORKSHOP = new Set(["Coal Dumper 06", "OB Dumper 09", "Coal Tipper 03", "ADT 02"]);

interface Totals {
  trips: number;
  payloadT: number;
  fuelL: number;
  distanceKm: number;
  prodH: number;
  idleH: number;
  breakH: number;
}

/** Per-vehicle totals for the last 7 days up to today. */
function totalsByVehicle(): Map<string, Totals> {
  const map = new Map<string, Totals>();
  const to = todayIso();
  const from = shiftDays(to, -6);
  for (const r of getRecords()) {
    if (r.date < from || r.date > to) continue;
    const t = map.get(r.vehicleId) ?? { trips: 0, payloadT: 0, fuelL: 0, distanceKm: 0, prodH: 0, idleH: 0, breakH: 0 };
    t.trips += r.trips;
    t.payloadT += r.payloadTonnes;
    t.fuelL += r.fuelLitres;
    t.distanceKm += r.distanceKm;
    t.prodH += r.productiveHours;
    t.idleH += r.idleHours;
    t.breakH += r.breakdownHours;
    map.set(r.vehicleId, t);
  }
  return map;
}

const TRIP_TONE: Record<TripStatus, Tone> = {
  hauling: "info",
  returning: "muted",
  loading: "warn",
  dumping: "info",
  completed: "good",
  "no-signal": "bad",
};
const TRIP_LABEL: Record<TripStatus, string> = {
  hauling: "Hauling",
  returning: "Returning",
  loading: "Loading",
  dumping: "Dumping",
  completed: "Completed",
  "no-signal": "No signal",
};

const aliasOf = (equipment: string) => ACTIVE_USERS.find((u) => u.equipment === equipment)?.alias ?? "Unassigned";

/* ---------------------------------------------------------------- vehicles */
export function vehicleRows(now: number): TableRow[] {
  const totals = totalsByVehicle();
  const trips = new Map(currentTrips(now).map((t) => [t.truck, t]));
  return VEHICLES.map((v) => {
    const t = totals.get(v.id);
    const live = trips.get(v.id);
    const util = t ? t.prodH / Math.max(t.prodH + t.idleH + t.breakH, 1) : 0;
    const perT = t && t.payloadT ? t.fuelL / t.payloadT : 0;
    const status = live ? TRIP_LABEL[live.status] : IN_WORKSHOP.has(v.id) ? "In workshop" : "Standby";
    const tone: Tone = live ? TRIP_TONE[live.status] : IN_WORKSHOP.has(v.id) ? "warn" : "muted";
    return {
      id: v.id,
      href: live ? `/dashboard?tab=tracking&truck=${encodeURIComponent(v.id)}` : undefined,
      vehicle: v.id,
      vehicleSub: MODELS[v.vehicleClass],
      image: CLASS_IMAGE[v.vehicleClass],
      class: CLASS_CONFIG[v.vehicleClass].label,
      capacity: `${CLASS_CONFIG[v.vehicleClass].capacityT} t`,
      capacitySort: CLASS_CONFIG[v.vehicleClass].capacityT,
      status,
      statusTone: tone,
      utilisation: `${fmt0(util * 100)}%`,
      utilisationSort: util,
      fuelPerT: `${fmt2(perT)} L/t`,
      fuelPerTSort: perT,
      trips: fmt0(t?.trips ?? 0),
      tripsSort: t?.trips ?? 0,
      engineH: `${fmt0(4200 + (hash(v.id) % 9000))} h`,
      engineHSort: 4200 + (hash(v.id) % 9000),
    };
  });
}

/* ------------------------------------------------------------ active trucks */
export function activeTruckRows(now: number): TableRow[] {
  return currentTrips(now).map((t: Trip) => ({
    id: t.truck,
    href: `/dashboard?tab=tracking&truck=${encodeURIComponent(t.truck)}`,
    truck: t.truck,
    truckSub: `${t.id}`,
    status: TRIP_LABEL[t.status],
    statusTone: TRIP_TONE[t.status],
    route: `${t.from.split(" · ")[0]} → ${t.to}`,
    material: t.material,
    payload: `${fmt1(t.payloadT)} / ${t.capacityT} t`,
    payloadSort: t.payloadT,
    speed: t.speedKmh ? `${t.speedKmh} km/h` : "0 km/h",
    speedSort: t.speedKmh,
    eta: t.etaMin === null ? "n/a" : t.status === "hauling" ? `${t.etaMin} min` : `${t.etaMin} min`,
    etaSort: t.etaMin ?? 9999,
    operator: aliasOf(t.truck),
    lastPing: t.lastPingSec > 60 ? `${Math.round(t.lastPingSec / 60)} min ago` : `${t.lastPingSec} s ago`,
  }));
}

export function activeTruckStats(now: number) {
  const trips = currentTrips(now);
  const moving = trips.filter((t) => t.status === "hauling" || t.status === "returning").length;
  const atSite = trips.filter((t) => t.status === "loading" || t.status === "dumping").length;
  const lost = trips.filter((t) => t.status === "no-signal").length;
  const loaded = trips.filter((t) => t.status === "hauling");
  const avgFill = loaded.length ? loaded.reduce((s, t) => s + t.payloadT / t.capacityT, 0) / loaded.length : 0;
  return { total: trips.length, moving, atSite, lost, avgFill };
}

/* ------------------------------------------------------------- maintenance */
interface Job {
  id: string;
  vehicle: string;
  task: string;
  type: "Preventive" | "Corrective" | "Inspection" | "Tyre";
  priority: "High" | "Medium" | "Low";
  status: "In progress" | "Scheduled" | "Overdue" | "Completed";
  due: string;
  downtimeH: number;
  costInr: number;
  bay: string;
}

export const JOBS: Job[] = [
  { id: "WO-2411", vehicle: "Heavy Dumper 02", task: "Coolant system flush, radiator check", type: "Corrective", priority: "High", status: "Overdue", due: "14 Nov", downtimeH: 6, costInr: 42000, bay: "Bay 1" },
  { id: "WO-2412", vehicle: "Coal Dumper 06", task: "Hydraulic hoist cylinder replacement", type: "Corrective", priority: "High", status: "In progress", due: "15 Nov", downtimeH: 14, costInr: 186000, bay: "Bay 2" },
  { id: "WO-2413", vehicle: "OB Dumper 09", task: "Transmission oil change, 2000 h service", type: "Preventive", priority: "Medium", status: "In progress", due: "15 Nov", downtimeH: 8, costInr: 64000, bay: "Bay 3" },
  { id: "WO-2414", vehicle: "Coal Tipper 03", task: "Rear tyre set replacement", type: "Tyre", priority: "Medium", status: "In progress", due: "16 Nov", downtimeH: 5, costInr: 124000, bay: "Tyre bay" },
  { id: "WO-2415", vehicle: "ADT 02", task: "Articulation joint inspection", type: "Inspection", priority: "Medium", status: "In progress", due: "16 Nov", downtimeH: 4, costInr: 18000, bay: "Bay 4" },
  { id: "WO-2416", vehicle: "Dozer 02", task: "Engine overheating diagnosis", type: "Corrective", priority: "High", status: "Scheduled", due: "16 Nov", downtimeH: 8, costInr: 55000, bay: "Bay 1" },
  { id: "WO-2417", vehicle: "Coal Tipper 02", task: "Speed limiter calibration, brake check", type: "Inspection", priority: "High", status: "Scheduled", due: "17 Nov", downtimeH: 2, costInr: 9000, bay: "Bay 4" },
  { id: "WO-2418", vehicle: "Coal Dumper 03", task: "Fuel injector service", type: "Preventive", priority: "Medium", status: "Scheduled", due: "18 Nov", downtimeH: 4, costInr: 38000, bay: "Bay 2" },
  { id: "WO-2419", vehicle: "OB Dumper 07", task: "Telematics unit and antenna replacement", type: "Corrective", priority: "High", status: "Scheduled", due: "16 Nov", downtimeH: 2, costInr: 21000, bay: "Bay 3" },
  { id: "WO-2420", vehicle: "Excavator 04", task: "Bucket teeth and bush replacement", type: "Preventive", priority: "Low", status: "Scheduled", due: "20 Nov", downtimeH: 6, costInr: 72000, bay: "Field" },
  { id: "WO-2408", vehicle: "Coal Dumper 02", task: "500 h service, filters", type: "Preventive", priority: "Low", status: "Completed", due: "12 Nov", downtimeH: 3, costInr: 16000, bay: "Bay 2" },
  { id: "WO-2409", vehicle: "OB Dumper 04", task: "Brake pad replacement", type: "Corrective", priority: "Medium", status: "Completed", due: "13 Nov", downtimeH: 4, costInr: 29000, bay: "Bay 3" },
];

const JOB_TONE: Record<Job["status"], Tone> = { "In progress": "info", Scheduled: "muted", Overdue: "bad", Completed: "good" };
const PRIORITY_TONE: Record<Job["priority"], Tone> = { High: "bad", Medium: "warn", Low: "muted" };

export function jobRows(): TableRow[] {
  return JOBS.map((j) => ({
    id: j.id,
    order: j.id,
    orderSub: j.task,
    vehicle: j.vehicle,
    type: j.type,
    priority: j.priority,
    priorityTone: PRIORITY_TONE[j.priority],
    status: j.status,
    statusTone: JOB_TONE[j.status],
    due: j.due,
    downtime: `${j.downtimeH} h`,
    downtimeSort: j.downtimeH,
    cost: fmtINR(j.costInr),
    costSort: j.costInr,
    bay: j.bay,
  }));
}

export function jobStats() {
  const open = JOBS.filter((j) => j.status !== "Completed");
  return {
    open: open.length,
    inProgress: JOBS.filter((j) => j.status === "In progress").length,
    overdue: JOBS.filter((j) => j.status === "Overdue").length,
    downtimeH: open.reduce((s, j) => s + j.downtimeH, 0),
    costInr: JOBS.reduce((s, j) => s + j.costInr, 0),
  };
}

/* ---------------------------------------------------------- fuel & telematics */
export function fuelRows(now: number): TableRow[] {
  const totals = totalsByVehicle();
  const trips = new Map(currentTrips(now).map((t) => [t.truck, t]));
  return VEHICLES.map((v) => {
    const t = totals.get(v.id);
    const live = trips.get(v.id);
    const h = hash(v.id);
    const level = v.id === "Excavator 04" ? 8 : 22 + (h % 70);
    const signal = live?.status === "no-signal" ? "Lost" : !live ? "Parked" : h % 11 === 0 ? "Weak" : "Strong";
    const signalTone: Tone = signal === "Lost" ? "bad" : signal === "Weak" ? "warn" : signal === "Strong" ? "good" : "muted";
    const perT = t && t.payloadT ? t.fuelL / t.payloadT : 0;
    const idle = t ? t.idleH / Math.max(t.prodH + t.idleH + t.breakH, 1) : 0;
    return {
      id: v.id,
      vehicle: v.id,
      vehicleSub: CLASS_CONFIG[v.vehicleClass].label,
      image: CLASS_IMAGE[v.vehicleClass],
      fuelLevel: `${level}%`,
      fuelLevelSort: level,
      fuelLevelTone: (level < 25 ? "bad" : level < 40 ? "warn" : "good") as Tone,
      fuelUsed: `${fmt0(t?.fuelL ?? 0)} L`,
      fuelUsedSort: t?.fuelL ?? 0,
      fuelPerT: `${fmt2(perT)} L/t`,
      fuelPerTSort: perT,
      cost: fmtINR((t?.fuelL ?? 0) * DIESEL_PRICE_PER_L),
      costSort: (t?.fuelL ?? 0) * DIESEL_PRICE_PER_L,
      idle: `${fmt0(idle * 100)}%`,
      idleSort: idle,
      signal,
      signalTone,
      engineTemp: live ? `${78 + (h % 14)} °C` : "off",
      engineTempSort: live ? 78 + (h % 14) : 0,
      lastPing: live ? (live.lastPingSec > 60 ? `${Math.round(live.lastPingSec / 60)} min ago` : `${live.lastPingSec} s ago`) : "1 h ago",
    };
  });
}

export function fuelStats(now: number) {
  const totals = Array.from(totalsByVehicle().values());
  const fuelL = totals.reduce((s, t) => s + t.fuelL, 0);
  const payloadT = totals.reduce((s, t) => s + t.payloadT, 0);
  const rows = fuelRows(now);
  return {
    fuelL,
    costInr: fuelL * DIESEL_PRICE_PER_L,
    perT: payloadT ? fuelL / payloadT : 0,
    lowFuel: rows.filter((r) => (r.fuelLevelSort as number) < 25).length,
    signalIssues: rows.filter((r) => r.signal === "Lost" || r.signal === "Weak").length,
  };
}

/* -------------------------------------------------------------- drivers */
const OFF_SHIFT_ANIMALS = ["Yak", "Zebra", "Hare", "Jackal", "Kiwi", "Lark", "Mole", "Okapi", "Quail", "Skink"];
const SHIFT_OF = (h: number) => (["A", "B", "C"] as const)[h % 3];

export function driverRows(): TableRow[] {
  const ops = ACTIVE_USERS.filter((u) => u.role === "Operator");
  const rows: TableRow[] = ops.map((u) => ({ ...driverRow(u.alias, u.equipment, "On shift", "B", u.id), id: u.id }));
  OFF_SHIFT_ANIMALS.forEach((a, i) => {
    const alias = `Anonymous ${a}`;
    rows.push({
      ...driverRow(alias, null, i === 3 || i === 7 ? "On leave" : "Off shift", SHIFT_OF(hash(alias)), `u-${a.toLowerCase()}`),
      id: `u-${a.toLowerCase()}`,
    });
  });
  return rows;
}

function driverRow(alias: string, equipment: string | null, status: string, shift: string, id: string): TableRow {
  const h = hash(alias);
  const years = 2 + (h % 17);
  const score = 72 + (h % 27);
  const month = 1 + (h % 12);
  const year = month < 12 && h % 7 === 0 ? 2026 : 2027 + (h % 3);
  const expiry = `${year}-${String(year === 2026 ? 12 : month).padStart(2, "0")}-${String(1 + (h % 27)).padStart(2, "0")}`;
  return {
    id,
    driver: alias,
    driverSub: `ID DRV-${String(1000 + (h % 9000))}`,
    status,
    statusTone: status === "On shift" ? "good" : status === "On leave" ? "warn" : "muted",
    assigned: equipment ?? "Not assigned",
    shift: `Shift ${shift}`,
    experience: `${years} yrs`,
    experienceSort: years,
    safety: `${score}/100`,
    safetySort: score,
    safetyTone: (score >= 90 ? "good" : score >= 80 ? "info" : "warn") as Tone,
    licence: expiry,
    licenceTone: (expiry < "2027-01-31" ? "warn" : "muted") as Tone,
  };
}

export function driverStats() {
  const rows = driverRows();
  return {
    total: rows.length,
    onShift: rows.filter((r) => r.status === "On shift").length,
    avgSafety: rows.reduce((s, r) => s + (r.safetySort as number), 0) / rows.length,
    expiring: rows.filter((r) => r.licenceTone === "warn").length,
  };
}

/* -------------------------------------------------------------- shipments */
interface Shipment {
  id: string;
  material: "Coal" | "Overburden";
  from: string;
  to: string;
  qty: number;
  trucks: number;
  status: "Loading" | "In transit" | "Delivered" | "Delayed" | "Scheduled";
  time: string;
  slip: string;
}

const SHIPMENTS: Shipment[] = [
  { id: "SHP-3301", material: "Coal", from: "Coal Stockyard", to: "Rail Siding", qty: 1200, trucks: 6, status: "Delivered", time: "Delivered 10:42", slip: "WB-88121" },
  { id: "SHP-3302", material: "Coal", from: "Coal Stockyard", to: "Rail Siding", qty: 980, trucks: 5, status: "Delivered", time: "Delivered 12:15", slip: "WB-88140" },
  { id: "SHP-3303", material: "Coal", from: "Pit North · LP1", to: "Coal Stockyard", qty: 840, trucks: 4, status: "In transit", time: "ETA 16:20", slip: "WB-88166" },
  { id: "SHP-3304", material: "Coal", from: "Pit South · LP2", to: "Coal Stockyard", qty: 760, trucks: 4, status: "In transit", time: "ETA 16:45", slip: "WB-88171" },
  { id: "SHP-3305", material: "Coal", from: "Coal Stockyard", to: "Power plant (STPS)", qty: 1500, trucks: 8, status: "Delayed", time: "ETA 17:30 (+45 min)", slip: "WB-88150" },
  { id: "SHP-3306", material: "Coal", from: "Pit North · LP1", to: "Rail Siding", qty: 620, trucks: 3, status: "Loading", time: "Loading, 40% done", slip: "WB-88180" },
  { id: "SHP-3307", material: "Overburden", from: "OB Bench 3", to: "Waste Dump 1", qty: 2100, trucks: 7, status: "In transit", time: "ETA 16:10", slip: "WB-88175" },
  { id: "SHP-3308", material: "Overburden", from: "Pit South · LP2", to: "Waste Dump 1", qty: 1800, trucks: 6, status: "Delivered", time: "Delivered 13:05", slip: "WB-88133" },
  { id: "SHP-3309", material: "Coal", from: "Coal Stockyard", to: "Rail Siding", qty: 1100, trucks: 6, status: "Scheduled", time: "Dispatch 18:00", slip: "n/a" },
  { id: "SHP-3310", material: "Coal", from: "Coal Stockyard", to: "Cement works (road)", qty: 450, trucks: 2, status: "Scheduled", time: "Dispatch 19:30", slip: "n/a" },
  { id: "SHP-3311", material: "Overburden", from: "OB Bench 3", to: "Waste Dump 1", qty: 1950, trucks: 7, status: "Scheduled", time: "Dispatch 20:00", slip: "n/a" },
  { id: "SHP-3312", material: "Coal", from: "Pit North · LP1", to: "Coal Stockyard", qty: 700, trucks: 3, status: "Delivered", time: "Delivered 09:30", slip: "WB-88098" },
];

const SHIP_TONE: Record<Shipment["status"], Tone> = {
  Loading: "warn",
  "In transit": "info",
  Delivered: "good",
  Delayed: "bad",
  Scheduled: "muted",
};

export function shipmentRows(): TableRow[] {
  return SHIPMENTS.map((s) => ({
    id: s.id,
    shipment: s.id,
    shipmentSub: s.material,
    route: `${s.from} → ${s.to}`,
    qty: `${fmt0(s.qty)} t`,
    qtySort: s.qty,
    trucks: `${s.trucks} trucks`,
    trucksSort: s.trucks,
    status: s.status,
    statusTone: SHIP_TONE[s.status],
    time: s.time,
    slip: s.slip,
  }));
}

export function shipmentStats() {
  const sum = (st: Shipment["status"]) => SHIPMENTS.filter((s) => s.status === st).reduce((a, s) => a + s.qty, 0);
  return {
    dispatched: SHIPMENTS.filter((s) => s.status !== "Scheduled").reduce((a, s) => a + s.qty, 0),
    inTransit: sum("In transit") + sum("Loading"),
    delivered: sum("Delivered"),
    delayed: SHIPMENTS.filter((s) => s.status === "Delayed").length,
  };
}

/* ---------------------------------------------------------- route planning */
const LOAD_MIN = 6;
const DUMP_MIN = 3;
const HAUL_KMH = 24;
const RETURN_KMH = 32;

export interface RoutePlan {
  id: string;
  from: string;
  to: string;
  material: string;
  km: number;
  trucks: number;
  cycleMin: number;
  tripsPerHour: number;
  load: "Light" | "Balanced" | "Busy";
  points: [number, number][];
  fromXY: [number, number];
  toXY: [number, number];
}

export function routePlans(now: number): RoutePlan[] {
  const trips = currentTrips(now);
  return Object.values(ROUTES).map((r) => {
    const trucks = trips.filter((t) => t.routeId === r.id).length;
    const cycle = LOAD_MIN + (r.km / HAUL_KMH) * 60 + DUMP_MIN + (r.km / RETURN_KMH) * 60;
    const perKm = trucks / r.km;
    return {
      id: r.id,
      from: SITES[r.from].label,
      to: SITES[r.to].label,
      material: r.material,
      km: r.km,
      trucks,
      cycleMin: cycle,
      tripsPerHour: (trucks * 60) / cycle,
      load: perKm > 1.35 ? "Busy" : perKm < 0.9 ? "Light" : "Balanced",
      points: r.points,
      fromXY: [SITES[r.from].x, SITES[r.from].y],
      toXY: [SITES[r.to].x, SITES[r.to].y],
    };
  });
}
