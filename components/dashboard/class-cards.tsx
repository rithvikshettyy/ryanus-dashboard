import Image from "next/image";
import { Truck } from "lucide-react";
import { Panel } from "@/components/ui/panel";
import type { ClassSummary } from "@/lib/analytics";
import { CLASS_CONFIG, CLASS_IMAGE } from "@/lib/constants";
import { fmt1, fmtPct } from "@/lib/format";

/** One card per selected class: photo, fleet size, capacity and two headline ratios. */
export function ClassCards({ summaries }: { summaries: ClassSummary[] }) {
  return (
    <section aria-label="Selected vehicle classes" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {summaries.map((s) => {
        const cfg = CLASS_CONFIG[s.cls];
        const img = CLASS_IMAGE[s.cls];
        return (
          <Panel key={s.cls} hover className="flex items-center gap-4 overflow-hidden">
            <div
              className="flex h-24 w-36 shrink-0 items-center justify-center rounded-xl sm:w-40"
              style={{ background: `color-mix(in oklab, ${cfg.color} 10%, transparent)` }}
            >
              {img ? (
                <Image src={img} alt={`${cfg.label} photo`} width={160} height={90} className="h-full w-full object-contain p-1" />
              ) : (
                <Truck className="size-9 text-muted-foreground" aria-hidden />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <span className="size-2.5 shrink-0 rounded-full" style={{ background: cfg.color }} aria-hidden />
                <span className="truncate">{cfg.label}</span>
              </p>
              <p className="num text-xs text-muted-foreground">
                {s.vehicles} vehicles · {cfg.capacityT} t payload
              </p>
              <dl className="mt-2 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <dt className="text-muted-foreground">Per trip</dt>
                  <dd className="num text-sm font-semibold">{fmt1(s.derived.payloadPerTrip)} t</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Utilisation</dt>
                  <dd className="num text-sm font-semibold">{fmtPct(s.derived.utilisation)}</dd>
                </div>
              </dl>
            </div>
          </Panel>
        );
      })}
    </section>
  );
}
