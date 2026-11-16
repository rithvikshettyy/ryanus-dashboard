import { Check, Gauge } from "lucide-react";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { HIGHER_IS_BETTER, NEUTRAL_METRICS, metricValue, type ClassSummary, type MetricKey } from "@/lib/analytics";
import { CLASS_CONFIG } from "@/lib/constants";
import { fmt0, fmt2, fmtINR, fmtPct } from "@/lib/format";
import { getT } from "@/lib/i18n/server";
import { cn } from "@/lib/utils";

const ROWS: { key: MetricKey; label: string; format: (n: number) => string }[] = [
  { key: "distanceKm", label: "Distance (km)", format: fmt0 },
  { key: "payloadPerTrip", label: "Payload per trip (t)", format: (n) => n.toFixed(1) },
  { key: "fuelPerTonne", label: "Fuel per tonne (L/t)", format: fmt2 },
  { key: "fuelPerKm", label: "Fuel per km (L/km)", format: fmt2 },
  { key: "tonnesPerProdHour", label: "Tonnes per productive hour (t/h)", format: (n) => n.toFixed(1) },
  { key: "utilisation", label: "Utilisation (%)", format: (n) => fmtPct(n, 1) },
  { key: "fuelCost", label: "Fuel cost, total (₹)", format: fmtINR },
  { key: "costPerTonne", label: "Fuel cost per tonne (₹/t)", format: (n) => fmtINR(Math.round(n)) },
];

export async function EfficiencyTable({ summaries }: { summaries: ClassSummary[] }) {
  const t = await getT();
  return (
    <Panel className="flex flex-col">
      <PanelHeader icon={Gauge} title="Efficiency scorecard" description="Ratios are computed from totals. A green tick marks the better class; totals are not ranked." />
      <div className="-mx-1 overflow-x-auto">
        <table className="w-full min-w-[420px] text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="px-1 py-2 font-medium">{t("Metric")}</th>
              {summaries.map((s) => (
                <th key={s.cls} className="px-2 py-2 text-right font-medium">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="size-2 rounded-full" style={{ background: CLASS_CONFIG[s.cls].color }} aria-hidden />
                    {s.label}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => {
              const vals = summaries.map((s) => metricValue(s, r.key));
              const best = HIGHER_IS_BETTER[r.key] ? Math.max(...vals) : Math.min(...vals);
              const ranked = !NEUTRAL_METRICS.has(r.key) && summaries.length > 1;
              return (
                <tr key={r.key} className="border-b last:border-0 transition-colors hover:bg-muted/60">
                  <td className="px-1 py-3 text-muted-foreground">{t(r.label)}</td>
                  {vals.map((v, i) => (
                    <td key={summaries[i].cls} className="px-2 py-3 text-right">
                      <span
                        className={cn(
                          "num rounded-md px-2 py-0.5",
                          "inline-flex items-center gap-1",
                          ranked && v === best && "bg-good-bg font-semibold text-good",
                        )}
                      >
                        {ranked && v === best && <Check className="size-3.5" aria-label={t("Better")} />}
                        {r.format(v)}
                      </span>
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
