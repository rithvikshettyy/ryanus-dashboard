"use client";

import { CheckCircle2, Circle, Eye } from "lucide-react";
import { useT } from "@/components/i18n-provider";
import type { AlertStatus, Severity } from "@/lib/types";
import { SEVERITY_CONFIG } from "@/lib/alerts";
import { cn } from "@/lib/utils";

export function SeverityBadge({ severity }: { severity: Severity }) {
  const t = useT();
  const s = SEVERITY_CONFIG[severity];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold", s.bg, s.text)}>
      <s.icon className="size-3.5" aria-hidden />
      {t(s.label)}
    </span>
  );
}

const STATUS = {
  active: { label: "Unacknowledged", icon: Circle, cls: "border bg-card text-foreground" },
  acknowledged: { label: "Acknowledged", icon: Eye, cls: "bg-info-bg text-info" },
  resolved: { label: "Resolved", icon: CheckCircle2, cls: "bg-good-bg text-good" },
} as const;

export function StatusPill({ status }: { status: AlertStatus }) {
  const t = useT();
  const s = STATUS[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium", s.cls)}>
      <s.icon className="size-3.5" aria-hidden />
      {t(s.label)}
    </span>
  );
}
