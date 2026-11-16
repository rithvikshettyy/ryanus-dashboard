"use client";

import { ChevronDown, Filter, MapPin, Truck } from "lucide-react";
import { useT } from "@/components/i18n-provider";
import { CLASS_CONFIG } from "@/lib/constants";
import type { Trip, TripStatus, TruckFlag } from "@/lib/tracking";
import { cn } from "@/lib/utils";
import { FlagChip, STATUS_CONFIG, TripStatusChip } from "./trip-status";

export type ListFilter = TripStatus | "all";

export function TripList({
  trips,
  selected,
  onSelect,
  flags,
  filter,
  onFilter,
}: {
  trips: Trip[];
  selected: string;
  onSelect: (truck: string) => void;
  flags: Record<string, TruckFlag>;
  filter: ListFilter;
  onFilter: (f: ListFilter) => void;
}) {
  const tr = useT();
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-3 flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl border bg-card text-primary shadow-xs">
          <Truck className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold leading-tight">{tr("Ongoing trips")}</h2>
          <p className="text-xs text-muted-foreground">{tr("{n} trucks · tap one to track it", { n: trips.length })}</p>
        </div>
        <div className="relative">
          <Filter className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" aria-hidden />
          <select
            aria-label={tr("Filter trips by status")}
            value={filter}
            onChange={(e) => onFilter(e.target.value as ListFilter)}
            className="h-10 appearance-none rounded-lg border bg-card pl-9 pr-8 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
          >
            <option value="all">{tr("All")}</option>
            {(Object.keys(STATUS_CONFIG) as TripStatus[])
              .filter((s) => s !== "completed")
              .map((s) => (
                <option key={s} value={s}>
                  {tr(STATUS_CONFIG[s].label)}
                </option>
              ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-3 size-4 text-muted-foreground" aria-hidden />
        </div>
      </div>

      <ul className="max-h-[420px] min-h-0 flex-1 space-y-2.5 overflow-y-auto pr-1 xl:max-h-none">
        {trips.length === 0 && (
          <li className="rounded-xl border border-dashed px-3 py-10 text-center text-sm text-muted-foreground">{tr("No trucks with this status right now.")}</li>
        )}
        {trips.map((t) => {
          const on = t.truck === selected;
          const flag = flags[t.truck];
          const overspeed = flag?.label.startsWith("Overspeed") ?? false;
          return (
            <li key={t.truck}>
              <button
                type="button"
                onClick={() => onSelect(t.truck)}
                aria-pressed={on}
                className={cn(
                  "w-full rounded-xl border bg-card p-3 text-left transition-shadow hover:shadow-md",
                  on && "border-primary ring-2 ring-primary/20",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">{tr("Trip number")}</p>
                    <p className="num truncate text-sm font-semibold">#{t.id}</p>
                  </div>
                  <TripStatusChip status={t.status} />
                </div>

                <div className="mt-2.5 flex items-center gap-2.5">
                  <span
                    className="flex size-9 shrink-0 items-center justify-center rounded-lg text-white"
                    style={{ background: t.status === "no-signal" ? "#9ca3af" : CLASS_CONFIG[t.cls].color }}
                  >
                    <Truck className="size-[18px]" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold leading-tight">{tr(t.truck)}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {tr(t.material)} · {t.payloadT.toFixed(0)} / {t.capacityT} t
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={cn("num text-sm font-semibold", overspeed && "text-bad")}>{t.speedKmh} km/h</p>
                    <p className="num text-xs text-muted-foreground">
                      {t.etaMin !== null && t.status !== "completed" ? tr("{n} min", { n: t.etaMin }) : "—"}
                    </p>
                  </div>
                </div>

                <p className="mt-2.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="size-2 shrink-0 rounded-full bg-[#1f9d6b]" aria-hidden />
                  <span className="truncate">{tr(t.from)}</span>
                  <span aria-hidden>→</span>
                  <MapPin className="size-3.5 shrink-0 text-primary" aria-hidden />
                  <span className="truncate">{tr(t.to)}</span>
                </p>

                {(t.status === "hauling" || t.status === "returning" || t.status === "no-signal") && (
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
                    <div className="h-full rounded-full bg-primary transition-[color,background-color,border-color,box-shadow,transform,opacity]" style={{ width: `${t.progress * 100}%` }} />
                  </div>
                )}

                {flag && (
                  <div className="mt-2.5 flex items-center justify-between gap-2">
                    <FlagChip flag={flag} />
                    {t.status === "no-signal" && (
                      <span className="text-xs text-muted-foreground">{tr("Last ping {n} min ago", { n: Math.floor(t.lastPingSec / 60) })}</span>
                    )}
                  </div>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
