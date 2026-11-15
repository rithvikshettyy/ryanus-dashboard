import recordsJson from "@/data/shift-records.json";
import { CLASS_CONFIG, DIESEL_PRICE_PER_L } from "./constants";
import type { DashboardFilters } from "./filters";
import type { TFn } from "./i18n";
import { fmt0, fmt1, fmtDate, safeDiv } from "./format";
import type { ShiftId, ShiftRecord, VehicleClass } from "./types";

const RECORDS = recordsJson as unknown as ShiftRecord[];

export interface Totals {
  trips: number;
  payloadT: number;
  distanceKm: number;
  fuelL: number;
  productiveH: number;
  idleH: number;
  breakdownH: number;
}

/** reduce: fold many rows into one totals object. Ratios are computed from these totals, never averaged. */
export function sumRecords(rows: ShiftRecord[]): Totals {
  return rows.reduce<Totals>(
    (t, r) => {
      t.trips += r.trips;
      t.payloadT += r.payloadTonnes;
      t.distanceKm += r.distanceKm;
      t.fuelL += r.fuelLitres;
      t.productiveH += r.productiveHours;
      t.idleH += r.idleHours;
      t.breakdownH += r.breakdownHours;
      return t;
    },
    { trips: 0, payloadT: 0, distanceKm: 0, fuelL: 0, productiveH: 0, idleH: 0, breakdownH: 0 },
  );
}

export interface Derived {
  payloadPerTrip: number;
  fuelPerTonne: number;
  fuelPerKm: number;
  tonnesPerProdHour: number;
  utilisation: number; // 0..1
  fuelCost: number;
  breakdownShare: number; // 0..1
}

export function derive(t: Totals): Derived {
  const total = t.productiveH + t.idleH + t.breakdownH;
  return {
    payloadPerTrip: safeDiv(t.payloadT, t.trips),
    fuelPerTonne: safeDiv(t.fuelL, t.payloadT),
    fuelPerKm: safeDiv(t.fuelL, t.distanceKm),
    tonnesPerProdHour: safeDiv(t.payloadT, t.productiveH),
    utilisation: safeDiv(t.productiveH, total),
    fuelCost: t.fuelL * DIESEL_PRICE_PER_L,
    breakdownShare: safeDiv(t.breakdownH, total),
  };
}

export function filterRecords(f: DashboardFilters): ShiftRecord[] {
  return RECORDS.filter(
    (r) =>
      r.date >= f.from &&
      r.date <= f.to &&
      f.classes.includes(r.vehicleClass) &&
      (f.vehicle === null || r.vehicleId === f.vehicle),
  );
}

export interface ClassSummary {
  cls: VehicleClass;
  label: string;
  vehicles: number;
  totals: Totals;
  derived: Derived;
}

export type MetricKey =
  | "payloadT" | "fuelL" | "trips" | "distanceKm" | "productiveH"
  | "payloadPerTrip" | "fuelPerTonne" | "fuelPerKm" | "tonnesPerProdHour" | "utilisation" | "fuelCost";

/** true = a higher number is better. Drives the green/red colouring of difference pills. */
export const HIGHER_IS_BETTER: Record<MetricKey, boolean> = {
  payloadT: true, fuelL: false, trips: true, distanceKm: true, productiveH: true,
  payloadPerTrip: true, fuelPerTonne: false, fuelPerKm: false, tonnesPerProdHour: true,
  utilisation: true, fuelCost: false,
};

export function metricValue(s: ClassSummary, key: MetricKey): number {
  switch (key) {
    case "payloadT": return s.totals.payloadT;
    case "fuelL": return s.totals.fuelL;
    case "trips": return s.totals.trips;
    case "distanceKm": return s.totals.distanceKm;
    case "productiveH": return s.totals.productiveH;
    default: return s.derived[key];
  }
}

export interface TrendRow {
  label: string; // "13 Nov · A"
  [cls: string]: number | string;
}

export interface VehicleRow {
  id: string;
  cls: VehicleClass;
  trips: number;
  payloadT: number;
  fuelPerTonne: number;
  utilisation: number;
  lowUtilisation: boolean;
  highFuel: boolean;
}

export interface Insight {
  tone: "good" | "bad" | "info";
  title: string;
  body: string;
}

