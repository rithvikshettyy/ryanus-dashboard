"use client";

import { useT } from "@/components/i18n-provider";
import { cn } from "@/lib/utils";

/** Small segmented control (like the Overviews / Tracking tabs in the reference). */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
}: {
  options: { value: T; label: string; count?: number }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
  className?: string;
}) {
  const t = useT();
  return (
    <div role="group" aria-label={t(label)} className={cn("no-scrollbar inline-flex max-w-full gap-1 overflow-x-auto rounded-xl bg-muted p-1", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
          className={cn(
            "flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-all",
            o.value === value
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {t(o.label)}
          {o.count !== undefined && <span className="num text-xs text-muted-foreground">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}
