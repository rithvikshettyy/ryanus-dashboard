import { ALERT_TYPE_CONFIG } from "./alerts";
import { makeT, type Lang, type TFn } from "./i18n";
import type { Chunk } from "./rag";
import type { Alert } from "./types";

/** Alert chunks are built in the browser so they reflect acknowledge/resolve choices made on the Alerts page. */
export function alertChunks(alerts: Alert[], now: number, t: TFn, lang: Lang): Chunk[] {
  const local = make(alerts, now, t);
  if (lang === "en") return local;
  // Index the English words too, so English and Hindi questions both match (same idea as lib/knowledge.ts)
  const en = make(alerts, now, makeT("en"));
  return local.map((c, i) => ({ ...c, altTitle: en[i].title, keywords: `${c.keywords ?? ""} ${en[i].title} ${en[i].text}` }));
}

function make(alerts: Alert[], now: number, t: TFn): Chunk[] {
  const open = alerts.filter((a) => a.status !== "resolved");
  const count = (f: (a: Alert) => boolean) => alerts.filter(f).length;
  const names = (list: Alert[]) =>
    list.length ? list.map((a) => `${t(a.equipmentName)} (${t(a.title)})`).join(", ") : t("none");

  const summary: Chunk = {
    id: "alerts-summary",
    title: t("Alerts overview"),
    text: t(
      "There are {open} open alerts: {crit} critical and {warn} warnings. {unack} are unacknowledged, {ack} acknowledged and {res} resolved. Critical and still unacknowledged: {list}.",
      {
        open: open.length,
        crit: count((a) => a.severity === "critical" && a.status !== "resolved"),
        warn: count((a) => a.severity === "warning" && a.status !== "resolved"),
        unack: count((a) => a.status === "active"),
        ack: count((a) => a.status === "acknowledged"),
        res: count((a) => a.status === "resolved"),
        list: names(alerts.filter((a) => a.severity === "critical" && a.status === "active")),
      },
    ),
    href: "/alerts",
    keywords: "how many alerts critical warning open active unacknowledged acknowledged resolved count total urgent",
  };

  const critical: Chunk = {
    id: "alerts-critical",
    title: t("Critical alerts"),
    text: t("Open critical alerts: {list}. Critical means a safety or production risk right now.", {
      list: names(alerts.filter((a) => a.severity === "critical" && a.status !== "resolved")),
    }),
    href: "/alerts",
    keywords: "critical urgent serious worst highest severity list which",
  };

  const unack: Chunk = {
    id: "alerts-unack",
    title: t("Unacknowledged alerts"),
    text: t("Alerts nobody has acknowledged yet: {list}.", { list: names(alerts.filter((a) => a.status === "active")) }),
    href: "/alerts",
    keywords: "unacknowledged unread new pending active waiting",
  };

  const each: Chunk[] = alerts.map((a) => {
    const cfg = ALERT_TYPE_CONFIG[a.type];
    const mins = Math.max(0, Math.round((now - a.createdAt) / 60_000));
    return {
      id: `alert-${a.id}`,
      title: `${t(a.equipmentName)} ${t(a.title)}`,
      text: t(
        "{name}: {title}, {severity}, {status}. Reading {actual} {unit} ({limit} {threshold} {unit}), raised {mins} min ago at {location}{operator}. Next step: {action}",
        {
          name: a.equipmentName, title: a.title, severity: t(a.severity === "critical" ? "Critical" : a.severity === "warning" ? "Warning" : "Info").toLowerCase(),
          status: t(a.status === "active" ? "Unacknowledged" : a.status === "acknowledged" ? "Acknowledged" : "Resolved").toLowerCase(),
          actual: a.metric.actual, unit: a.metric.unit, limit: t(cfg.limitWord).toLowerCase(), threshold: a.metric.threshold,
          mins, location: a.location, operator: a.operator ? t(", operator {op}", { op: a.operator }) : "", action: a.action,
        },
      ),
      href: `/alerts?open=${a.id}`,
      keywords: `${a.type} ${a.equipmentType} alert ${cfg.label}`,
    };
  });

  return [summary, critical, unack, ...each];
}
