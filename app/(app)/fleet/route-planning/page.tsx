import type { Metadata } from "next";
import { connection } from "next/server";
import { ArrowRight, Lightbulb, Route as RouteIcon, Timer, Truck } from "lucide-react";
import { ModulePage } from "@/components/modules/module-page";
import { StatStrip } from "@/components/modules/stat-strip";
import { Panel } from "@/components/ui/panel";
import { currentTime } from "@/lib/alerts";
import { fmt1 } from "@/lib/format";
import { routePlans, type RoutePlan } from "@/lib/fleet";
import { MAP_H, MAP_W } from "@/lib/tracking";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Route planning" };

const LOAD_STYLE: Record<RoutePlan["load"], string> = {
  Busy: "bg-bad-bg text-bad",
  Balanced: "bg-good-bg text-good",
  Light: "bg-info-bg text-info",
};

function RoutePreview({ r }: { r: RoutePlan }) {
  const line = r.points.map((p) => p.join(",")).join(" ");
  return (
    <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} className="h-36 w-full rounded-xl bg-muted/60" role="img" aria-label={`Sketch of route ${r.id}`}>
      <polyline points={line} fill="none" stroke="var(--primary)" strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" opacity={0.85} />
      <circle cx={r.fromXY[0]} cy={r.fromXY[1]} r={22} fill="var(--productive)" />
      <circle cx={r.toXY[0]} cy={r.toXY[1]} r={22} fill="var(--chart-2)" />
    </svg>
  );
}

export default async function RoutePlanningPage() {
  await connection();
  const plans = routePlans(currentTime());
  const busiest = [...plans].sort((a, b) => b.trucks / b.km - a.trucks / a.km)[0];
  const lightest = [...plans].sort((a, b) => a.trucks / a.km - b.trucks / b.km)[0];
  const totalTrucks = plans.reduce((s, p) => s + p.trucks, 0);
  const avgCycle = plans.reduce((s, p) => s + p.cycleMin, 0) / plans.length;

  return (
    <ModulePage title="Route planning" subtitle="Haul roads, cycle times and truck allocation">
      <StatStrip
        stats={[
          { label: "Haul roads", value: String(plans.length), hint: "3 coal · 2 overburden", icon: RouteIcon },
          { label: "Trucks allocated", value: String(totalTrucks), hint: "on a haul road now", icon: Truck, tone: "info" },
          { label: "Avg cycle time", value: `${fmt1(avgCycle)} min`, hint: "load, haul, dump, return", icon: Timer, tone: "warn" },
          { label: "Busiest road", value: busiest.id, hint: `${busiest.trucks} trucks · ${fmt1(busiest.km)} km`, icon: RouteIcon, tone: "bad" },
        ]}
      />

      <Panel className="flex items-start gap-3 bg-primary-soft/60">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-card text-primary">
          <Lightbulb className="size-[18px]" aria-hidden />
        </span>
        <p className="text-sm">
          <span className="font-semibold">Suggestion:</span> {busiest.id} ({busiest.from} to {busiest.to}) carries {busiest.trucks} trucks over {fmt1(busiest.km)} km.
          Moving one truck to {lightest.id} ({lightest.trucks} trucks over {fmt1(lightest.km)} km) would balance queues at the loading point.
        </p>
      </Panel>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {plans.map((r) => (
          <Panel key={r.id} hover className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="num flex size-9 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground">{r.id}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{r.material} haul</p>
                <p className="text-xs text-muted-foreground">{fmt1(r.km)} km one way</p>
              </div>
              <span className={cn("rounded-md px-2 py-1 text-xs font-medium", LOAD_STYLE[r.load])}>{r.load}</span>
            </div>

            <RoutePreview r={r} />

            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium">
              <span className="min-w-0 break-words">{r.from}</span>
              <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <span className="min-w-0 break-words">{r.to}</span>
            </p>

            <dl className="grid grid-cols-3 gap-2 border-t pt-3 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Trucks</dt>
                <dd className="num font-semibold">{r.trucks}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Cycle</dt>
                <dd className="num font-semibold">{fmt1(r.cycleMin)} min</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Trips / h</dt>
                <dd className="num font-semibold">{fmt1(r.tripsPerHour)}</dd>
              </div>
            </dl>
          </Panel>
        ))}
      </div>
    </ModulePage>
  );
}
