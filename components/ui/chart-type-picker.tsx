"use client";

import { ChartArea, ChartColumn, ChartLine, ChartPie, type LucideIcon } from "lucide-react";
import { useT } from "@/components/i18n-provider";
import { cn } from "@/lib/utils";

export type ChartType = "line" | "bar" | "area" | "pie";

const META: Record<ChartType, { label: string; icon: LucideIcon }> = {
  line: { label: "Line chart", icon: ChartLine },
  bar: { label: "Bar chart", icon: ChartColumn },
  area: { label: "Area chart", icon: ChartArea },
  pie: { label: "Pie chart", icon: ChartPie },
};

/** Icon-only switch that lets the user pick how a chart is drawn. */
export function ChartTypePicker({
  value,
  onChange,
  types,
}: {
  value: ChartType;
  onChange: (t: ChartType) => void;
  types: ChartType[];
}) {
  const tr = useT();
  return (
    <div role="group" aria-label={tr("Chart type")} className="inline-flex gap-1 rounded-xl bg-muted p-1">
      {types.map((t) => {
        const { icon: Icon } = META[t];
        const label = tr(META[t].label);
        const on = t === value;
        return (
          <button
            key={t}
            type="button"
            aria-pressed={on}
            aria-label={label}
            title={label}
            onClick={() => onChange(t)}
            className={cn(
              "flex size-8 items-center justify-center rounded-lg transition-all",
              on ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-4" aria-hidden />
          </button>
        );
      })}
    </div>
  );
}
