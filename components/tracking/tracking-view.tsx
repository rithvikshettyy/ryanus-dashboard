"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Crosshair } from "lucide-react";
import { Panel } from "@/components/ui/panel";
import { useNow } from "@/hooks/use-now";
import { CLASS_CONFIG, CLASS_IMAGE } from "@/lib/constants";
import { STATUS_ORDER, currentTrips, fmtClock, fmtDay, fmtGps, tripLog, type TruckFlag } from "@/lib/tracking";
import { cn } from "@/lib/utils";
import { SiteMap } from "./site-map";
import { TripList, type ListFilter } from "./trip-list";
import { TripStatusChip } from "./trip-status";
import { TripTable } from "./trip-table";

export function TrackingView({
  serverNow,
  flags,
  initialTruck,
}: {
  serverNow: number;
  flags: Record<string, TruckFlag>;
  initialTruck: string | null;
}) {
  // Ticks every second. Starts from the server time so the first paint matches the server HTML.
  const now = useNow(serverNow, 1000);
  const [selectedTruck, setSelectedTruck] = useState(initialTruck ?? "Coal Tipper 02"); // default: a truck with an open alert
  // A link like ?truck=ADT%2003 can arrive while this view is already mounted: adjust state during render.
  const [seenInitial, setSeenInitial] = useState(initialTruck);
  if (initialTruck !== seenInitial) {
    setSeenInitial(initialTruck);
    if (initialTruck) setSelectedTruck(initialTruck);
  }
  const [filter, setFilter] = useState<ListFilter>("all");

  const trips = useMemo(
    () => currentTrips(now).sort(
        (a, b) =>
          Number(Boolean(flags[b.truck])) - Number(Boolean(flags[a.truck])) || // trucks with open alerts first
          STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
          a.truck.localeCompare(b.truck),
      ),
    [now, flags],
  );
  const log = useMemo(() => tripLog(now), [now]);
  const visible = filter === "all" ? trips : trips.filter((t) => t.status === filter);
  const selected = trips.find((t) => t.truck === selectedTruck) ?? trips[0];
  const flag = flags[selected.truck];
  const overspeed = flag?.label.startsWith("Overspeed") ?? false;
  const underload = flag?.label.startsWith("Underload") ?? false;

  const stats = [
    { label: "Class", value: CLASS_CONFIG[selected.cls].label },
    { label: "Distance", value: `${selected.distanceKm.toFixed(1)} km` },
    {
      label: selected.status === "returning" ? "Back at loader in" : selected.status === "completed" ? "Arrived" : "Estimation",
      value: selected.etaMin !== null ? `${selected.etaMin} min` : "Unknown",
      sub: selected.arrivalAt && selected.status === "hauling" ? `Arrives ${fmtClock(selected.arrivalAt)} IST` : undefined,
    },
    { label: "Payload", value: `${selected.payloadT.toFixed(1)} t`, sub: `of ${selected.capacityT} t capacity`, bad: underload },
    { label: "Speed", value: `${selected.speedKmh} km/h`, sub: overspeed ? "Limit 30 km/h" : undefined, bad: overspeed },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-[400px_minmax(0,1fr)]">
        {/* On wide screens the list is absolutely positioned so it always matches the map panel's height */}
        <Panel className="relative min-h-[360px]">
          <div className="xl:absolute xl:inset-5">
            <TripList
              trips={visible}
              selected={selected.truck}
              onSelect={setSelectedTruck}
              flags={flags}
              filter={filter}
              onFilter={setFilter}
            />
          </div>
        </Panel>

        <Panel id="site-map" className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              {CLASS_IMAGE[selected.cls] && (
                <Image src={CLASS_IMAGE[selected.cls]!} alt={`${CLASS_CONFIG[selected.cls].label}`} width={72} height={40} className="h-10 w-auto object-contain" />
              )}
              <h2 className="text-base font-semibold">On the way</h2>
              <span className="text-sm text-muted-foreground">· {selected.truck}</span>
              <TripStatusChip status={selected.status} />
            </div>
            <p className="num text-sm text-muted-foreground">{fmtDay(now)}</p>
          </div>

          <SiteMap trips={trips} selected={selected} onSelect={setSelectedTruck} flags={flags} />

          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-5 sm:gap-0 sm:divide-x">
            {stats.map((s) => (
              <div key={s.label} className="sm:px-4 sm:first:pl-0">
                <dt className="text-xs text-muted-foreground">{s.label}</dt>
                <dd className={cn("num mt-0.5 text-base font-semibold leading-tight", s.bad && "text-bad")}>{s.value}</dd>
                {s.sub && <p className={cn("num text-xs", s.bad ? "text-bad" : "text-muted-foreground")}>{s.sub}</p>}
              </div>
            ))}
          </dl>

          <p className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg bg-muted/70 px-3 py-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Crosshair className="size-3.5" aria-hidden /> GPS <span className="num font-medium text-foreground">{fmtGps(selected.gps)}</span>
            </span>
            <span>
              Heading <span className="num font-medium text-foreground">{((Math.round(selected.heading) % 360) + 360) % 360}°</span>
            </span>
            <span>
              Last ping{" "}
              <span className={cn("num font-medium", selected.status === "no-signal" ? "text-bad" : "text-foreground")}>
                {selected.lastPingSec >= 60 ? `${Math.floor(selected.lastPingSec / 60)} min ago` : `${selected.lastPingSec} s ago`}
              </span>
            </span>
            <span>
              {selected.from} <span aria-hidden>→</span> {selected.to}
            </span>
          </p>
        </Panel>
      </div>

      <Panel>
        <TripTable trips={log} selected={selected.truck} onSelect={setSelectedTruck} />
      </Panel>
    </div>
  );
}
