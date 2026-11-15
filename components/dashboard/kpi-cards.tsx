import { ArrowDownRight, ArrowUpRight, Clock, Fuel, Route, Weight, type LucideIcon } from "lucide-react";
import { Panel } from "@/components/ui/panel";
import { HIGHER_IS_BETTER, metricValue, type ClassSummary, type MetricKey } from "@/lib/analytics";
import { CLASS_CONFIG } from "@/lib/constants";
import { fmt0, fmtDelta } from "@/lib/format";
import { getT } from "@/lib/i18n/server";
import type { TFn } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const CARDS: { metricKey: MetricKey; title: string; unit: string; icon: LucideIcon }[] = [
  { metricKey: "payloadT", title: "Material moved", unit: "t", icon: Weight },
  { metricKey: "fuelL", title: "Fuel consumed", unit: "L", icon: Fuel },
  { metricKey: "trips", title: "Haul trips", unit: "trips", icon: Route },
  { metricKey: "productiveH", title: "Productive hours", unit: "h", icon: Clock },
];

export async function KpiCards({ summaries }: { summaries: ClassSummary[] }) {
  const t = await getT();
  return (
    <section aria-label={t("Totals")} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {CARDS.map((c) => (
        <ComparisonCard key={c.metricKey} {...c} summaries={summaries} t={t} />
      ))}
    </section>
  );
}

function ComparisonCard({
  metricKey,
  title,
  unit,
  icon: Icon,
  summaries,
  t,
}: {
  t: TFn;
  metricKey: MetricKey;
  title: string;
  unit: string;
  icon: LucideIcon;
  summaries: ClassSummary[];
}) {
  const values = summaries.map((s) => metricValue(s, metricKey));
  const max = Math.max(...values, 1);
  const base = summaries[0];
  const baseValue = values[0];

  return (
    <Panel hover className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{t(title)}</p>
        <span className="flex size-9 items-center justify-center rounded-lg border bg-card text-muted-foreground">
          <Icon className="size-[18px]" aria-hidden />
        </span>
      </div>

      <div className="space-y-3">
        {summaries.map((s, i) => (
          <div key={s.cls}>
            <div className="flex items-baseline justify-between gap-2">
              <span className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="size-2.5 rounded-full" style={{ background: CLASS_CONFIG[s.cls].color }} aria-hidden />
                {s.label}
              </span>
              <span className="num text-xl font-semibold tracking-tight">
                {fmt0(values[i])} <span className="text-xs font-normal text-muted-foreground">{t(unit)}</span>
              </span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${(values[i] / max) * 100}%`, background: CLASS_CONFIG[s.cls].color }}
              />
            </div>
          </div>
        ))}
      </div>

      {summaries.length > 1 && (
        <div className="flex flex-wrap gap-1.5 border-t pt-3">
          {summaries.slice(1).map((s, i) => {
            const v = values[i + 1];
            const delta = baseValue === 0 ? 0 : v / baseValue - 1;
            const better = HIGHER_IS_BETTER[metricKey] ? delta > 0 : delta < 0;
            const neutral = Math.abs(delta) < 0.005;
            const Arrow = delta >= 0 ? ArrowUpRight : ArrowDownRight;
            return (
              <span
                key={s.cls}
                className={cn(
                  "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium",
                  neutral ? "bg-muted text-muted-foreground" : better ? "bg-good-bg text-good" : "bg-bad-bg text-bad",
                )}
              >
                <Arrow className="size-3.5" aria-hidden />
                <span className="num">{fmtDelta(delta)}</span>{summaries.length > 2 && <> {s.label}</>} {t("vs")} {base.label}
              </span>
            );
          })}
        </div>
      )}
    </Panel>
  );
}
