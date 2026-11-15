"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown, Download, Filter, PackageSearch, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useDebounce } from "@/hooks/use-debounce";
import { CLASS_CONFIG } from "@/lib/constants";
import { csvEscape } from "@/lib/format";
import { STATUS_ORDER, fmtClock, type Trip, type TripStatus } from "@/lib/tracking";
import { cn } from "@/lib/utils";
import { STATUS_CONFIG, TripStatusChip } from "./trip-status";

type SortKey = "status" | "id" | "truck" | "material" | "startedAt" | "arrivalAt" | "payloadT" | "distanceKm";
type Dir = "asc" | "desc";

const COLS: { key: SortKey; label: string; align?: "right" }[] = [
  { key: "id", label: "Trip ID" },
  { key: "truck", label: "Truck" },
  { key: "material", label: "Material" },
  { key: "startedAt", label: "Started" },
  { key: "arrivalAt", label: "Arrival" },
  { key: "payloadT", label: "Payload", align: "right" },
  { key: "distanceKm", label: "Distance", align: "right" },
  { key: "status", label: "Status" },
];

export function TripTable({
  trips,
  selected,
  onSelect,
}: {
  trips: Trip[];
  selected: string;
  onSelect: (truck: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<TripStatus | "all">("all");
  const [sort, setSort] = useState<{ key: SortKey; dir: Dir }>({ key: "status", dir: "asc" });
  const [mobileLimit, setMobileLimit] = useState(8); // phones render cards, so show them in pages
  const debounced = useDebounce(search, 300); // wait 300 ms after typing stops

  const rows = useMemo(() => {
    const q = debounced.trim().toLowerCase();
    const sign = sort.dir === "asc" ? 1 : -1;
    return trips
      .filter((t) => status === "all" || t.status === status)
      .filter((t) => !q || `${t.id} ${t.truck} ${t.material} ${t.from} ${t.to}`.toLowerCase().includes(q))
      .sort((a, b) => {
        let d: number;
        if (sort.key === "status") d = STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || b.startedAt - a.startedAt;
        else if (sort.key === "arrivalAt") d = (a.arrivalAt ?? 0) - (b.arrivalAt ?? 0);
        else {
          const x = a[sort.key];
          const y = b[sort.key];
          d = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y));
        }
        return d * sign;
      });
  }, [trips, debounced, status, sort]);

  function toggleSort(key: SortKey) {
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));
  }

  function exportCsv() {
    const head = ["Trip ID", "Truck", "Material", "From", "To", "Started (IST)", "Arrival (IST)", "Payload (t)", "Distance (km)", "Status"];
    const lines = rows.map((t) => [
      t.id, t.truck, t.material, t.from, t.to, fmtClock(t.startedAt), t.arrivalAt ? fmtClock(t.arrivalAt) : "",
      t.payloadT.toFixed(1), t.distanceKm.toFixed(1), STATUS_CONFIG[t.status].label,
    ]);
    const csv = [head, ...lines].map((r) => r.map(csvEscape).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "trip-log.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Trip log exported", { description: `${rows.length} trips` });
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl border bg-card text-primary shadow-xs">
          <PackageSearch className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold leading-tight">Trip log</h2>
          <p className="text-xs text-muted-foreground">
            Current and last completed trip per truck · {rows.length} shown · times in IST
          </p>
        </div>
        <div className="relative w-full sm:w-56">
          <Search className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" aria-hidden />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search trip, truck, site"
            aria-label="Search trips"
            className="h-10 w-full rounded-lg border bg-card pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground hover:bg-muted/50 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
          />
        </div>
        <div className="relative">
          <Filter className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" aria-hidden />
          <select
            aria-label="Filter log by status"
            value={status}
            onChange={(e) => setStatus(e.target.value as TripStatus | "all")}
            className="h-10 appearance-none rounded-lg border bg-card pl-9 pr-8 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
          >
            <option value="all">All statuses</option>
            {(Object.keys(STATUS_CONFIG) as TripStatus[]).map((s) => (
              <option key={s} value={s}>
                {STATUS_CONFIG[s].label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-3 size-4 text-muted-foreground" aria-hidden />
        </div>
        <Button variant="outline" className="h-10 gap-2 px-3.5" onClick={exportCsv}>
          <Download /> Export
        </Button>
      </div>

      {/* Phones: one card per trip instead of a 900px wide table */}
      <ul className="space-y-2 md:hidden">
        {rows.length === 0 && <li className="rounded-xl border py-10 text-center text-sm text-muted-foreground">No trips match these filters.</li>}
        {rows.slice(0, mobileLimit).map((t) => (
          <li key={`m-${t.truck}-${t.id}`}>
            <button
              type="button"
              onClick={() => {
                onSelect(t.truck);
                document.getElementById("site-map")?.scrollIntoView({ behavior: "smooth", block: "center" });
              }}
              className={cn(
                "w-full rounded-xl border p-3 text-left transition-colors hover:bg-muted/60",
                t.truck === selected && "border-primary bg-primary-soft",
              )}
            >
              <span className="flex items-start justify-between gap-2">
                <span className="min-w-0">
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    <span className="size-2.5 shrink-0 rounded-full" style={{ background: CLASS_CONFIG[t.cls].color }} aria-hidden />
                    {t.truck}
                  </span>
                  <span className="num block text-xs text-muted-foreground">#{t.id}</span>
                </span>
                <TripStatusChip status={t.status} />
              </span>
              <span className="mt-2 block text-xs text-muted-foreground">
                {t.from} <span aria-hidden>→</span> {t.to}
              </span>
              <span className="mt-2 grid grid-cols-4 gap-2 text-xs">
                {[
                  ["Started", fmtClock(t.startedAt)],
                  ["Arrival", t.arrivalAt ? fmtClock(t.arrivalAt) : t.status === "no-signal" ? "Unknown" : "Arrived"],
                  ["Payload", `${t.payloadT.toFixed(1)} t`],
                  ["Distance", `${t.distanceKm.toFixed(1)} km`],
                ].map(([k, v]) => (
                  <span key={k}>
                    <span className="block text-muted-foreground">{k}</span>
                    <span className="num block text-[13px] font-semibold">{v}</span>
                  </span>
                ))}
              </span>
            </button>
          </li>
        ))}
        {rows.length > mobileLimit && (
          <li>
            <Button variant="outline" className="h-11 w-full" onClick={() => setMobileLimit((n) => n + 8)}>
              Show 8 more ({rows.length - mobileLimit} left)
            </Button>
          </li>
        )}
      </ul>

      <div className="hidden max-h-[460px] overflow-auto rounded-xl border md:block">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="sticky top-0 z-10 bg-muted text-xs uppercase tracking-wide text-muted-foreground">
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
                        "inline-flex min-h-11 w-full items-center gap-1 px-3 uppercase transition-colors hover:text-foreground",
                        c.align === "right" && "justify-end",
                        active && "text-foreground",
                      )}
                    >
                      {c.label} <Icon className="size-3" aria-hidden />
                    </button>
                  </th>
                );
              })}
              <th scope="col" className="px-3 text-left font-medium">
                Route
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={COLS.length + 1} className="px-3 py-12 text-center text-muted-foreground">
                  No trips match these filters.
                </td>
              </tr>
            )}
            {rows.map((t) => (
              <tr
                key={`${t.truck}-${t.id}`}
                onClick={() => {
                  onSelect(t.truck);
                  document.getElementById("site-map")?.scrollIntoView({ behavior: "smooth", block: "center" });
                }}
                className={cn(
                  "cursor-pointer border-t transition-colors hover:bg-muted/60",
                  t.truck === selected && "bg-primary-soft hover:bg-primary-soft",
                )}
              >
                <td className="num whitespace-nowrap px-3 py-3 font-medium">#{t.id}</td>
                <td className="px-3 py-3">
                  <span className="flex items-center gap-2 whitespace-nowrap">
                    <span className="size-2.5 rounded-full" style={{ background: CLASS_CONFIG[t.cls].color }} aria-hidden />
                    {t.truck}
                  </span>
                </td>
                <td className="px-3 py-3">{t.material}</td>
                <td className="num px-3 py-3">{fmtClock(t.startedAt)}</td>
                <td className="num px-3 py-3">
                  {t.arrivalAt ? (
                    <>
                      {fmtClock(t.arrivalAt)}
                      {t.status === "hauling" && <span className="ml-1 text-xs text-muted-foreground">ETA</span>}
                    </>
                  ) : t.status === "no-signal" ? (
                    <span className="text-bad">Unknown</span>
                  ) : (
                    <span className="text-muted-foreground">Arrived</span>
                  )}
                </td>
                <td className="num px-3 py-3 text-right">{t.payloadT.toFixed(1)} t</td>
                <td className="num px-3 py-3 text-right">{t.distanceKm.toFixed(1)} km</td>
                <td className="px-3 py-3">
                  <TripStatusChip status={t.status} />
                </td>
                <td className="px-3 py-3 text-muted-foreground">
                  {t.from} <span aria-hidden>→</span> {t.to}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
