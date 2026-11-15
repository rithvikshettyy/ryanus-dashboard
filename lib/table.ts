/** Shared shape for every list page (vehicles, drivers, maintenance...). Plain data, safe to pass from server to client. */
export type Tone = "good" | "bad" | "warn" | "info" | "muted";
export type Cell = string | number;

export interface TableRow {
  id: string;
  href?: string; // makes the primary cell a link
  [key: string]: Cell | undefined; // `<col>Tone` = badge colour, `<col>Sort` = number used for sorting
}

export interface TableColumn {
  key: string;
  label: string;
  /** Show as a coloured badge (tone comes from row[`${key}Tone`]). */
  badge?: boolean;
  /** Right-align + mono digits. */
  numeric?: boolean;
  /** First column: used as the card title on mobile. */
  primary?: boolean;
  /** Short text under the primary value (reads row[`${key}Sub`]). */
  sub?: boolean;
}

/** Deterministic string hash, so mock numbers never change between renders (no hydration mismatch). */
export function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
