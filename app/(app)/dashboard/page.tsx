import type { Metadata } from "next";
import { SearchX } from "lucide-react";
import { DashboardTabs, type DashboardTab } from "@/components/dashboard/dashboard-tabs";
import { ExportButton } from "@/components/dashboard/export-button";
import { FilterBar } from "@/components/dashboard/filter-bar";
import { EfficiencyTable } from "@/components/dashboard/efficiency-table";
import { Insights } from "@/components/dashboard/insights";
import { KpiCards } from "@/components/dashboard/kpi-cards";
import { VehicleTable } from "@/components/dashboard/vehicle-table";
import {
  FuelByShiftChart, FuelEfficiencyChart, ShareChart, TimeSplitChart, TrendChart,
} from "@/components/dashboard/charts";
import { PageHeader } from "@/components/layout/page-header";
import { TrackingView } from "@/components/tracking/tracking-view";
import { Panel } from "@/components/ui/panel";
import { buildDashboard, type DashboardData } from "@/lib/analytics";
import { currentTime, loadAlerts } from "@/lib/alerts";
import { CLASS_CONFIG } from "@/lib/constants";
import { filtersToQuery, parseFilters, VEHICLES, type DashboardFilters } from "@/lib/filters";
import { csvEscape, fmtRange } from "@/lib/format";
import type { TFn } from "@/lib/i18n";
import { getT } from "@/lib/i18n/server";
import { TRACKED_TRUCKS, type TruckFlag } from "@/lib/tracking";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Fleet Analytics") };
}

type SP = Record<string, string | string[] | undefined>;

