import type { LucideIcon } from "lucide-react";
import type { Tone } from "@/lib/table";
import { cn } from "@/lib/utils";

const ICON_TONE: Record<Tone, string> = {
  good: "bg-good-bg text-good",
  bad: "bg-bad-bg text-bad",
  warn: "bg-warn-bg text-warn",
  info: "bg-info-bg text-info",
  muted: "bg-muted text-muted-foreground",
};

export interface Stat {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  tone?: Tone;
}

/** Row of KPI cards at the top of a list page: 2 columns on phones, 4 on desktop. */
export function StatStrip({ stats }: { stats: Stat[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
      {stats.map(({ label, value, hint, icon: Icon, tone = "muted" }) => (
        <div key={label} className="min-w-0 rounded-2xl border bg-card p-3.5 shadow-xs transition-shadow hover:shadow-md md:p-5">
          <div className="flex items-center gap-2.5">
            <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg md:size-9", ICON_TONE[tone])}>
              <Icon className="size-4 md:size-[18px]" aria-hidden />
            </span>
            <p className="min-w-0 text-xs font-medium leading-tight text-muted-foreground md:truncate md:text-sm">{label}</p>
          </div>
          <p className="num mt-2.5 text-xl font-semibold tracking-tight md:mt-3 md:text-2xl">{value}</p>
          {hint && <p className="mt-0.5 text-xs leading-snug text-muted-foreground md:truncate">{hint}</p>}
        </div>
      ))}
    </div>
  );
}
