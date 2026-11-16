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
  wrap = false,
}: {
  options: { value: T; label: string; count?: number }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
  className?: string;
  /** Wrap onto a second row instead of scrolling sideways (use for tabs that must stay visible on phones). */
  wrap?: boolean;
}) {
  const t = useT();
  return (
    <div role="group" aria-label={t(label)} className={cn("no-scrollbar inline-flex max-w-full gap-1 rounded-xl bg-muted p-1", wrap ? "flex-wrap" : "overflow-x-auto", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
          className={cn(
            "flex h-10 shrink-0 sm:h-8 items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-[color,background-color,border-color,box-shadow,transform,opacity]",
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
