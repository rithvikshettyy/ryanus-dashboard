"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown, Download, PackageSearch, Search, X } from "lucide-react";
import { useT } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { useDebounce } from "@/hooks/use-debounce";
import { csvEscape } from "@/lib/format";
import type { TableColumn, TableRow, Tone } from "@/lib/table";
import { cn } from "@/lib/utils";

const TONE: Record<Tone, string> = {
  good: "bg-good-bg text-good",
  bad: "bg-bad-bg text-bad",
  warn: "bg-warn-bg text-warn",
  info: "bg-info-bg text-info",
  muted: "bg-muted text-muted-foreground",
};

function Badge({ tone, children }: { tone?: Tone; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center rounded-md px-2 py-1 text-xs font-medium whitespace-nowrap", TONE[tone ?? "muted"])}>
      {children}
    </span>
  );
}

const MOBILE_PAGE = 12;

interface Props {
  columns: TableColumn[];
  rows: TableRow[];
  /** Column key used for the filter chips (e.g. "status"). */
  filterKey?: string;
  searchPlaceholder?: string;
  exportName?: string;
  emptyText?: string;
}

/**
 * One reusable list for every sidebar page: search (debounced), filter chips, sortable columns,
 * CSV export. Desktop = table, mobile = stacked cards (no sideways scrolling on a phone).
 */
