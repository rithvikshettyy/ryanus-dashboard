"use client";

import { CheckCheck, ChevronRight, Clock, IdCard, MapPin, RotateCcw, UserRound, Wrench } from "lucide-react";
import { format } from "date-fns";
import { useT } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ALERT_TYPE_CONFIG, EQUIPMENT_CONFIG, SEVERITY_CONFIG } from "@/lib/alerts";
import { timeAgo } from "@/lib/format";
import type { Alert } from "@/lib/types";
import { cn } from "@/lib/utils";
import { SeverityBadge, StatusPill } from "./status-pill";
import { ThresholdBar } from "./threshold-bar";

export interface AlertActions {
  onAcknowledge: (a: Alert) => void;
  onResolve: (a: Alert) => void;
  onReopen: (a: Alert) => void;
  onOpen: (a: Alert) => void;
}

export function AlertActionButtons({ alert, actions, stretch = false }: { alert: Alert; actions: AlertActions; stretch?: boolean }) {
  const t = useT();
  const cls = stretch ? "flex-1" : "";
  return (
    <div className="flex flex-wrap gap-2">
      {alert.status === "active" && (
        <Button className={cn("h-10 gap-1.5 px-3.5", cls)} onClick={() => actions.onAcknowledge(alert)}>
          <CheckCheck /> {t("Acknowledge")}
        </Button>
      )}
      {alert.status !== "resolved" && (
        <Button
          variant={alert.status === "active" ? "outline" : "default"}
          className={cn("h-10 gap-1.5 px-3.5", cls)}
          onClick={() => actions.onResolve(alert)}
        >
          {t("Resolve")}
        </Button>
      )}
      {alert.status === "resolved" && (
        <Button variant="outline" className={cn("h-10 gap-1.5 px-3.5", cls)} onClick={() => actions.onReopen(alert)}>
          <RotateCcw /> {t("Reopen")}
        </Button>
      )}
    </div>
  );
}

export function AlertCard({
  alert,
  now,
  actions,
  selected = false,
  onToggleSelect,
}: {
  alert: Alert;
  now: number;
  actions: AlertActions;
  selected?: boolean;
  /** Only passed for open Warning/Info alerts: enables the bulk-acknowledge checkbox. */
  onToggleSelect?: (a: Alert) => void;
}) {
  const t = useT();
  const sev = SEVERITY_CONFIG[alert.severity];
  const Equip = EQUIPMENT_CONFIG[alert.equipmentType].icon;
  const TypeIcon = ALERT_TYPE_CONFIG[alert.type].icon;
  const resolved = alert.status === "resolved";
  const age = now - alert.createdAt;
  // Critical and still unacknowledged after 10 min = needs attention now
  const overdue = alert.severity === "critical" && alert.status === "active" && age > 10 * 60_000;

  return (
    <article
      aria-label={t("{sev} alert: {name} {title}", { sev: t(sev.label), name: alert.equipmentName, title: alert.title })}
      className={cn(
        "relative overflow-hidden rounded-2xl border bg-card shadow-xs transition-shadow duration-200 hover:shadow-md",
        resolved && "opacity-75",
        selected && "ring-2 ring-primary/40",
      )}
    >
      <span className={cn("absolute inset-y-0 left-0 w-1.5", resolved ? "bg-good" : sev.stripe)} aria-hidden />
      <div className="grid gap-5 p-4 pl-6 md:p-5 md:pl-7 lg:grid-cols-[1.25fr_1fr]">
        <div className="min-w-0 space-y-2.5">
          <div className="flex flex-wrap items-center gap-2">
            {onToggleSelect && (
              <Checkbox
                checked={selected}
                onCheckedChange={() => onToggleSelect(alert)}
                aria-label={t("Select {name} for bulk acknowledge", { name: alert.equipmentName })}
                className="size-5"
              />
            )}
            <SeverityBadge severity={alert.severity} />
            {alert.status !== "active" && <StatusPill status={alert.status} />}
            <time
              className={cn(
                "num ml-auto flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium",
                overdue ? "bg-bad-bg text-bad" : "text-foreground",
              )}
              dateTime={new Date(alert.createdAt).toISOString()}
              title={format(new Date(alert.createdAt), "d MMM yyyy, HH:mm:ss")} // exact time on hover
              suppressHydrationWarning
            >
              <Clock className="size-4" aria-hidden />
              {timeAgo(age, t)}
              {overdue && <span className="font-semibold">· {t("Overdue")}</span>}
            </time>
          </div>

          <div className="flex items-center gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border bg-card text-muted-foreground">
              <Equip className="size-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold leading-tight">{t(alert.equipmentName)}</p>
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <TypeIcon className="size-3.5" aria-hidden />
                {t(alert.title)}
              </p>
            </div>
          </div>

          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <li className="flex items-center gap-1.5">
              <IdCard className="size-3.5" aria-hidden /> {t(alert.fleetName)}
            </li>
            <li className="flex items-center gap-1.5">
              <MapPin className="size-3.5" aria-hidden /> {t(alert.location)}
            </li>
            {alert.operator && (
              <li className="flex items-center gap-1.5">
                <UserRound className="size-3.5" aria-hidden /> {t(alert.operator)}
              </li>
            )}
          </ul>

          <p className="flex gap-2 rounded-lg bg-muted/70 px-3 py-2 text-sm">
            <Wrench className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
            <span>
              <span className="font-medium">{t("Next step:")} </span>
              {t(alert.action)}
            </span>
          </p>
        </div>

        <div className="flex flex-col justify-between gap-4 lg:border-l lg:pl-5">
          <ThresholdBar alert={alert} />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <AlertActionButtons alert={alert} actions={actions} />
            <Button variant="ghost" className="h-10 gap-1 px-3" onClick={() => actions.onOpen(alert)}>
              {t("Details")} <ChevronRight />
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}
