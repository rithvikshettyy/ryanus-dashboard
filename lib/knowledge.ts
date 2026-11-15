import { buildDashboard } from "./analytics";
import { ALL_CLASSES, CLASS_CONFIG, DATA_END, DATA_START, DIESEL_PRICE_PER_L } from "./constants";
import { FAQ } from "./faq";
import {
  activeTruckRows, activeTruckStats, driverRows, driverStats, fuelRows, fuelStats, JOBS, jobRows, jobStats, routePlans,
  shipmentRows, shipmentStats, vehicleRows,
} from "./fleet";
import { fmt0, fmt1, fmt2, fmtINR, fmtPct, fmtRange } from "./format";
import type { Chunk } from "./rag";
import { shiftDays, todayIso } from "./today";

/** Everything the support chatbot may quote, built from the same data the screens use (alerts are added in the browser). */
export function buildKnowledge(now: number): Chunk[] {
  const chunks: Chunk[] = [];
  const add = (c: Chunk) => chunks.push(c);

  /* ---- FAQ and site guide ---- */
  FAQ.forEach((f, i) => add({ id: `faq-${i}`, title: f.q, text: f.a, href: "/help", keywords: "help how faq" }));

  const guide: [string, string, string, string][] = [
    ["Dashboard", "/dashboard", "The Haulage Analytics dashboard compares vehicle classes: highlights, material moved, fuel, trips, productive hours, efficiency scorecard, charts and a vehicle performance table. Filters: period, vehicle classes and vehicle.", "analytics kpi compare filter charts report"],
    ["Live tracking", "/dashboard?tab=tracking", "The Live tracking tab shows every truck on shift on a site map with trip number, status, payload, speed, ETA and GPS position. Tap a truck in the list or map to follow it.", "map gps trip tracking eta where"],
    ["Alerts page", "/alerts", "The Alerts page lists alerts critical first, with actual versus threshold, time since raised, location and next step. You can acknowledge, resolve, open details, filter by severity, type, equipment, status and time, and search.", "alert acknowledge resolve filter search"],
    ["Shipments & deliveries", "/shipments", "Shipments & deliveries shows coal and overburden movements with quantity, trucks, status, ETA and weighbridge slip.", "shipment delivery dispatch weighbridge"],
    ["Fleet management menu", "/fleet/vehicles", "Fleet management has All vehicles, Active trucks, Maintenance & repairs, Fuel & telematics, Driver directory and Route planning.", "menu sidebar navigation fleet"],
    ["Settings", "/settings", "Settings holds the alert thresholds (speed limit 30 km/h, coolant 95 °C, engine 100 °C, low fuel 15%, offline after 5 min), notification switches and units.", "threshold limit notification units configure"],
    ["Data range and assumptions", "/dashboard", `Mock data covers ${fmtRange(DATA_START, DATA_END)} for 33 vehicles across 5 classes and 3 shifts (A 06-14, B 14-22, C 22-06; night shift is about 10% slower). Fuel cost uses diesel at ₹${DIESEL_PRICE_PER_L} per litre. An alert is shown as overdue after 10 minutes.`, "data assumption diesel price shift range mock"],
    ["Metric definitions", "/dashboard", "Fuel per tonne = litres / tonnes. Fuel per km = litres / km. Utilisation = productive hours / scheduled hours. Payload per trip = tonnes / trips. Tonnes per productive hour = tonnes / productive hours. Ratios are computed from totals, not averaged per vehicle. Vehicles are flagged when utilisation is under 75% or fuel per tonne is 12% above the class average.", "definition formula calculate utilisation efficiency flag meaning"],
  ];
  guide.forEach(([title, href, text, keywords]) => add({ id: `guide-${title}`, title, text, href, keywords }));

  /* ---- Fleet ---- */
  add({
    id: "fleet-summary",
    title: "Fleet overview",
    text:
      "The fleet has 33 vehicles in 5 classes: " +
      ALL_CLASSES.map((c) => `${CLASS_CONFIG[c].label} (${CLASS_CONFIG[c].count} vehicles, ${CLASS_CONFIG[c].capacityT} t payload)`).join(", ") +
      ".",
    href: "/fleet/vehicles",
    keywords: "how many vehicles trucks classes capacity fleet size",
  });
  vehicleRows(now).forEach((r) =>
    add({
      id: `veh-${r.id}`,
      title: String(r.vehicle),
      text: `${r.vehicle} is a ${r.class} (${r.vehicleSub}, ${r.capacity} payload). Status: ${r.status}. Utilisation ${r.utilisation}, fuel ${r.fuelPerT}, ${r.trips} trips and ${r.engineH} engine hours (last 7 days).`,
      href: "/fleet/vehicles",
      keywords: "vehicle truck machine status utilisation",
    }),
  );

  /* ---- Analytics: today and last 7 days, per class ---- */
  const today = todayIso();
  const periods: [string, string, string][] = [
    ["today", today, today],
    ["the last 7 days", shiftDays(today, -6), today],
  ];
  for (const [label, from, to] of periods) {
    const d = buildDashboard({ from, to, classes: ALL_CLASSES, vehicle: null });
    d.summaries.forEach((s) =>
      add({
        id: `stats-${label}-${s.cls}`,
        title: `${s.label} ${label}`,
        text:
          `${s.label} ${label} (${fmtRange(from, to)}): ${fmt0(s.totals.trips)} trips, ${fmt0(s.totals.payloadT)} t moved, ` +
          `${fmt0(s.totals.fuelL)} L fuel, ${fmt2(s.derived.fuelPerTonne)} L/t, ${fmt1(s.derived.payloadPerTrip)} t per trip, ` +
          `${fmt0(s.totals.distanceKm)} km, utilisation ${fmtPct(s.derived.utilisation)}, ${fmt0(s.totals.productiveH)} productive hours, ` +
          `fuel cost ${fmtINR(s.derived.fuelCost)}.`,
        href: `/dashboard?from=${from}&to=${to}&classes=${s.cls}`,
        keywords: `production totals performance fuel payload trips efficiency ${label}`,
      }),
    );
  }
  const compare = buildDashboard({ from: shiftDays(today, -6), to: today, classes: ["coal-dumper", "ob-dumper"], vehicle: null });
  add({
    id: "compare",
    title: "Coal Dumper vs OB Dumper comparison",
    text: compare.insights.map((i) => `${i.title}: ${i.body}`).join(" "),
    href: `/dashboard?classes=coal-dumper,ob-dumper&from=${shiftDays(today, -6)}&to=${today}`,
    keywords: "compare comparison versus difference gap better worse outlier highlights insight",
  });

  /* ---- Active trucks ---- */
  const ts = activeTruckStats(now);
  add({
    id: "trucks-summary",
    title: "Active trucks overview",
    text: `${ts.total} trucks are on shift: ${ts.moving} on the road (hauling or returning), ${ts.atSite} at loading or dump points and ${ts.lost} with no GPS signal. Average fill of hauling trucks is ${fmtPct(ts.avgFill)} of capacity.`,
    href: "/fleet/active-trucks",
    keywords: "how many trucks active running moving on road offline no signal on shift",
  });
  activeTruckRows(now).forEach((r) =>
    add({
      id: `trip-${r.id}`,
      title: `${r.truck} live trip`,
      text: `${r.truck} is ${String(r.status).toLowerCase()} on ${r.route} (${r.material}). Payload ${r.payload}, speed ${r.speed}, leg ETA ${r.eta}, last ping ${r.lastPing}. Operator ${r.operator}. Trip ${r.truckSub}.`,
      href: String(r.href),
      keywords: "live trip where eta gps position tracking operator driver",
    }),
  );
  const offline = activeTruckRows(now).filter((r) => r.status === "No signal");
  add({
    id: "trucks-offline",
    title: "Trucks with no signal",
    text: offline.length ? `Trucks with no GPS signal: ${offline.map((r) => `${r.truck} (last ping ${r.lastPing})`).join(", ")}.` : "All trucks are reporting GPS.",
    href: "/fleet/active-trucks",
    keywords: "offline no signal lost communication not reporting which trucks",
  });

  /* ---- Maintenance ---- */
  const js = jobStats();
  add({
    id: "maint-summary",
    title: "Maintenance overview",
    text: `${js.open} work orders are open (${js.inProgress} in progress, ${js.overdue} overdue) with ${js.downtimeH} h of planned downtime. Estimated cost of all listed orders is ${fmtINR(js.costInr)}.`,
    href: "/fleet/maintenance",
    keywords: "maintenance repair work orders overdue open downtime workshop how many",
  });
  const overdue = JOBS.filter((j) => j.status === "Overdue");
  add({
    id: "maint-overdue",
    title: "Overdue maintenance",
    text: overdue.length ? `Overdue work orders: ${overdue.map((j) => `${j.id} ${j.vehicle} (${j.task}, due ${j.due})`).join("; ")}.` : "No work orders are overdue.",
    href: "/fleet/maintenance",
    keywords: "overdue late maintenance repair behind",
  });
  jobRows().forEach((r) =>
    add({
      id: `wo-${r.id}`,
      title: String(r.order),
      text: `${r.order} on ${r.vehicle}: ${r.orderSub}. ${r.type}, ${r.priority} priority, ${r.status}, due ${r.due}, downtime ${r.downtime}, estimated ${r.cost}, at ${r.bay}.`,
      href: "/fleet/maintenance",
      keywords: "work order maintenance repair job",
    }),
  );

  /* ---- Shipments ---- */
  const ss = shipmentStats();
  add({
    id: "ship-summary",
    title: "Shipments overview",
    text: `Today ${fmt0(ss.dispatched)} t has been dispatched: ${fmt0(ss.inTransit)} t is loading or in transit, ${fmt0(ss.delivered)} t is delivered and ${ss.delayed} shipment${ss.delayed === 1 ? " is" : "s are"} delayed.`,
    href: "/shipments",
    keywords: "shipments deliveries dispatched delivered in transit delayed late coal tonnes today",
  });
  shipmentRows().forEach((r) =>
    add({
      id: `ship-${r.id}`,
      title: String(r.shipment),
      text: `${r.shipment} (${r.shipmentSub}) ${r.route}: ${r.qty} with ${r.trucks}. Status ${r.status}, ${r.time}. Weighbridge slip ${r.slip}.`,
      href: "/shipments",
      keywords: "shipment delivery dispatch",
    }),
  );

  /* ---- Fuel & telematics ---- */
  const fs = fuelStats(now);
  add({
    id: "fuel-summary",
    title: "Fuel and telematics overview",
    text: `Fleet fuel use over the last 7 days is ${fmt0(fs.fuelL)} L costing ${fmtINR(fs.costInr)} (₹${DIESEL_PRICE_PER_L} per litre), ${fmt2(fs.perT)} L per tonne. ${fs.lowFuel} vehicles have a low tank and ${fs.signalIssues} have weak or lost GPS signal.`,
    href: "/fleet/fuel-telematics",
    keywords: "fuel consumption diesel cost litres per tonne low tank signal telematics",
  });
  fuelRows(now).forEach((r) =>
    add({
      id: `fuel-${r.id}`,
      title: `${r.vehicle} fuel`,
      text: `${r.vehicle} fuel and telematics: tank ${r.fuelLevel}, used ${r.fuelUsed} (${r.fuelPerT}, cost ${r.cost}) over 7 days, idle share ${r.idle}, GPS signal ${r.signal}, engine temperature ${r.engineTemp}, last ping ${r.lastPing}.`,
      href: "/fleet/fuel-telematics",
      keywords: "fuel tank level gps signal engine temperature telematics",
    }),
  );

  /* ---- Drivers (anonymous) ---- */
  const ds = driverStats();
  add({
    id: "drivers-summary",
    title: "Driver directory overview",
    text: `The directory lists ${ds.total} drivers, ${ds.onShift} on shift now. Average safety score is ${ds.avgSafety.toFixed(0)}/100 and ${ds.expiring} licences expire within 90 days. Drivers appear by anonymous alias only.`,
    href: "/fleet/drivers",
    keywords: "drivers operators how many on shift safety score licence expiring anonymous",
  });
  driverRows().forEach((r) =>
    add({
      id: `drv-${r.id}`,
      title: String(r.driver),
      text: `${r.driver} is ${String(r.status).toLowerCase()}, assigned to ${r.assigned}, ${r.shift}, ${r.experience} experience, safety score ${r.safety}, licence valid till ${r.licence}.`,
      href: "/fleet/drivers",
      keywords: "driver operator who drives safety licence",
    }),
  );

  /* ---- Routes ---- */
  routePlans(now).forEach((r) =>
    add({
      id: `route-${r.id}`,
      title: `Route ${r.id}`,
      text: `Route ${r.id} is a ${r.material.toLowerCase()} haul from ${r.from} to ${r.to}, ${fmt1(r.km)} km one way. ${r.trucks} trucks are assigned, cycle time ${fmt1(r.cycleMin)} min, ${fmt1(r.tripsPerHour)} trips per hour. Load: ${r.load}.`,
      href: "/fleet/route-planning",
      keywords: "route road haul planning cycle time busy congestion",
    }),
  );

  return chunks;
}
