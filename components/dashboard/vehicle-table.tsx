"use client";

import { useMemo, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, ArrowUpDown, Flame, TrendingDown, Truck } from "lucide-react";
import { Panel, PanelHeader } from "@/components/ui/panel";
import type { VehicleRow } from "@/lib/analytics";
import { CLASS_CONFIG } from "@/lib/constants";
import { filtersToQuery, type DashboardFilters } from "@/lib/filters";
import { fmt0, fmt2, fmtPct } from "@/lib/format";
import { cn } from "@/lib/utils";

type SortKey = "id" | "trips" | "payloadT" | "fuelPerTonne" | "utilisation" | "flags";
type Dir = "asc" | "desc";

const COLS: { key: SortKey; label: string; align: "left" | "right" }[] = [
  { key: "id", label: "Vehicle", align: "left" },
  { key: "trips", label: "Trips", align: "right" },
  { key: "payloadT", label: "Payload (t)", align: "right" },
  { key: "fuelPerTonne", label: "Fuel (L/t)", align: "right" },
  { key: "utilisation", label: "Utilisation", align: "right" },
  { key: "flags", label: "Flags", align: "left" },
];

const flagCount = (v: VehicleRow) => Number(v.lowUtilisation) + Number(v.highFuel);

export function VehicleTable({ vehicles, filters }: { vehicles: VehicleRow[]; filters: DashboardFilters }) {
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  const [sort, setSort] = useState<{ key: SortKey; dir: Dir }>({ key: "payloadT", dir: "desc" });
  const [onlyFlagged, setOnlyFlagged] = useState(false);

  const flagged = vehicles.filter((v) => v.lowUtilisation || v.highFuel).length;

  const rows = useMemo(() => {
    const list = onlyFlagged ? vehicles.filter((v) => v.lowUtilisation || v.highFuel) : [...vehicles];
    const sign = sort.dir === "asc" ? 1 : -1;
    return list.sort((a, b) => {
      if (sort.key === "id") return a.id.localeCompare(b.id) * sign;
      if (sort.key === "flags") return (flagCount(a) - flagCount(b)) * sign;
      return (a[sort.key] - b[sort.key]) * sign;
    });
  }, [vehicles, sort, onlyFlagged]);

  function toggleSort(key: SortKey) {
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: key === "id" ? "asc" : "desc" }));
  }

  function focusVehicle(id: string) {
    const q = filtersToQuery({ ...filters, vehicle: filters.vehicle === id ? null : id });
    startTransition(() => router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false }));
  }

  return (
    <Panel>
      <PanelHeader
        icon={Truck}
        title="Vehicle performance"
        description={`${vehicles.length} vehicles. ${flagged} flagged: utilisation under 75% or fuel/t 12%+ above class average. Click a column to sort, a vehicle to focus the dashboard on it.`}
        actions={
          <button
            type="button"
            aria-pressed={onlyFlagged}
            onClick={() => setOnlyFlagged((v) => !v)}
            className={cn(
              "flex h-10 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors",
              onlyFlagged ? "border-foreground bg-foreground text-background" : "bg-card hover:bg-muted",
            )}
          >
            <Flame className="size-4" aria-hidden /> Flagged only ({flagged})
          </button>
        }
      />
      {/* Phones: sort picker + one card per vehicle (a 6-column table does not fit in 360px) */}
      <div className="md:hidden">
        <div className="mb-3 flex items-center gap-2">
          <label htmlFor="vt-sort" className="text-xs font-medium text-muted-foreground">
            Sort by
          </label>
          <select
            id="vt-sort"
            value={sort.key}
            onChange={(e) => setSort({ key: e.target.value as SortKey, dir: e.target.value === "id" ? "asc" : "desc" })}
            className="h-10 min-w-0 flex-1 rounded-lg border bg-card px-3 text-sm"
          >
            {COLS.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setSort((x) => ({ ...x, dir: x.dir === "asc" ? "desc" : "asc" }))}
            aria-label={sort.dir === "asc" ? "Ascending, tap for descending" : "Descending, tap for ascending"}
            className="flex size-10 items-center justify-center rounded-lg border bg-card"
          >
            {sort.dir === "asc" ? <ArrowUp className="size-4" /> : <ArrowDown className="size-4" />}
          </button>
        </div>
        {rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No flagged vehicles in this view.</p>
        ) : (
          <ul className="max-h-[520px] space-y-2 overflow-y-auto">
            {rows.map((v) => (
              <li key={v.id}>
                <button
                  type="button"
                  onClick={() => focusVehicle(v.id)}
                  aria-pressed={filters.vehicle === v.id}
                  className={cn(
                    "w-full rounded-xl border p-3 text-left transition-colors hover:bg-muted/60",
                    filters.vehicle === v.id && "border-primary bg-primary-soft",
                  )}
                >
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    <span className="size-2.5 shrink-0 rounded-full" style={{ background: CLASS_CONFIG[v.cls].color }} aria-hidden />
                    {v.id}
                  </span>
                  <span className="mt-2 grid grid-cols-4 gap-2 text-xs">
                    {[
                      ["Trips", fmt0(v.trips)],
                      ["Payload", `${fmt0(v.payloadT)} t`],
                      ["Fuel", `${fmt2(v.fuelPerTonne)} L/t`],
                      ["Util.", fmtPct(v.utilisation)],
                    ].map(([k, val]) => (
                      <span key={k}>
                        <span className="block text-muted-foreground">{k}</span>
                        <span className="num block text-[13px] font-semibold">{val}</span>
                      </span>
                    ))}
                  </span>
                  {(v.lowUtilisation || v.highFuel) && (
                    <span className="mt-2 flex flex-wrap gap-1.5">
                      {v.lowUtilisation && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-warn-bg px-2 py-0.5 text-xs font-medium text-warn">
                          <TrendingDown className="size-3" aria-hidden /> Low utilisation
                        </span>
                      )}
                      {v.highFuel && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-bad-bg px-2 py-0.5 text-xs font-medium text-bad">
                          <Flame className="size-3" aria-hidden /> High fuel/t
                        </span>
                      )}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="hidden max-h-[440px] overflow-auto rounded-lg border md:block">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="sticky top-0 bg-muted text-xs text-muted-foreground">
            <tr>
              {COLS.map((c) => {
                const active = sort.key === c.key;
                const Icon = !active ? ArrowUpDown : sort.dir === "asc" ? ArrowUp : ArrowDown;
                return (
                  <th
                    key={c.key}
                    scope="col"
                    aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
                    className={cn("p-0 font-medium", c.align === "right" ? "text-right" : "text-left")}
                  >
                    <button
                      type="button"
                      onClick={() => toggleSort(c.key)}
                      className={cn(
                        "inline-flex min-h-10 w-full items-center gap-1 px-3 transition-colors hover:text-foreground",
                        c.align === "right" && "justify-end",
                        active && "text-foreground",
                      )}
                    >
                      {c.label} <Icon className="size-3" aria-hidden />
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={COLS.length} className="px-3 py-8 text-center text-muted-foreground">
                  No flagged vehicles in this view.
                </td>
              </tr>
            )}
            {rows.map((v) => (
              <tr key={v.id} className={cn("border-t transition-colors hover:bg-muted/60", filters.vehicle === v.id && "bg-primary-soft")}>
                <td className="px-3 py-1">
                  <button
                    type="button"
                    onClick={() => focusVehicle(v.id)}
                    title={filters.vehicle === v.id ? "Show all vehicles" : `Focus dashboard on ${v.id}`}
                    className="flex min-h-10 items-center gap-2 font-medium hover:text-primary hover:underline"
                  >
                    <span className="size-2.5 rounded-full" style={{ background: CLASS_CONFIG[v.cls].color }} aria-hidden />
                    {v.id}
                  </button>
                </td>
                <td className="num px-3 py-2.5 text-right">{fmt0(v.trips)}</td>
                <td className="num px-3 py-2.5 text-right">{fmt0(v.payloadT)}</td>
                <td className="num px-3 py-2.5 text-right">{fmt2(v.fuelPerTonne)}</td>
                <td className="num px-3 py-2.5 text-right">{fmtPct(v.utilisation, 1)}</td>
                <td className="px-3 py-2.5">
                  <span className="flex flex-wrap gap-1.5">
                    {v.lowUtilisation && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-warn-bg px-2 py-0.5 text-xs font-medium text-warn">
                        <TrendingDown className="size-3" aria-hidden /> Low utilisation
                      </span>
                    )}
                    {v.highFuel && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-bad-bg px-2 py-0.5 text-xs font-medium text-bad">
                        <Flame className="size-3" aria-hidden /> High fuel/t
                      </span>
                    )}
                    {!v.lowUtilisation && !v.highFuel && <span className="text-xs text-muted-foreground">None</span>}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
