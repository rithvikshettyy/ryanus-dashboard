import { currentTime } from "./alerts";
import { DATA_DAYS } from "./constants";

const IST_OFFSET_MS = 330 * 60_000;

/** Today's date in IST as "YYYY-MM-DD". Always the real current date. */
export function todayIso(): string {
  return new Date(currentTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/** "2026-11-15" + (-6) -> "2026-11-09". UTC maths on purpose, so no timezone surprises. */
export function shiftDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** The data window rolls with the calendar: it always ends today and spans DATA_DAYS days. */
export function dataEnd(): string {
  return todayIso();
}
export function dataStart(): string {
  return shiftDays(todayIso(), -(DATA_DAYS - 1));
}
