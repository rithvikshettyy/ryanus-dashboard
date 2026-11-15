"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { DateRange } from "react-day-picker";
import { CalendarDays, ChevronDown, Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Panel } from "@/components/ui/panel";
import { CLASS_CONFIG, ALL_CLASSES, DATA_END, DATA_START } from "@/lib/constants";
import { defaultFilters, filtersToQuery, type DashboardFilters } from "@/lib/filters";
import { fmtRange } from "@/lib/format";
import { shiftDays, todayIso } from "@/lib/today";
import type { VehicleClass } from "@/lib/types";
import { cn } from "@/lib/utils";

// "2026-11-13" <-> Date, using local-time parts (avoids the new Date("YYYY-MM-DD") UTC gotcha)
const toDate = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const toIso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function presets() {
  const today = todayIso();
  return [
    { label: "Today", from: today, to: today },
    { label: "Last 3 days", from: shiftDays(today, -2), to: today },
    { label: "Last 7 days", from: shiftDays(today, -6), to: today },
    { label: "Whole range", from: DATA_START, to: DATA_END },
  ];
}

export function FilterBar({
  filters,
  vehicles,
  contextLine,
}: {
  filters: DashboardFilters;
  vehicles: { id: string; cls: VehicleClass }[];
  contextLine: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  // useTransition keeps the old page on screen (no blank flash) while the server re-renders.
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateRange | undefined>();
  const [anchor, setAnchor] = useState<Date | null>(null);

  // URL is the single source of truth. replace (not push) so each click doesn't add a history entry.
  function apply(next: DashboardFilters) {
    const q = filtersToQuery(next);
    startTransition(() => router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false }));
  }

  function toggleClass(cls: VehicleClass) {
    const has = filters.classes.includes(cls);
    if (has && filters.classes.length === 1) return; // at least one class
    const classes = has ? filters.classes.filter((c) => c !== cls) : [...filters.classes, cls];
    const vehicleStillValid = filters.vehicle && vehicles.some((v) => v.id === filters.vehicle && classes.includes(v.cls));
    apply({ ...filters, classes, vehicle: vehicleStillValid ? filters.vehicle : null });
  }

  const isDefault = filtersToQuery(filters) === "";
  const today = todayIso();
  const periodLabel =
    filters.from === today && filters.to === today ? `Today · ${fmtRange(today, today)}` : fmtRange(filters.from, filters.to);
  const options = vehicles.filter((v) => filters.classes.includes(v.cls));

  return (
    <Panel aria-label="Filters" className="space-y-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-end">
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Period</p>
          <Popover
            open={open}
            onOpenChange={(o) => {
              setOpen(o);
              setDraft(undefined);
              setAnchor(null);
            }}
          >
            <PopoverTrigger
              render={<Button variant="outline" className="h-10 w-full justify-start gap-2 px-3 text-sm sm:w-60" />}
            >
              <CalendarDays className="text-muted-foreground" />
              <span className="num flex-1 text-left">{periodLabel}</span>
              <ChevronDown className="text-muted-foreground" />
            </PopoverTrigger>
            <PopoverContent align="start" className="w-[min(21rem,calc(100vw-1rem))] gap-0 p-0">
              <div className="flex flex-wrap gap-1.5 border-b p-2.5">
                {presets().map((p) => (
                  <Button
                    key={p.label}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      apply({ ...filters, from: p.from, to: p.to });
                      setOpen(false);
                    }}
                  >
                    {p.label}
                  </Button>
                ))}
              </div>
              <Calendar
                mode="range"
                defaultMonth={toDate(filters.from)}
                selected={draft ?? { from: toDate(filters.from), to: toDate(filters.to) }}
                disabled={{ before: toDate(DATA_START), after: toDate(DATA_END) }}
                // Two explicit clicks: 1st = start, 2nd = end (any order, same day = single day).
                onDayClick={(day) => {
                  if (!anchor) {
                    setAnchor(day);
                    setDraft({ from: day, to: day });
                    return;
                  }
                  const [a, b] = day < anchor ? [day, anchor] : [anchor, day];
                  apply({ ...filters, from: toIso(a), to: toIso(b) });
                  setAnchor(null);
                  setDraft(undefined);
                  setOpen(false);
                }}
              />
              <p className="border-t px-3 py-2 text-xs text-muted-foreground">
                {anchor ? "Now pick the end date (same day for a single day)." : `Data available ${fmtRange(DATA_START, DATA_END)}. Click a start date, then an end date.`}
              </p>
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground" id="class-label">
            Vehicle classes (pick 2 or more to compare)
          </p>
          <div role="group" aria-labelledby="class-label" className="flex flex-wrap gap-2">
            {ALL_CLASSES.map((cls) => {
              const on = filters.classes.includes(cls);
              return (
                <button
                  key={cls}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleClass(cls)}
                  className={cn(
                    "flex h-10 items-center gap-2 rounded-full border px-3.5 text-sm font-medium transition-colors",
                    on ? "border-foreground bg-foreground text-background" : "bg-card hover:bg-muted",
                  )}
                >
                  <span
                    className={cn("size-2.5 rounded-full", on && "ring-2 ring-background")}
                    style={{ background: CLASS_CONFIG[cls].color }}
                    aria-hidden
                  />
                  {CLASS_CONFIG[cls].label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="vehicle" className="text-xs font-medium text-muted-foreground">
            Vehicle
          </label>
          <div className="relative">
            <select
              id="vehicle"
              value={filters.vehicle ?? ""}
              onChange={(e) => apply({ ...filters, vehicle: e.target.value || null })}
              className="h-10 w-full appearance-none rounded-lg border bg-card pl-3 pr-9 text-sm transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring sm:w-44"
            >
              <option value="">All vehicles</option>
              {options.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.id}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-3 size-4 text-muted-foreground" aria-hidden />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t pt-3">
        <p className="min-w-0 flex-1 text-sm text-muted-foreground" aria-live="polite">
          {contextLine}
        </p>
        {pending && <Loader2 className="size-4 animate-spin text-muted-foreground" aria-label="Updating" />}
        <Button variant="ghost" className="h-10 gap-1.5" disabled={isDefault} onClick={() => apply(defaultFilters())}>
          <RotateCcw /> Reset
        </Button>
      </div>
    </Panel>
  );
}
