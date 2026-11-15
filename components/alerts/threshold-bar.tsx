import { ALERT_TYPE_CONFIG, SEVERITY_CONFIG, breachLabel } from "@/lib/alerts";
import type { Alert } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Actual vs threshold: filled bar = actual value, dark tick = threshold. */
export function ThresholdBar({ alert, large = false }: { alert: Alert; large?: boolean }) {
  const { actual, threshold, unit } = alert.metric;
  const sev = SEVERITY_CONFIG[alert.severity];
  const limitWord = ALERT_TYPE_CONFIG[alert.type].limitWord;
  const hasThreshold = threshold !== 0;
  const max = Math.max(actual, threshold) * 1.2 || 1;

  return (
    <div
      className="space-y-2"
      role="img"
      aria-label={`${actual} ${unit} actual versus ${limitWord.toLowerCase()} ${threshold} ${unit}. ${breachLabel(alert)}`}
    >
      <div className="flex items-end justify-between gap-2">
        <p className={cn("num font-semibold tracking-tight", large ? "text-3xl" : "text-2xl")}>
          {actual} <span className="text-sm font-normal text-muted-foreground">{unit}</span>
        </p>
        <span className={cn("num rounded-md px-2 py-1 text-xs font-semibold", sev.bg, sev.text)}>
          {breachLabel(alert)}
        </span>
      </div>

      {hasThreshold && (
        <div className="relative h-2.5 rounded-full bg-muted">
          <div className={cn("h-full rounded-full", sev.bar)} style={{ width: `${(actual / max) * 100}%` }} />
          <div
            className="absolute -top-1 h-[18px] w-0.5 rounded bg-foreground"
            style={{ left: `${(threshold / max) * 100}%` }}
            aria-hidden
          />
        </div>
      )}

      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Actual</span>
        <span>
          {limitWord} <span className="num font-medium text-foreground">{threshold} {unit}</span>
        </span>
      </div>
    </div>
  );
}
