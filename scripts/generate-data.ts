import { mkdirSync, writeFileSync } from "node:fs";
import { CLASS_CONFIG, ALL_CLASSES } from "../lib/constants";
import type { ShiftId, ShiftRecord, Vehicle, VehicleClass } from "../lib/types";

// Seeded RNG (mulberry32). Same seed => same numbers every run, so no hydration mismatch.
// It returns a FUNCTION that remembers `a` between calls: that is a closure.
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296; // 0 <= x < 1
  };
}
const rand = mulberry32(42);
const between = (min: number, max: number) => min + rand() * (max - min);
const round = (n: number, d = 1) => Math.round(n * 10 ** d) / 10 ** d;

// Per-class physics: haul distance per trip (km), fuel burn (L/km), base productive share of an 8h shift
const PHYSICS: Record<VehicleClass, { haulKm: number; lPerKm: number; tripsPerProdHour: number }> = {
  "coal-dumper": { haulKm: 6.1, lPerKm: 2.31, tripsPerProdHour: 1.5 },
  "ob-dumper": { haulKm: 4.55, lPerKm: 3.66, tripsPerProdHour: 1.2 },
  "heavy-dumper": { haulKm: 5.5, lPerKm: 5.8, tripsPerProdHour: 1.0 },
  tipper: { haulKm: 9.0, lPerKm: 1.6, tripsPerProdHour: 0.45 },
  adt: { haulKm: 4.5, lPerKm: 3.1, tripsPerProdHour: 1.1 },
};

// 1 Nov to 17 Nov 2026 (17 days)
const DATES = Array.from({ length: 17 }, (_, i) => `2026-11-${String(i + 1).padStart(2, "0")}`);
const SHIFT_IDS: ShiftId[] = ["A", "B", "C"];

// 1. Vehicles. Each gets a personal "fuel factor" so some are fuel hogs (outliers for the vehicle table).
const vehicles: Vehicle[] = [];
const fuelFactor = new Map<string, number>();
const availability = new Map<string, number>(); // how often a vehicle is working
for (const cls of ALL_CLASSES) {
  const { label, count } = CLASS_CONFIG[cls];
  for (let i = 1; i <= count; i++) {
    const id = `${label} ${String(i).padStart(2, "0")}`; // e.g. "Coal Tipper 02"
    vehicles.push({ id, vehicleClass: cls });
    fuelFactor.set(id, between(0.92, 1.1));
    availability.set(id, between(0.7, 0.95));
  }
}
// Force a couple of clear outliers
fuelFactor.set("Coal Dumper 03", 1.22);
availability.set("OB Dumper 07", 0.62);

// 2. Records: 33 vehicles x 17 days x 3 shifts = 1683
const records: ShiftRecord[] = [];
for (const v of vehicles) {
  const { capacityT } = CLASS_CONFIG[v.vehicleClass];
  const p = PHYSICS[v.vehicleClass];
  for (const date of DATES) {
    for (const shift of SHIFT_IDS) {
      const speed = shift === "C" ? 0.9 : 1; // night shift 10% slower
      const breakdownHours = rand() < 0.07 ? round(between(1, 4)) : 0;
      const workable = 8 - breakdownHours;
      const productiveHours = round(workable * availability.get(v.id)! * between(0.9, 1.05) * speed);
      const idleHours = round(Math.max(0, 8 - breakdownHours - productiveHours));
      // Derived values: trips depend on productive hours, payload on trips, fuel on distance.
      // That is why totals/ratios are consistent across every chart.
      const trips = Math.max(0, Math.round(productiveHours * p.tripsPerProdHour * between(0.9, 1.1)));
      const payloadTonnes = round(trips * capacityT * between(0.82, 0.98));
      const distanceKm = round(trips * p.haulKm * between(0.95, 1.05));
      const fuelLitres = round(distanceKm * p.lPerKm * fuelFactor.get(v.id)! * between(0.97, 1.03));
      records.push({
        vehicleId: v.id, vehicleClass: v.vehicleClass, date, shift,
        trips, payloadTonnes, distanceKm, fuelLitres,
        productiveHours, idleHours, breakdownHours,
      });
    }
  }
}

mkdirSync("data", { recursive: true });
writeFileSync("data/vehicles.json", JSON.stringify(vehicles, null, 2));
writeFileSync("data/shift-records.json", JSON.stringify(records));
console.log(`vehicles: ${vehicles.length}, records: ${records.length}`);

// Sanity print for today (15 Nov), coal vs OB
for (const cls of ["coal-dumper", "ob-dumper"] as VehicleClass[]) {
  const rows = records.filter((r) => r.vehicleClass === cls && r.date === "2026-11-15");
  const sum = (k: keyof ShiftRecord) => rows.reduce((s, r) => s + (r[k] as number), 0);
  console.log(cls, {
    trips: sum("trips"), payloadT: round(sum("payloadTonnes"), 0), km: round(sum("distanceKm"), 0),
    fuelL: round(sum("fuelLitres"), 0), prodH: round(sum("productiveHours"), 0),
    lPerT: round(sum("fuelLitres") / sum("payloadTonnes"), 2),
  });
}