export function DataTable({ columns, rows, filterKey, searchPlaceholder = "Search", exportName = "export", emptyText = "Nothing matches these filters." }: Props) {
  const t = useT();
  // Cell values arrive as English text from the server: translate strings at render time, leave numbers alone
  const tv = (v: string | number | undefined) => (typeof v === "string" ? t(v) : v);
  const [query, setQuery] = useState("");
  const [chip, setChip] = useState("All");
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(null);
  const [mobileLimit, setMobileLimit] = useState(MOBILE_PAGE); // phones render cards, so show them in pages
  const q = useDebounce(query, 300).trim().toLowerCase();

  const chips = useMemo(() => {
    if (!filterKey) return [];
    const counts = new Map<string, number>();
    for (const r of rows) counts.set(String(r[filterKey]), (counts.get(String(r[filterKey])) ?? 0) + 1);
    return [["All", rows.length] as const, ...Array.from(counts.entries())];
  }, [rows, filterKey]);

  const visible = useMemo(() => {
    let out = rows.filter((r) => {
      if (filterKey && chip !== "All" && String(r[filterKey]) !== chip) return false;
      if (!q) return true;
      return Object.values(r).some((v) => typeof v === "string" && (v.toLowerCase().includes(q) || t(v).toLowerCase().includes(q)));
    });
    if (sort) {
      const { key, dir } = sort;
      const val = (r: TableRow) => r[`${key}Sort`] ?? r[key] ?? "";
      out = [...out].sort((a, b) => {
        const x = val(a);
        const y = val(b);
        const c = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y));
        return dir === "asc" ? c : -c;
      });
    }
    return out;
  }, [rows, filterKey, chip, q, sort, t]);

  // Back to the first page whenever the list changes (adjust state during render, no effect needed)
  const listKey = `${q}|${chip}|${sort?.key}|${sort?.dir}`;
  const [seenKey, setSeenKey] = useState(listKey);
  if (listKey !== seenKey) {
    setSeenKey(listKey);
    setMobileLimit(MOBILE_PAGE);
  }
  const mobileRows = visible.slice(0, mobileLimit);

  const toggleSort = (key: string) =>
    setSort((s) => (s?.key !== key ? { key, dir: "asc" } : s.dir === "asc" ? { key, dir: "desc" } : null));

  const exportCsv = () => {
    const head = columns.map((c) => c.label);
    const body = visible.map((r) => columns.map((c) => csvEscape(String(r[c.key] ?? ""))));
    const csv = [head.map(csvEscape), ...body].map((r) => r.join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${exportName}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const primary = columns.find((c) => c.primary) ?? columns[0];
  const rest = columns.filter((c) => c !== primary);
  const badgeCols = rest.filter((c) => c.badge);
  const plainCols = rest.filter((c) => !c.badge);

  const cell = (r: TableRow, c: TableColumn) =>
    c.badge ? <Badge tone={r[`${c.key}Tone`] as Tone | undefined}>{tv(r[c.key])}</Badge> : (
      <span className={cn(c.numeric && "num", r[`${c.key}Tone`] && !c.badge && TONE[r[`${c.key}Tone`] as Tone].split(" ")[1])}>{tv(r[c.key])}</span>
    );

  const primaryCell = (r: TableRow) => {
    const inner = (
      <span className="flex items-center gap-3">
        {typeof r.image === "string" && (
          <span className="flex h-10 w-14 shrink-0 items-center justify-center rounded-lg bg-muted/60">
            <Image src={r.image} alt="" width={56} height={32} className="h-8 w-auto object-contain" />
          </span>
        )}
        <span className="min-w-0">
          <span className="block font-medium">{tv(r[primary.key])}</span>
          {r[`${primary.key}Sub`] && <span className="block text-xs text-muted-foreground">{tv(r[`${primary.key}Sub`])}</span>}
        </span>
      </span>
    );
    return r.href ? (
      <Link href={r.href} className="block rounded-md hover:text-primary focus-visible:outline-2 focus-visible:outline-primary">
        {inner}
      </Link>
    ) : (
      inner
    );
  };

  return (
    <Panel className="p-0 md:p-0">
      <div className="flex flex-col gap-3 border-b p-4 md:p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t(searchPlaceholder)}
              aria-label={t(searchPlaceholder)}
              className="h-10 w-full rounded-lg border bg-background pl-9 pr-9 text-sm outline-none transition-shadow placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary/30"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label={t("Clear search")}
                className="absolute right-1 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
          <Button variant="outline" className="h-10 gap-2" onClick={exportCsv}>
            <Download className="size-4" aria-hidden /> {t("Export CSV")}
          </Button>
        </div>

        {chips.length > 0 && (
          <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="group" aria-label={t("Filter")}>
            {chips.map(([label, count]) => (
              <button
                key={label}
                type="button"
                onClick={() => setChip(label)}
                aria-pressed={chip === label}
                className={cn(
                  "flex h-9 shrink-0 items-center gap-2 rounded-full border px-3.5 text-sm font-medium transition-colors",
                  chip === label ? "border-primary bg-primary-soft text-primary" : "text-muted-foreground hover:bg-muted",
                )}
              >
                {t(label)}
                <span className="num text-xs opacity-70">{count}</span>
              </button>
            ))}
          </div>
        )}

        {/* Phones have no column headers to tap, so sorting gets its own select + direction button */}
        <div className="flex items-center gap-2 md:hidden">
          <label htmlFor="mobile-sort" className="sr-only">{t("Sort by")}</label>
          <select
            id="mobile-sort"
            value={sort?.key ?? ""}
            onChange={(e) => setSort(e.target.value ? { key: e.target.value, dir: sort?.dir ?? "asc" } : null)}
            className="h-10 min-w-0 flex-1 rounded-lg border bg-background px-3 text-sm"
          >
            <option value="">{t("Sort by: default order")}</option>
            {columns.map((c) => (
              <option key={c.key} value={c.key}>{t("Sort by: {label}", { label: t(c.label) })}</option>
            ))}
          </select>
          <Button
            variant="outline"
            className="size-10 shrink-0 p-0"
            disabled={!sort}
            aria-label={sort?.dir === "desc" ? t("Descending, tap for ascending") : t("Ascending, tap for descending")}
            onClick={() => setSort((s) => (s ? { ...s, dir: s.dir === "asc" ? "desc" : "asc" } : s))}
          >
            {sort?.dir === "desc" ? <ArrowDown className="size-4" aria-hidden /> : <ArrowUp className="size-4" aria-hidden />}
          </Button>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-4 py-14 text-center">
          <PackageSearch className="size-8 text-muted-foreground" aria-hidden />
          <p className="font-semibold">{t("No results")}</p>
          <p className="text-sm text-muted-foreground">{t(emptyText)}</p>
          <Button variant="outline" onClick={() => { setQuery(""); setChip("All"); }}>
            {t("Clear filters")}
          </Button>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  {columns.map((c) => {
                    const active = sort?.key === c.key;
                    const Icon = !active ? ArrowUpDown : sort.dir === "asc" ? ArrowUp : ArrowDown;
                    return (
                      <th key={c.key} scope="col" aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"} className={cn("px-5 py-2.5 font-medium", c.numeric && "text-right")}>
                        <button
                          type="button"
                          onClick={() => toggleSort(c.key)}
                          className={cn("inline-flex h-8 items-center gap-1.5 rounded-md hover:text-foreground", active && "text-foreground", c.numeric && "flex-row-reverse")}
                        >
                          {t(c.label)}
                          <Icon className="size-3.5" aria-hidden />
                        </button>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {visible.map((r) => (
                  <tr key={r.id} className="border-b last:border-0 transition-colors hover:bg-muted/50">
                    {columns.map((c) => (
                      <td key={c.key} className={cn("px-5 py-3 align-middle", c.numeric && "text-right", c === primary && "min-w-44")}>
                        {c === primary ? primaryCell(r) : cell(r, c)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <ul className="divide-y md:hidden">
            {mobileRows.map((r) => (
              <li key={r.id} className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 text-sm">{primaryCell(r)}</div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    {badgeCols.map((c) => (
                      <span key={c.key}>{cell(r, c)}</span>
                    ))}
                  </div>
                </div>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  {plainCols.map((c) => (
                    // long values (routes, tasks) get the full row and wrap instead of being cut off
                    <div key={c.key} className={cn("min-w-0", String(r[c.key] ?? "").length > 16 && "col-span-2")}>
                      <dt className="text-xs text-muted-foreground">{t(c.label)}</dt>
                      <dd className="break-words font-medium">{cell(r, c)}</dd>
                    </div>
                  ))}
                </dl>
              </li>
            ))}
          </ul>
          {visible.length > mobileLimit && (
            <div className="border-t p-3 md:hidden">
              <Button variant="outline" className="h-11 w-full" onClick={() => setMobileLimit((n) => n + MOBILE_PAGE)}>
                {t("Show {n} more ({left} left)", { n: Math.min(MOBILE_PAGE, visible.length - mobileLimit), left: visible.length - mobileLimit })}
              </Button>
            </div>
          )}
        </>
      )}

      <p className="border-t px-4 py-2.5 text-xs text-muted-foreground md:px-5" aria-live="polite">
        {t("Showing {n} of {m}", { n: visible.length, m: rows.length })}
      </p>
    </Panel>
  );
}