export interface DashboardData {
  empty: boolean;
  summaries: ClassSummary[];
  context: { days: number; shifts: number; vehicleCounts: number[] };
  trend: Record<"payloadT" | "fuelL" | "trips" | "fuelPerTonne" | "fuelPerKm", TrendRow[]>;
  shiftLabels: string[];
  share: { metric: string; values: { cls: VehicleClass; label: string; value: number }[] }[];
  timeSplit: { cls: VehicleClass; label: string; productive: number; idle: number; breakdown: number }[];
  vehicles: VehicleRow[];
  insights: Insight[];
}

const SHIFT_ORDER: ShiftId[] = ["A", "B", "C"];

export function buildDashboard(f: DashboardFilters, t: TFn): DashboardData {
  const rows = filterRecords(f);

  const summaries: ClassSummary[] = f.classes.map((cls) => {
    const own = rows.filter((r) => r.vehicleClass === cls);
    const totals = sumRecords(own);
    return {
      cls,
      label: t(CLASS_CONFIG[cls].label),
      vehicles: new Set(own.map((r) => r.vehicleId)).size,
      totals,
      derived: derive(totals),
    };
  });

  const dates = Array.from(new Set(rows.map((r) => r.date))).sort();
  const days = dates.length;
  const shiftKeys = dates.flatMap((d) => SHIFT_ORDER.map((s) => ({ d, s })));

  // Trend rows: one per date+shift, one number per class. Ratios from totals of that bucket.
  const trend: DashboardData["trend"] = { payloadT: [], fuelL: [], trips: [], fuelPerTonne: [], fuelPerKm: [] };
  const shiftLabels: string[] = [];
  for (const { d, s } of shiftKeys) {
    const label = `${t(fmtDate(d))} · ${s}`;
    shiftLabels.push(label);
    const row = (): TrendRow => ({ label });
    const rp = row(), rf = row(), rt = row(), rpt = row(), rpk = row();
    for (const cls of f.classes) {
      const t = sumRecords(rows.filter((r) => r.date === d && r.shift === s && r.vehicleClass === cls));
      rp[cls] = Math.round(t.payloadT);
      rf[cls] = Math.round(t.fuelL);
      rt[cls] = t.trips;
      rpt[cls] = Number(safeDiv(t.fuelL, t.payloadT).toFixed(3));
      rpk[cls] = Number(safeDiv(t.fuelL, t.distanceKm).toFixed(3));
    }
    trend.payloadT.push(rp);
    trend.fuelL.push(rf);
    trend.trips.push(rt);
    trend.fuelPerTonne.push(rpt);
    trend.fuelPerKm.push(rpk);
  }

  const shareDefs: { metric: string; key: MetricKey }[] = [
    { metric: "Payload", key: "payloadT" },
    { metric: "Fuel", key: "fuelL" },
    { metric: "Trips", key: "trips" },
    { metric: "Distance", key: "distanceKm" },
    { metric: "Productive hours", key: "productiveH" },
  ];
  const share = shareDefs.map(({ metric, key }) => ({
    metric: t(metric),
    values: summaries.map((s) => ({ cls: s.cls, label: s.label, value: metricValue(s, key) })),
  }));

  const timeSplit = summaries.map((s) => ({
    cls: s.cls,
    label: s.label,
    productive: Math.round(s.totals.productiveH),
    idle: Math.round(s.totals.idleH),
    breakdown: Math.round(s.totals.breakdownH),
  }));

  // Vehicle table: flag low utilisation and fuel/t well above the class average
  const byVehicle = new Map<string, ShiftRecord[]>();
  for (const r of rows) {
    const list = byVehicle.get(r.vehicleId) ?? [];
    list.push(r);
    byVehicle.set(r.vehicleId, list);
  }
  const vehicles: VehicleRow[] = Array.from(byVehicle, ([id, vr]) => {
    const cls = vr[0].vehicleClass;
    const t = sumRecords(vr);
    const d = derive(t);
    const classAvg = summaries.find((s) => s.cls === cls)?.derived.fuelPerTonne ?? 0;
    return {
      id, cls, trips: t.trips, payloadT: t.payloadT,
      fuelPerTonne: d.fuelPerTonne, utilisation: d.utilisation,
      lowUtilisation: d.utilisation < 0.75,
      highFuel: classAvg > 0 && d.fuelPerTonne >= classAvg * 1.12,
    };
  }).sort((a, b) => b.payloadT - a.payloadT);

  return {
    empty: rows.length === 0,
    summaries,
    context: {
      days,
      shifts: shiftKeys.length,
      vehicleCounts: summaries.map((s) => s.vehicles),
    },
    trend,
    shiftLabels,
    share,
    timeSplit,
    vehicles,
    insights: buildInsights(summaries, vehicles, t),
  };
}

