"use client";

import Link from "next/link";
import { ArrowUpRight, History, MapPin, UserRound, Wrench } from "lucide-react";
import { useT } from "@/components/i18n-provider";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ALERT_TYPE_CONFIG, EQUIPMENT_CONFIG } from "@/lib/alerts";
import { timeAgo } from "@/lib/format";
import type { Alert } from "@/lib/types";
import { AlertActionButtons, type AlertActions } from "./alert-card";
import { SeverityBadge, StatusPill } from "./status-pill";
import { ThresholdBar } from "./threshold-bar";

export function AlertSheet({
  alert,
  related,
  now,
  actions,
  onClose,
  onSelect,
}: {
  alert: Alert | null;
  related: Alert[];
  now: number;
  actions: AlertActions;
  onClose: () => void;
  onSelect: (a: Alert) => void;
}) {
  return (
    <Sheet open={alert !== null} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="gap-0 overflow-y-auto p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-md">
        {alert && <Body alert={alert} related={related} now={now} actions={actions} onSelect={onSelect} />}
      </SheetContent>
    </Sheet>
  );
}

function Body({
  alert, related, now, actions, onSelect,
}: {
  alert: Alert; related: Alert[]; now: number; actions: AlertActions; onSelect: (a: Alert) => void;
}) {
  const t = useT();
  const Equip = EQUIPMENT_CONFIG[alert.equipmentType].icon;
  const typeCfg = ALERT_TYPE_CONFIG[alert.type];

  return (
    <>
      <SheetHeader className="border-b p-5 pr-14">
        <div className="mb-2 flex flex-wrap gap-2">
          <SeverityBadge severity={alert.severity} />
          <StatusPill status={alert.status} />
        </div>
        <SheetTitle className="flex items-center gap-2.5 text-xl">
          <span className="flex size-10 items-center justify-center rounded-xl border bg-card text-muted-foreground">
            <Equip className="size-5" aria-hidden />
          </span>
          {t(alert.equipmentName)}
        </SheetTitle>
        <SheetDescription>
          {t("{title} · raised {ago}", { title: alert.title, ago: timeAgo(now - alert.createdAt, t) })}
        </SheetDescription>
      </SheetHeader>

      <div className="space-y-6 p-5">
        <section aria-label={t("Actual versus threshold")} className="rounded-xl border p-4">
          <ThresholdBar alert={alert} large />
          <p className={`mt-3 text-sm text-muted-foreground`}>
            {t("{type} reading is {actual} against a {limit} of {threshold}.", {
              type: t(typeCfg.label),
              actual: `${alert.metric.actual} ${t(alert.metric.unit)}`,
              limit: t(typeCfg.limitWord).toLowerCase(),
              threshold: `${alert.metric.threshold} ${t(alert.metric.unit)}`,
            })}
          </p>
        </section>

        <section aria-label={t("Recommended action")}>
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <Wrench className="size-4 text-muted-foreground" aria-hidden /> {t("Recommended action")}
          </h3>
          <p className="rounded-lg bg-muted/70 px-3 py-2.5 text-sm">{t(alert.action)}</p>
        </section>

        <section aria-label={t("Details")}>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">{t("Equipment type")}</dt>
              <dd className="font-medium">{t(EQUIPMENT_CONFIG[alert.equipmentType].label)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{t("Alert type")}</dt>
              <dd className="font-medium">{t(typeCfg.label)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{t("Location")}</dt>
              <dd className="flex items-center gap-1.5 font-medium">
                <MapPin className="size-3.5 text-muted-foreground" aria-hidden /> {t(alert.location)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{t("Operator")}</dt>
              <dd className="flex items-center gap-1.5 font-medium">
                <UserRound className="size-3.5 text-muted-foreground" aria-hidden /> {alert.operator ? t(alert.operator) : t("Unassigned")}
              </dd>
            </div>
          </dl>
        </section>

        <section aria-label={t("Related alerts")}>
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <History className="size-4 text-muted-foreground" aria-hidden /> {t("Related alerts for {name}", { name: alert.equipmentName })}
          </h3>
          {related.length === 0 ? (
            <p className="rounded-lg border border-dashed px-3 py-4 text-center text-sm text-muted-foreground">
              {t("No earlier alerts for this equipment.")}
            </p>
          ) : (
            <ul className="divide-y rounded-xl border">
              {related.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(r)}
                    className="flex min-h-12 w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-muted/60"
                  >
                    <SeverityBadge severity={r.severity} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{t(r.title)}</span>
                      <span className="num text-xs text-muted-foreground">{timeAgo(now - r.createdAt, t)}</span>
                    </span>
                    <StatusPill status={r.status} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="sticky bottom-0 mt-auto space-y-2 border-t bg-popover p-4">
        <AlertActionButtons alert={alert} actions={actions} stretch />
        <Link
          href={`/equipment/${alert.equipmentId}`}
          className="flex h-10 items-center justify-center gap-1.5 rounded-lg border text-sm font-medium transition-colors hover:bg-muted"
        >
          {t("Go to equipment")} <ArrowUpRight className="size-4" aria-hidden />
        </Link>
      </div>
    </>
  );
}
