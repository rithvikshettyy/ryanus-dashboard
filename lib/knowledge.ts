import { buildDashboard } from "./analytics";
import { ALL_CLASSES, CLASS_CONFIG, DATA_END, DATA_START, DIESEL_PRICE_PER_L } from "./constants";
import { FAQ } from "./faq";
import {
  activeTruckRows, activeTruckStats, driverRows, driverStats, fuelRows, fuelStats, JOBS, jobRows, jobStats, routePlans,
  shipmentRows, shipmentStats, vehicleRows,
} from "./fleet";
import { fmt0, fmt1, fmt2, fmtINR, fmtPct, fmtRange } from "./format";
import { makeT, type Lang, type TFn } from "./i18n";
import type { Chunk } from "./rag";
import { shiftDays, todayIso } from "./today";

/**
 * Everything the support chatbot may quote, built from the same data the screens use (alerts are added in the browser).
 * Written once with `t(...)` templates, so the same code produces English or Hindi chunks.
 */
export function buildKnowledge(now: number, t: TFn, lang: Lang): Chunk[] {
  const local = make(now, t);
  if (lang === "en") return local;
  // In another language every chunk is ALSO indexed by its English words, so English and Hindi questions both find it.
  const en = make(now, makeT("en"));
  return local.map((c, i) => ({ ...c, altTitle: en[i].title, keywords: `${c.keywords ?? ""} ${en[i].title} ${en[i].text}` }));
}