function buildInsights(summaries: ClassSummary[], vehicles: VehicleRow[], t: TFn): Insight[] {
  const out: Insight[] = [];
  if (summaries.length >= 2) {
    const byPayload = [...summaries].sort((a, b) => b.totals.payloadT - a.totals.payloadT);
    const [hi, lo] = [byPayload[0], byPayload[byPayload.length - 1]];
    if (lo.totals.payloadT > 0) {
      const gap = hi.totals.payloadT / lo.totals.payloadT - 1;
      out.push({
        tone: "info",
        title: t("Payload gap"),
        body: t("{hi} moved {gap}% more payload than {lo} ({a} t vs {b} t) on {c} vs {d} trips.", {
          hi: hi.label, lo: lo.label, gap: (gap * 100).toFixed(0),
          a: fmt0(hi.totals.payloadT), b: fmt0(lo.totals.payloadT), c: fmt0(hi.totals.trips), d: fmt0(lo.totals.trips),
        }),
      });
    }
    const byFuel = [...summaries].sort((a, b) => a.derived.fuelPerTonne - b.derived.fuelPerTonne);
    const [best, worst] = [byFuel[0], byFuel[byFuel.length - 1]];
    if (best.derived.fuelPerTonne > 0) {
      const gap = worst.derived.fuelPerTonne / best.derived.fuelPerTonne - 1;
      out.push({
        tone: "bad",
        title: t("Fuel efficiency"),
        body: t("{worst} burns {gap}% more fuel per tonne than {best} ({a} vs {b} L/t).", {
          worst: worst.label, best: best.label, gap: (gap * 100).toFixed(0),
          a: worst.derived.fuelPerTonne.toFixed(2), b: best.derived.fuelPerTonne.toFixed(2),
        }),
      });
    }
  } else if (summaries.length === 1) {
    const s = summaries[0];
    out.push({
      tone: "info",
      title: t("Single class view"),
      body: t("{label} moved {a} t on {b} trips at {c} L/t. Select a second class to compare.", {
        label: s.label, a: fmt0(s.totals.payloadT), b: fmt0(s.totals.trips), c: s.derived.fuelPerTonne.toFixed(2),
      }),
    });
  }

  const flagged = vehicles.filter((v) => v.highFuel || v.lowUtilisation);
  const worst = [...flagged].sort((a, b) => b.fuelPerTonne - a.fuelPerTonne)[0];
  if (worst) {
    const avg = summaries.find((s) => s.cls === worst.cls)?.derived.fuelPerTonne ?? 0;
    const reasons = [
      worst.highFuel && avg > 0 ? t("fuel/t is {n}% above the class average", { n: ((worst.fuelPerTonne / avg - 1) * 100).toFixed(0) }) : null,
      worst.lowUtilisation ? t("utilisation is only {n}%", { n: fmt1(worst.utilisation * 100) }) : null,
    ].filter((r): r is string => r !== null);
    const why = reasons.length === 2 ? t("{a} and {b}", { a: reasons[0], b: reasons[1] }) : reasons[0];
    out.push({
      tone: "bad",
      title: t("Outlier to check"),
      body: `${t(worst.id)}: ${why}. ${flagged.length > 1 ? t("{n} more vehicle(s) flagged below.", { n: flagged.length - 1 }) : t("Only flagged vehicle in this view.")}`,
    });
  } else if (vehicles.length) {
    out.push({ tone: "good", title: t("No outliers"), body: t("Every vehicle is within 12% of its class fuel/t average and above 75% utilisation.") });
  }
  return out.slice(0, 3);
}
