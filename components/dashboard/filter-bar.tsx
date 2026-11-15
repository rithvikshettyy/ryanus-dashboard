"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { DateRange } from "react-day-picker";
import Image from "next/image";
import { CalendarDays, Check, ChevronDown, Loader2, RotateCcw, Truck } from "lucide-react";
import { useT } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Panel } from "@/components/ui/panel";
import { CLASS_CONFIG, CLASS_IMAGE, ALL_CLASSES, DATA_END, DATA_START } from "@/lib/constants";
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
  const t = useT();
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
    filters.from === today && filters.to === today ? t("Today · {range}", { range: fmtRange(today, today, t) }) : fmtRange(filters.from, filters.to, t);
  const options = vehicles.filter((v) => filters.classes.includes(v.cls));

  return (
    <Panel aria-label={t("Filters")} className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">{t("Period")}</p>
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
                    {t(p.label)}
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
                {anchor ? t("Now pick the end date (same day for a single day).") : t("Data available {range}. Click a start date, then an end date.", { range: fmtRange(DATA_START, DATA_END, t) })}
              </p>
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="vehicle" className="text-xs font-medium text-muted-foreground">
            {t("Vehicle")}
          </label>
          <div className="relative">
            <select
              id="vehicle"
              value={filters.vehicle ?? ""}
              onChange={(e) => apply({ ...filters, vehicle: e.target.value || null })}
              className="h-10 w-full appearance-none rounded-lg border bg-card pl-3 pr-9 text-sm transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring sm:w-44"
            >
              <option value="">{t("All vehicles")}</option>
              {options.map((v) => (
                <option key={v.id} value={v.id}>
                  {t(v.id)}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-3 size-4 text-muted-foreground" aria-hidden />
          </div>
        </div>
      </div>

      {/* Vehicle classes: each class is a photo tile you can switch on or off (pick 2 or more to compare) */}
      <div className="space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground" id="class-label">
          {t("Vehicle classes (pick 2 or more to compare)")}
        </p>
        <div
          role="group"
          aria-labelledby="class-label"
          className="no-scrollbar -mx-1 flex gap-2.5 overflow-x-auto px-1 pb-1 lg:grid lg:grid-cols-5 lg:overflow-visible"
        >
          {ALL_CLASSES.map((cls) => {
            const on = filters.classes.includes(cls);
            const cfg = CLASS_CONFIG[cls];
            const img = CLASS_IMAGE[cls];
            return (
              <button
                key={cls}
                type="button"
                aria-pressed={on}
                onClick={() => toggleClass(cls)}
                className={cn(
                  "relative flex w-36 shrink-0 flex-col items-center gap-1 rounded-2xl border-2 p-2.5 text-center transition-all lg:w-auto",
                  on ? "border-foreground bg-card shadow-md" : "border-border bg-card/60 hover:border-foreground/40 hover:bg-card",
                )}
              >
                <span
                  className={cn(
                    "absolute right-2 top-2 flex size-5 items-center justify-center rounded-full border-2 transition-colors",
                    on ? "border-foreground bg-foreground text-background" : "border-border bg-card",
                  )}
                  aria-hidden
                >
                  {on && <Check className="size-3" strokeWidth={3} />}
                </span>
                <span className={cn("flex h-16 w-full items-center justify-center transition-opacity", !on && "opacity-60")}>
                  {img ? (
                    <Image src={img} alt="" width={160} height={80} className="h-full w-auto max-w-full object-contain drop-shadow-sm" />
                  ) : (
                    <Truck className="size-8 text-muted-foreground" aria-hidden />
                  )}
                </span>
                <span className="flex items-center gap-1.5 text-sm font-semibold">
                  <span className="size-2.5 shrink-0 rounded-full" style={{ background: cfg.color }} aria-hidden />
                  {t(cfg.label)}
                </span>
                <span className="num text-[11px] text-muted-foreground">
                  {t("{n} vehicles · {c} t", { n: cfg.count, c: cfg.capacityT })}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t pt-3">
        <p className="min-w-0 flex-1 text-sm text-muted-foreground" aria-live="polite">
          {contextLine}
        </p>
        {pending && <Loader2 className="size-4 animate-spin text-muted-foreground" aria-label={t("Updating")} />}
        <Button variant="ghost" className="h-10 gap-1.5" disabled={isDefault} onClick={() => apply(defaultFilters())}>
          <RotateCcw /> {t("Reset")}
        </Button>
      </div>
    </Panel>
  );
}