function make(now: number, t: TFn): Chunk[] {
  const chunks: Chunk[] = [];
  const add = (c: Chunk) => chunks.push(c);
  const lower = (s: unknown) => String(s).toLowerCase();

  /* ---- FAQ and site guide ---- */
  FAQ.forEach((f, i) => add({ id: `faq-${i}`, title: t(f.q), text: t(f.a), href: "/help", keywords: "help how faq" }));

  const guide: [string, string, string, string, Record<string, string | number>?][] = [
    ["Dashboard", "/dashboard", "The Fleet Analytics dashboard compares vehicle classes: highlights, material moved, fuel, trips, productive hours, efficiency scorecard, charts and a vehicle performance table. Filters: period, vehicle classes and vehicle.", "analytics kpi compare filter charts report"],
    ["Live tracking", "/dashboard?tab=tracking", "The Live tracking tab shows every truck on shift on a site map with trip number, status, payload, speed, ETA and GPS position. Tap a truck in the list or map to follow it.", "map gps trip tracking eta where"],
    ["Alerts page", "/alerts", "The Alerts page lists alerts critical first, with actual versus threshold, time since raised, location and next step. You can acknowledge, resolve, open details, filter by severity, type, equipment, status and time, and search.", "alert acknowledge resolve filter search"],
    ["Shipments & deliveries", "/shipments", "Shipments & deliveries shows coal and overburden movements with quantity, trucks, status, ETA and weighbridge slip.", "shipment delivery dispatch weighbridge"],
    ["Fleet management menu", "/fleet/vehicles", "Fleet management has All vehicles, Active trucks, Maintenance & repairs, Fuel & telematics, Driver directory and Route planning.", "menu sidebar navigation fleet"],
    ["Settings", "/settings", "Settings holds the alert thresholds (speed limit 30 km/h, coolant 95 °C, engine 100 °C, low fuel 15%, offline after 5 min), notification switches and units.", "threshold limit notification units configure"],
    ["Data range and assumptions", "/dashboard", "Mock data covers {range} for 33 vehicles across 5 classes and 3 shifts (A 06-14, B 14-22, C 22-06; night shift is about 10% slower). Fuel cost uses diesel at ₹{price} per litre. An alert is shown as overdue after 10 minutes.", "data assumption diesel price shift range mock", { range: fmtRange(DATA_START, DATA_END, t), price: DIESEL_PRICE_PER_L }],
    ["Metric definitions", "/dashboard", "Fuel per tonne = litres / tonnes. Fuel per km = litres / km. Utilisation = productive hours / scheduled hours. Payload per trip = tonnes / trips. Tonnes per productive hour = tonnes / productive hours. Ratios are computed from totals, not averaged per vehicle. Vehicles are flagged when utilisation is under 75% or fuel per tonne is 12% above the class average.", "definition formula calculate utilisation efficiency flag meaning"],
  ];
  guide.forEach(([title, href, text, keywords, params]) => add({ id: `guide-${title}`, title: t(title), text: t(text, params), href, keywords }));

  /* ---- Fleet ---- */
  add({
    id: "fleet-summary",
    title: t("Fleet overview"),
    text: t("The fleet has 33 vehicles in 5 classes: {list}.", {
      list: ALL_CLASSES.map((c) => t("{name} ({n} vehicles, {cap} t payload)", { name: CLASS_CONFIG[c].label, n: CLASS_CONFIG[c].count, cap: CLASS_CONFIG[c].capacityT })).join(", "),
    }),
    href: "/fleet/vehicles",
    keywords: "how many vehicles trucks classes capacity fleet size",
  });
  vehicleRows(now).forEach((r) =>
    add({
      id: `veh-${r.id}`,
      title: t(String(r.vehicle)),
      text: t("{vehicle} is a {cls} ({model}, {cap} payload). Status: {status}. Utilisation {util}, fuel {fuel}, {trips} trips and {eng} engine hours (last 7 days).", {
        vehicle: String(r.vehicle), cls: String(r.class), model: String(r.vehicleSub), cap: String(r.capacity), status: String(r.status),
        util: String(r.utilisation), fuel: String(r.fuelPerT), trips: String(r.trips), eng: String(r.engineH),
      }),
      href: "/fleet/vehicles",
      keywords: "vehicle truck machine status utilisation",
    }),
  );

  /* ---- Analytics: today and last 7 days, per class ---- */
  const today = todayIso();
  const periods: [string, string, string, string][] = [
    ["today", "today", today, today],
    ["last7", "the last 7 days", shiftDays(today, -6), today],
  ];
  for (const [key, label, from, to] of periods) {
    const d = buildDashboard({ from, to, classes: ALL_CLASSES, vehicle: null }, t);
    d.summaries.forEach((s) =>
      add({
        id: `stats-${key}-${s.cls}`,
        title: `${s.label} ${t(label)}`,
        text: t(
          "{cls} {period} ({range}): {trips} trips, {payload} t moved, {fuel} L fuel, {lpt} L/t, {ppt} t per trip, {km} km, utilisation {util}, {prod} productive hours, fuel cost {cost}.",
          {
            cls: s.label, period: t(label), range: fmtRange(from, to, t), trips: fmt0(s.totals.trips), payload: fmt0(s.totals.payloadT),
            fuel: fmt0(s.totals.fuelL), lpt: fmt2(s.derived.fuelPerTonne), ppt: fmt1(s.derived.payloadPerTrip), km: fmt0(s.totals.distanceKm),
            util: fmtPct(s.derived.utilisation), prod: fmt0(s.totals.productiveH), cost: fmtINR(s.derived.fuelCost),
          },
        ),
        href: `/dashboard?from=${from}&to=${to}&classes=${s.cls}`,
        keywords: `production totals performance fuel payload trips efficiency ${label}`,
      }),
    );
  }
  const compare = buildDashboard({ from: shiftDays(today, -6), to: today, classes: ["coal-dumper", "ob-dumper"], vehicle: null }, t);
  add({
    id: "compare",
    title: t("Coal Dumper vs OB Dumper comparison"),
    text: compare.insights.map((i) => `${i.title}: ${i.body}`).join(" "),
    href: `/dashboard?classes=coal-dumper,ob-dumper&from=${shiftDays(today, -6)}&to=${today}`,
    keywords: "compare comparison versus difference gap better worse outlier highlights insight",
  });

  /* ---- Active trucks ---- */
  const ts = activeTruckStats(now);
  add({
    id: "trucks-summary",
    title: t("Active trucks overview"),
    text: t("{total} trucks are on shift: {moving} on the road (hauling or returning), {site} at loading or dump points and {lost} with no GPS signal. Average fill of hauling trucks is {fill} of capacity.", {
      total: ts.total, moving: ts.moving, site: ts.atSite, lost: ts.lost, fill: fmtPct(ts.avgFill),
    }),
    href: "/fleet/active-trucks",
    keywords: "how many trucks active running moving on road offline no signal on shift",
  });
  activeTruckRows(now).forEach((r) =>
    add({
      id: `trip-${r.id}`,
      title: t("{truck} live trip", { truck: String(r.truck) }),
      text: t("{truck} is {status} on {route} ({material}). Payload {payload}, speed {speed}, leg ETA {eta}, last ping {ping}. Operator {op}. Trip {trip}.", {
        truck: String(r.truck), status: t(String(r.status)).toLowerCase(), route: String(r.route), material: String(r.material), payload: String(r.payload),
        speed: String(r.speed), eta: String(r.eta), ping: String(r.lastPing), op: String(r.operator), trip: String(r.truckSub),
      }),
      href: String(r.href),
      keywords: "live trip where eta gps position tracking operator driver",
    }),
  );
  const offline = activeTruckRows(now).filter((r) => r.status === "No signal");
  add({
    id: "trucks-offline",
    title: t("Trucks with no signal"),
    text: offline.length
      ? t("Trucks with no GPS signal: {list}.", { list: offline.map((r) => t("{truck} (last ping {ping})", { truck: String(r.truck), ping: String(r.lastPing) })).join(", ") })
      : t("All trucks are reporting GPS."),
    href: "/fleet/active-trucks",
    keywords: "offline no signal lost communication not reporting which trucks",
  });

  /* ---- Maintenance ---- */
  const js = jobStats();
  add({
    id: "maint-summary",
    title: t("Maintenance overview"),
    text: t("{open} work orders are open ({prog} in progress, {over} overdue) with {down} h of planned downtime. Estimated cost of all listed orders is {cost}.", {
      open: js.open, prog: js.inProgress, over: js.overdue, down: js.downtimeH, cost: fmtINR(js.costInr),
    }),
    href: "/fleet/maintenance",
    keywords: "maintenance repair work orders overdue open downtime workshop how many",
  });
  const overdue = JOBS.filter((j) => j.status === "Overdue");
  add({
    id: "maint-overdue",
    title: t("Overdue maintenance"),
    text: overdue.length
      ? t("Overdue work orders: {list}.", { list: overdue.map((j) => t("{id} {vehicle} ({task}, due {due})", { id: j.id, vehicle: j.vehicle, task: j.task, due: j.due })).join("; ") })
      : t("No work orders are overdue."),
    href: "/fleet/maintenance",
    keywords: "overdue late maintenance repair behind",
  });
  jobRows().forEach((r) =>
    add({
      id: `wo-${r.id}`,
      title: String(r.order),
      text: t("{order} on {vehicle}: {task}. {type}, {priority} priority, {status}, due {due}, downtime {down}, estimated {cost}, at {bay}.", {
        order: String(r.order), vehicle: String(r.vehicle), task: String(r.orderSub), type: String(r.type), priority: String(r.priority), status: String(r.status),
        due: String(r.due), down: String(r.downtime), cost: String(r.cost), bay: String(r.bay),
      }),
      href: "/fleet/maintenance",
      keywords: "work order maintenance repair job",
    }),
  );

  /* ---- Shipments ---- */
  const ss = shipmentStats();
  add({
    id: "ship-summary",
    title: t("Shipments overview"),
    text: t(ss.delayed === 1
      ? "Today {sent} t has been dispatched: {transit} t is loading or in transit, {done} t is delivered and {n} shipment is delayed."
      : "Today {sent} t has been dispatched: {transit} t is loading or in transit, {done} t is delivered and {n} shipments are delayed.", {
      sent: fmt0(ss.dispatched), transit: fmt0(ss.inTransit), done: fmt0(ss.delivered), n: ss.delayed,
    }),
    href: "/shipments",
    keywords: "shipments deliveries dispatched delivered in transit delayed late coal tonnes today",
  });
  shipmentRows().forEach((r) =>
    add({
      id: `ship-${r.id}`,
      title: String(r.shipment),
      text: t("{id} ({material}) {route}: {qty} with {trucks}. Status {status}, {time}. Weighbridge slip {slip}.", {
        id: String(r.shipment), material: String(r.shipmentSub), route: String(r.route), qty: String(r.qty), trucks: String(r.trucks),
        status: String(r.status), time: String(r.time), slip: String(r.slip),
      }),
      href: "/shipments",
      keywords: "shipment delivery dispatch",
    }),
  );

  /* ---- Fuel & telematics ---- */
  const fs = fuelStats(now);
  add({
    id: "fuel-summary",
    title: t("Fuel and telematics overview"),
    text: t("Fleet fuel use over the last 7 days is {fuel} L costing {cost} (₹{price} per litre), {lpt} L per tonne. {low} vehicles have a low tank and {sig} have weak or lost GPS signal.", {
      fuel: fmt0(fs.fuelL), cost: fmtINR(fs.costInr), price: DIESEL_PRICE_PER_L, lpt: fmt2(fs.perT), low: fs.lowFuel, sig: fs.signalIssues,
    }),
    href: "/fleet/fuel-telematics",
    keywords: "fuel consumption diesel cost litres per tonne low tank signal telematics",
  });
  fuelRows(now).forEach((r) =>
    add({
      id: `fuel-${r.id}`,
      title: t("{vehicle} fuel", { vehicle: String(r.vehicle) }),
      text: t("{vehicle} fuel and telematics: tank {tank}, used {used} ({lpt}, cost {cost}) over 7 days, idle share {idle}, GPS signal {signal}, engine temperature {temp}, last ping {ping}.", {
        vehicle: String(r.vehicle), tank: String(r.fuelLevel), used: String(r.fuelUsed), lpt: String(r.fuelPerT), cost: String(r.cost),
        idle: String(r.idle), signal: String(r.signal), temp: String(r.engineTemp), ping: String(r.lastPing),
      }),
      href: "/fleet/fuel-telematics",
      keywords: "fuel tank level gps signal engine temperature telematics",
    }),
  );

  /* ---- Drivers (anonymous) ---- */
  const ds = driverStats();
  add({
    id: "drivers-summary",
    title: t("Driver directory overview"),
    text: t("The directory lists {total} drivers, {on} on shift now. Average safety score is {score}/100 and {exp} licences expire within 90 days. Drivers appear by anonymous alias only.", {
      total: ds.total, on: ds.onShift, score: ds.avgSafety.toFixed(0), exp: ds.expiring,
    }),
    href: "/fleet/drivers",
    keywords: "drivers operators how many on shift safety score licence expiring anonymous",
  });
  driverRows().forEach((r) =>
    add({
      id: `drv-${r.id}`,
      title: t(String(r.driver)),
      text: t("{driver} is {status}, assigned to {assigned}, {shift}, {exp} experience, safety score {safety}, licence valid till {licence}.", {
        driver: String(r.driver), status: t(String(r.status)).toLowerCase(), assigned: String(r.assigned), shift: String(r.shift),
        exp: String(r.experience), safety: String(r.safety), licence: String(r.licence),
      }),
      href: "/fleet/drivers",
      keywords: "driver operator who drives safety licence",
    }),
  );

  /* ---- Routes ---- */
  routePlans(now).forEach((r) =>
    add({
      id: `route-${r.id}`,
      title: t("Route {id}", { id: r.id }),
      text: t("Route {id} is a {material} haul from {from} to {to}, {km} km one way. {trucks} trucks are assigned, cycle time {cycle} min, {tph} trips per hour. Load: {load}.", {
        id: r.id, material: lower(t(r.material)), from: r.from, to: r.to, km: fmt1(r.km), trucks: r.trucks, cycle: fmt1(r.cycleMin),
        tph: fmt1(r.tripsPerHour), load: r.load,
      }),
      href: "/fleet/route-planning",
      keywords: "route road haul planning cycle time busy congestion",
    }),
  );

  return chunks;
}
