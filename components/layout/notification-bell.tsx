"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Bell, BellOff, BellRing, Check, CheckCheck, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/components/i18n-provider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { showDesktopNotification, useDesktopNotifications } from "@/hooks/use-desktop-notifications";
import { applyStatuses, useAlertStatuses } from "@/hooks/use-alert-statuses";
import { useNow } from "@/hooks/use-now";
import { useReadNotifications } from "@/hooks/use-read-notifications";
import { ALERT_TYPE_CONFIG, EQUIPMENT_CONFIG, SEVERITY_CONFIG } from "@/lib/alerts";
import { timeAgo } from "@/lib/format";
import type { TFn } from "@/lib/i18n";
import type { Alert } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Bell + popover. Opens in place (no page change) and lists open alerts, worst first. */
export function NotificationBell({ alerts: seedAlerts, serverNow }: { alerts: Alert[]; serverNow: number }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const now = useNow(serverNow, 30_000);
  const { read, markRead } = useReadNotifications();
  // Apply acknowledge/resolve choices made on the Alerts page; resolved alerts leave the list
  const { overrides } = useAlertStatuses();
  const alerts = useMemo(
    () => applyStatuses(seedAlerts, overrides).filter((a) => a.status !== "resolved"),
    [seedAlerts, overrides],
  );

  // Unacknowledged alerts you have not opened yet count as unread
  const isUnread = (a: Alert) => a.status === "active" && !read.has(a.id);
  const unread = alerts.filter(isUnread);

  const { permission, request } = useDesktopNotifications();

  // Must run from a click: browsers ignore (or auto-block) permission prompts that are not user-initiated.
  const enable = useCallback(async () => {
    const result = await request();
    if (result === "granted") toast.success(t("Desktop alerts enabled"), { description: t("You will be notified about critical alerts.") });
    if (result === "denied") toast.error(t("Notifications are blocked"), { description: t("Allow them from the lock icon in Chrome's address bar.") });
  }, [request, t]);

  // 1) Ask once, on the first visit, with a friendly toast (the Enable button is the user click).
  useEffect(() => {
    if (typeof Notification === "undefined" || Notification.permission !== "default") return;
    try {
      if (localStorage.getItem("ryanus-notif-prompted")) return;
      localStorage.setItem("ryanus-notif-prompted", "1");
    } catch {
      return;
    }
    toast(t("Get desktop alerts"), {
      description: t("Be told about critical alerts even when this tab is in the background."),
      duration: 20_000,
      action: { label: t("Enable"), onClick: () => void enable() },
      cancel: { label: t("Not now"), onClick: () => {} },
    });
  }, [enable, t]);

  // 2) Once allowed, show a native notification for each critical alert we have not announced yet.
  useEffect(() => {
    if (permission !== "granted") return;
    const KEY = "ryanus-notified-alerts";
    let done: string[] = [];
    try {
      done = (localStorage.getItem(KEY) ?? "").split(",").filter(Boolean);
    } catch {
      /* ignore */
    }
    const fresh = alerts.filter((a) => a.severity === "critical" && a.status === "active" && !done.includes(a.id));
    if (fresh.length === 0) return;
    fresh.slice(0, 3).forEach((a) =>
      showDesktopNotification(t("Critical: {name}", { name: a.equipmentName }), describe(a, t), { tag: a.id, href: `/alerts?open=${a.id}` }),
    );
    if (fresh.length > 3) {
      showDesktopNotification(t("{n} more critical alerts", { n: fresh.length - 3 }), t("Open GEOVIA Fleetsched to review them."), { tag: "more-critical", href: "/alerts" });
    }
    try {
      localStorage.setItem(KEY, [...done, ...fresh.map((a) => a.id)].join(","));
    } catch {
      /* ignore */
    }
  }, [permission, alerts, t]);

  function sendTest() {
    const a = alerts[0];
    showDesktopNotification(
      a ? t("Test: {name}", { name: a.equipmentName }) : t("Test notification"),
      a ? describe(a, t) : t("Desktop alerts are working."),
      { tag: "test", href: a ? `/alerts?open=${a.id}` : "/alerts" },
    );
    toast.success(t("Test notification sent"));
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label={unread.length ? t("Notifications, {n} unread", { n: unread.length }) : t("Notifications")}
        className="relative flex size-10 items-center justify-center rounded-lg border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground"
      >
        <Bell className="size-[18px]" />
        {unread.length > 0 && (
          <span className="num absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-bad px-1 text-xs font-semibold text-white ring-2 ring-card">
            {unread.length > 9 ? "9+" : unread.length}
          </span>
        )}
      </PopoverTrigger>

      <PopoverContent align="end" sideOffset={8} className="w-[min(25rem,calc(100vw-1rem))] gap-0 rounded-2xl p-0">
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <h2 className="text-sm font-semibold">{t("Notifications")}</h2>
          {unread.length > 0 && (
            <span className="num rounded-md bg-bad-bg px-1.5 py-0.5 text-xs font-semibold text-bad">{t("{n} new", { n: unread.length })}</span>
          )}
          <button
            type="button"
            disabled={unread.length === 0}
            onClick={() => markRead(alerts.map((a) => a.id))}
            className="ml-auto flex h-8 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-primary transition-colors hover:bg-primary-soft disabled:pointer-events-none disabled:text-muted-foreground"
          >
            <CheckCheck className="size-3.5" aria-hidden /> {t("Mark all read")}
          </button>
        </div>

        {permission === "default" && (
          <div className="flex items-start gap-3 border-b bg-primary-soft/60 px-4 py-3">
            <BellRing className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{t("Get desktop alerts")}</p>
              <p className="text-xs text-muted-foreground">{t("Know about critical alerts even when this tab is in the background.")}</p>
            </div>
            <button
              type="button"
              onClick={() => void enable()}
              className="h-9 shrink-0 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              {t("Enable")}
            </button>
          </div>
        )}
        {permission === "granted" && (
          <div className="flex items-center gap-2 border-b px-4 py-2 text-xs text-muted-foreground">
            <Check className="size-3.5 text-good" aria-hidden /> {t("Desktop alerts are on")}
            <button type="button" onClick={sendTest} className="ml-auto h-8 rounded-md px-2 font-medium text-primary transition-colors hover:bg-primary-soft">
              {t("Send test")}
            </button>
          </div>
        )}
        {permission === "denied" && (
          <div className="flex items-start gap-2 border-b bg-warn-bg px-4 py-2.5 text-xs text-warn">
            <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            {t("Notifications are blocked for this site. Click the lock icon in Chrome's address bar and allow Notifications.")}
          </div>
        )}

        {alerts.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
            <BellOff className="size-7 text-muted-foreground" aria-hidden />
            <p className="text-sm font-medium">{t("You are all caught up")}</p>
            <p className="text-xs text-muted-foreground">{t("No open alerts right now.")}</p>
          </div>
        ) : (
          <ul className="max-h-[min(26rem,60vh)] divide-y overflow-y-auto">
            {alerts.map((a) => {
              const sev = SEVERITY_CONFIG[a.severity];
              const Equip = EQUIPMENT_CONFIG[a.equipmentType].icon;
              const type = ALERT_TYPE_CONFIG[a.type];
              const unreadItem = isUnread(a);
              return (
                <li key={a.id} className="relative">
                  <Link
                    href={`/alerts?open=${a.id}`}
                    onClick={() => {
                      markRead([a.id]);
                      setOpen(false);
                    }}
                    className={cn("flex gap-3 py-3 pl-4 pr-14 transition-colors hover:bg-muted/60", unreadItem && "bg-primary-soft/40")}
                  >
                    <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", sev.bg, sev.text)}>
                      <sev.icon className="size-[18px]" aria-hidden />
                      <span className="sr-only">{t(sev.label)}</span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <Equip className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                        <span className={cn("truncate text-sm", unreadItem ? "font-semibold" : "font-medium")}>{t(a.equipmentName)}</span>
                        <span className="num ml-auto shrink-0 text-xs text-muted-foreground">{timeAgo(now - a.createdAt, t)}</span>
                      </span>
                      <span className="mt-0.5 block truncate text-sm text-muted-foreground">{t(a.title)}</span>
                      <span className="num mt-1 block text-xs">
                        <span className={cn("font-semibold", sev.text)}>
                          {a.metric.actual} {t(a.metric.unit)}
                        </span>
                        <span className="text-muted-foreground">
                          {" "}
                          · {t(type.limitWord).toLowerCase()} {a.metric.threshold} {t(a.metric.unit)}
                        </span>
                      </span>
                    </span>
                  </Link>
                  {unreadItem && (
                    // Sibling of the Link (a button inside a link is invalid HTML): marks just this one as read
                    <button
                      type="button"
                      onClick={() => markRead([a.id])}
                      aria-label={t("Mark {name} {title} as read", { name: a.equipmentName, title: a.title })}
                      title={t("Mark as read")}
                      className="absolute right-2 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full text-primary transition-colors hover:bg-primary-soft"
                    >
                      <span className="flex size-6 items-center justify-center rounded-full border border-primary/40">
                        <Check className="size-3.5" aria-hidden />
                      </span>
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <Link
          href="/alerts"
          onClick={() => setOpen(false)}
          className="flex h-11 items-center justify-center gap-1.5 border-t text-sm font-medium text-primary transition-colors hover:bg-primary-soft/50"
        >
          {t("View all alerts")} <ArrowRight className="size-4" aria-hidden />
        </Link>
      </PopoverContent>
    </Popover>
  );
}

function describe(a: Alert, t: TFn): string {
  const type = ALERT_TYPE_CONFIG[a.type];
  return `${t(a.title)}: ${a.metric.actual} ${t(a.metric.unit)} (${t(type.limitWord).toLowerCase()} ${a.metric.threshold} ${t(a.metric.unit)})`;
}
