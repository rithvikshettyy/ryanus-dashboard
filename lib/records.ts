import recordsJson from "@/data/shift-records.json";
import { TEMPLATE_END } from "./constants";
import { shiftDays, todayIso } from "./today";
import type { ShiftRecord } from "./types";

const TEMPLATE = recordsJson as unknown as ShiftRecord[];

// Cache per calendar day: remap once, reuse for every request that day.
let cache: { day: string; rows: ShiftRecord[] } | null = null;

/** Mock records with dates shifted so the newest stored day is today (IST). Auto-syncs with the calendar. */
export function getRecords(): ShiftRecord[] {
  const day = todayIso();
  if (cache?.day === day) return cache.rows;
  // days between the template's last day and today
  const [ty, tm, td] = TEMPLATE_END.split("-").map(Number);
  const [y, m, d] = day.split("-").map(Number);
  const offset = Math.round((Date.UTC(y, m - 1, d) - Date.UTC(ty, tm - 1, td)) / 86_400_000);
  const map = new Map<string, string>();
  const rows = TEMPLATE.map((r) => {
    let nd = map.get(r.date);
    if (!nd) map.set(r.date, (nd = shiftDays(r.date, offset)));
    return { ...r, date: nd };
  });
  cache = { day, rows };
  return rows;
}
