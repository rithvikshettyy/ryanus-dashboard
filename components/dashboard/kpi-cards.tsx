import { ArrowDownRight, ArrowUpRight, Clock, Droplets, Fuel, Route, Ruler, Weight, type LucideIcon } from "lucide-react";
import { Panel } from "@/components/ui/panel";
import { HIGHER_IS_BETTER, NEUTRAL_METRICS, metricValue, type ClassSummary, type MetricKey } from "@/lib/analytics";
import { CLASS_CONFIG } from "@/lib/constants";
import { fmt0, fmt2, fmtDelta } from "@/lib/format";
import { getT } from "@/lib/i18n/server";
import type { TFn } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface CardDef {
  metricKey: MetricKey;
  title: string;
  unit: string;
  icon: LucideIcon;
  format: (n: number) => string;
  /** Optional second ratio shown under each class value (fuel per km next to fuel per tonne). */
  secondary?: { metricKey: MetricKey; unit: string; format: (n: number) => string };
}

// Raw totals first, then the size-neutral ratios, so a manager can compare classes regardless of fleet size.
const CARDS: CardDef[] = [
  { metricKey: "payloadT", title: "Material moved", unit: "t", icon: Weight, format: fmt0 },
  { metricKey: "fuelL", title: "Fuel consumed", unit: "L", icon: Fuel, format: fmt0 },
  { metricKey: "trips", title: "Haul trips", unit: "trips", icon: Route, format: fmt0 },
  { metricKey: "productiveH", title: "Productive hours", unit: "h", icon: Clock, format: fmt0 },
  { metricKey: "distanceKm", title: "Distance driven", unit: "km", icon: Ruler, format: fmt0 },
  {
    metricKey: "fuelPerTonne",
    title: "Fuel per tonne",
    unit: "L/t",
    icon: Droplets,
    format: fmt2,
    secondary: { metricKey: "fuelPerKm", unit: "L/km", format: fmt2 },
  },
];

export async function KpiCards({ summaries }: { summaries: ClassSummary[] }) {
  const t = await getT();
  return (
    <section aria-label={t("Totals")} className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">
      {CARDS.map((c) => (
        <ComparisonCard key={c.metricKey} card={c} summaries={summaries} t={t} />
      ))}
    </section>
  );
}

function ComparisonCard({ card, summaries, t }: { card: CardDef; summaries: ClassSummary[]; t: TFn }) {
  const { metricKey, title, unit, icon: Icon, format, secondary } = card;
  const higherBetter = HIGHER_IS_BETTER[metricKey];
  const neutral = NEUTRAL_METRICS.has(metricKey);
  // 3+ classes: switch from "A vs B" to ranked rows, best first, each one compared with the leader.
  const ranked = summaries.length > 2;

  const rows = summaries.map((s) => ({ s, v: metricValue(s, metricKey) }));
  // Neutral volume metrics (fuel, trips, distance) rank biggest first; only real "lower is better" ratios rank ascending.
  if (ranked) rows.sort((a, b) => (higherBetter || neutral ? b.v - a.v : a.v - b.v));
  const max = Math.max(...rows.map((r) => r.v), 1);
  const lead = rows[0];

  return (
    <Panel hover className="flex flex-col gap-3 p-3.5 sm:gap-4 sm:p-4 md:p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {t(title)} <span className="text-xs">({t(unit)})</span>
        </p>
        <span className="hidden size-9 items-center justify-center rounded-lg border bg-card text-muted-foreground sm:flex">
          <Icon className="size-[18px]" aria-hidden />
        </span>
      </div>

      <div className="space-y-3">
        {rows.map(({ s, v }, i) => (
          <div key={s.cls}>
            <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-2">
              <span className="flex items-center gap-2 text-xs text-muted-foreground">
                {ranked && <span className="num w-4 text-foreground">{i + 1}</span>}
                <span className="size-2.5 rounded-full" style={{ background: CLASS_CONFIG[s.cls].color }} aria-hidden />
                {s.label}
                {secondary && (
                  <span className="num font-normal">
                    · {secondary.format(metricValue(s, secondary.metricKey))} {t(secondary.unit)}
                  </span>
                )}
              </span>
              <span className="num text-lg sm:text-xl font-semibold tracking-tight">
                {format(v)} <span className="text-xs font-normal text-muted-foreground">{t(unit)}</span>
              </span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${(v / max) * 100}%`, background: CLASS_CONFIG[s.cls].color }}
              />
            </div>
          </div>
        ))}
      </div>

      {summaries.length > 1 && (
        <div className="flex flex-wrap gap-1.5 border-t pt-3">
          {rows.slice(1).map(({ s, v }) => {
            const delta = lead.v === 0 ? 0 : v / lead.v - 1;
            const better = higherBetter ? delta > 0 : delta < 0;
            const flat = neutral || Math.abs(delta) < 0.005;
            const Arrow = delta >= 0 ? ArrowUpRight : ArrowDownRight;
            return (
              <span
                key={s.cls}
                className={cn(
                  "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium",
                  flat ? "bg-muted text-muted-foreground" : better ? "bg-good-bg text-good" : "bg-bad-bg text-bad",
                )}
              >
                <Arrow className="size-3.5" aria-hidden />
                <span className="num">{fmtDelta(delta)}</span>
                {(ranked || summaries.length > 2) && <> {s.label}</>} {t("vs")} {lead.s.label}
              </span>
            );
          })}
        </div>
      )}
    </Panel>
  );
}
