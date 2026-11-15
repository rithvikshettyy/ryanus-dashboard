"use client";

import { ArrowDownToLine, CheckCircle2, Navigation, PackageOpen, Undo2, WifiOff, type LucideIcon } from "lucide-react";
import { useT } from "@/components/i18n-provider";
import { SEVERITY_CONFIG } from "@/lib/alerts";
import type { TripStatus, TruckFlag } from "@/lib/tracking";
import { cn } from "@/lib/utils";

export const STATUS_CONFIG: Record<TripStatus, { label: string; icon: LucideIcon; cls: string }> = {
  hauling: { label: "Hauling", icon: Navigation, cls: "bg-primary-soft text-primary" },
  returning: { label: "Returning", icon: Undo2, cls: "bg-muted text-muted-foreground" },
  loading: { label: "Loading", icon: PackageOpen, cls: "bg-warn-bg text-warn" },
  dumping: { label: "Dumping", icon: ArrowDownToLine, cls: "bg-info-bg text-info" },
  completed: { label: "Completed", icon: CheckCircle2, cls: "bg-good-bg text-good" },
  "no-signal": { label: "No signal", icon: WifiOff, cls: "bg-bad-bg text-bad" },
};

export function TripStatusChip({ status }: { status: TripStatus }) {
  const t = useT();
  const s = STATUS_CONFIG[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium whitespace-nowrap", s.cls)}>
      <s.icon className="size-3.5" aria-hidden />
      {t(s.label)}
    </span>
  );
}

export function FlagChip({ flag }: { flag: TruckFlag }) {
  const t = useT();
  const s = SEVERITY_CONFIG[flag.severity];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold", s.bg, s.text)}>
      <s.icon className="size-3.5" aria-hidden />
      {t(flag.title)}{flag.actual !== null && ` ${flag.actual} ${t(flag.unit)}`}
    </span>
  );
}
