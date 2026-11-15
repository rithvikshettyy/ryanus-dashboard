import { AlertTriangle, CheckCircle2, Lightbulb } from "lucide-react";
import { Panel } from "@/components/ui/panel";
import type { Insight } from "@/lib/analytics";
import { getT } from "@/lib/i18n/server";
import { cn } from "@/lib/utils";

const TONE = {
  info: { icon: Lightbulb, chip: "bg-info-bg text-info", label: "Insight" },
  bad: { icon: AlertTriangle, chip: "bg-bad-bg text-bad", label: "Needs attention" },
  good: { icon: CheckCircle2, chip: "bg-good-bg text-good", label: "On track" },
} as const;

export async function Insights({ insights }: { insights: Insight[] }) {
  const tr = await getT();
  return (
    <section aria-label={tr("Highlights")}>
      <h2 className="mb-3 text-sm font-semibold text-muted-foreground">{tr("Shift highlights")}</h2>
      <div className="grid gap-4 md:grid-cols-3">
        {insights.map((i) => {
          const t = TONE[i.tone];
          return (
            <Panel key={i.title} hover className="flex gap-3">
              <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", t.chip)}>
                <t.icon className="size-[18px]" aria-hidden />
              </span>
              <div>
                <p className="text-sm font-semibold">
                  {i.title} <span className="sr-only">({tr(t.label)})</span>
                </p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{i.body}</p>
              </div>
            </Panel>
          );
        })}
      </div>
    </section>
  );
}
