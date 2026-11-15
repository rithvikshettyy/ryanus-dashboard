import { currentTime } from "./alerts";
import { DATA_END, DATA_START } from "./constants";

const IST_OFFSET_MS = 330 * 60_000;

/** Today's date in IST as "YYYY-MM-DD", clamped to the range we have data for. */
export function todayIso(): string {
  const iso = new Date(currentTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
  return iso < DATA_START ? DATA_START : iso > DATA_END ? DATA_END : iso;
}

/** "2026-11-15" + (-6) -> "2026-11-09". UTC maths on purpose, so no timezone surprises. */
export function shiftDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}