// Next 16: searchParams is a Promise. This is the App Router answer to getServerSideProps({ query }).
export default async function DashboardPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const t = await getT(); // language comes from the cookie
  const tab: DashboardTab = (Array.isArray(sp.tab) ? sp.tab[0] : sp.tab) === "tracking" ? "tracking" : "fleet";
  const filters = parseFilters(sp);
  const rawTruck = Array.isArray(sp.truck) ? sp.truck[0] : sp.truck;
  const truckParam = rawTruck && TRACKED_TRUCKS.includes(rawTruck) ? rawTruck : null; // only known trucks

  if (tab === "tracking") {
    const now = currentTime();
    return (
      <>
        <PageHeader title="Live Tracking" subtitle="Haul trips, GPS position and ETA by truck" />
        <div className="mx-auto max-w-[1400px] space-y-6 p-4 md:space-y-7 md:p-8">
          <DashboardTabs active="tracking" fleetQuery={filtersToQuery(filters)} />
          <TrackingView serverNow={now} flags={truckFlags(now)} initialTruck={truckParam} />
        </div>
      </>
    );
  }

  const data = buildDashboard(filters, t);

  return (
    <>
      <PageHeader
        title="Fleet Analytics"
        subtitle={t("{range} · fleet productivity and fuel efficiency", { range: fmtRange(filters.from, filters.to, t) })}
        actions={<ExportButton csv={buildCsv(data)} filename={`fleet-${filters.from}_${filters.to}.csv`} />}
      />
      <div className="mx-auto max-w-[1400px] space-y-6 p-4 md:space-y-7 md:p-8">
        <DashboardTabs active="fleet" fleetQuery={filtersToQuery(filters)} />
        <FilterBar
          filters={filters}
          vehicles={VEHICLES.map((v) => ({ id: v.id, cls: v.vehicleClass }))}
          contextLine={contextLine(filters, data, t)}
        />

        {data.empty ? (
          <Panel className="flex flex-col items-center gap-2 py-16 text-center">
            <SearchX className="size-8 text-muted-foreground" aria-hidden />
            <p className="font-semibold">{t("No records for these filters")}</p>
            <p className="text-sm text-muted-foreground">{t("Try a wider period or another class, or press Reset.")}</p>
          </Panel>
        ) : (
          <>
            <Insights insights={data.insights} />
            <KpiCards summaries={data.summaries} />

            <div className="grid gap-4 xl:grid-cols-2">
              <div className="min-w-0">
                <TrendChart data={data.trend} classes={filters.classes} />
              </div>
              <div className="min-w-0">
                <EfficiencyTable summaries={data.summaries} />
              </div>
            </div>

            <section aria-label={t("Fuel and efficiency")} className="space-y-4">
              <h2 className="text-sm font-semibold text-muted-foreground">{t("Fuel & efficiency")}</h2>
              <div className="grid gap-4 lg:grid-cols-3">
                <ShareChart share={data.share} classes={filters.classes} />
                <FuelByShiftChart data={data.trend.fuelL} classes={filters.classes} />
                <FuelEfficiencyChart trend={data.trend} classes={filters.classes} />
              </div>
            </section>

            <div className="grid gap-4 xl:grid-cols-5">
              <div className="min-w-0 xl:col-span-2">
                <TimeSplitChart split={data.timeSplit} />
              </div>
              <div className="min-w-0 xl:col-span-3">
                <VehicleTable vehicles={data.vehicles} filters={filters} />
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}

/** Open alerts -> one badge per truck, shown on the tracking list and map. */
function truckFlags(now: number): Record<string, TruckFlag> {
  const out: Record<string, TruckFlag> = {};
  const rank = { critical: 0, warning: 1, info: 2 } as const;
  for (const a of loadAlerts(now).filter((x) => x.status !== "resolved")) {
    const prev = out[a.fleetName]; // tracking list is keyed by fleet register name
    if (prev && rank[prev.severity] <= rank[a.severity]) continue;
    out[a.fleetName] = {
      severity: a.severity,
      label: a.type === "offline" ? "Offline" : `${a.title} ${a.metric.actual} ${a.metric.unit}`,
      title: a.type === "offline" ? "Offline" : a.title,
      actual: a.type === "offline" ? null : a.metric.actual,
      unit: a.metric.unit,
    };
  }
  return out;
}

function contextLine(f: DashboardFilters, d: DashboardData, t: TFn): string {
  const names = f.classes.map((c) => t(CLASS_CONFIG[c].label)).join(` ${t("vs")} `);
  const lead = t(f.classes.length > 1 ? "Comparing {names}" : "Showing {names}", { names });
  const days = t(d.context.days === 1 ? "{n} day" : "{n} days", { n: d.context.days });
  const fleet = f.vehicle ? t("{id} only", { id: f.vehicle }) : t("{counts} vehicles", { counts: d.context.vehicleCounts.join(" + ") });
  return [lead, fmtRange(f.from, f.to, t), days, t("{n} shifts", { n: d.context.shifts }), fleet].join(" · ");
}

function buildCsv(d: DashboardData): string {
  const head = [
    "Class", "Vehicles", "Trips", "Payload (t)", "Distance (km)", "Fuel (L)", "Productive h", "Idle h",
    "Breakdown h", "Payload/trip (t)", "Fuel/t (L)", "Fuel/km (L)", "t per productive h", "Utilisation (%)",
  ];
  const rows = d.summaries.map((s) => [
    CLASS_CONFIG[s.cls].label, s.vehicles, s.totals.trips, s.totals.payloadT.toFixed(0), s.totals.distanceKm.toFixed(0),
    s.totals.fuelL.toFixed(0), s.totals.productiveH.toFixed(1), s.totals.idleH.toFixed(1), s.totals.breakdownH.toFixed(1),
    s.derived.payloadPerTrip.toFixed(2), s.derived.fuelPerTonne.toFixed(3), s.derived.fuelPerKm.toFixed(3),
    s.derived.tonnesPerProdHour.toFixed(2), (s.derived.utilisation * 100).toFixed(1),
  ]);
  return [head, ...rows].map((r) => r.map(csvEscape).join(",")).join("\n");
}
