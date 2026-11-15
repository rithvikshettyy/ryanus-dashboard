import { ALERT_TYPE_CONFIG } from "./alerts";
import type { Chunk } from "./rag";
import type { Alert } from "./types";

/** Alert chunks are built in the browser so they reflect acknowledge/resolve choices made on the Alerts page. */
export function alertChunks(alerts: Alert[], now: number): Chunk[] {
  const open = alerts.filter((a) => a.status !== "resolved");
  const count = (f: (a: Alert) => boolean) => alerts.filter(f).length;
  const names = (list: Alert[]) => (list.length ? list.map((a) => `${a.equipmentName} (${a.title})`).join(", ") : "none");

  const summary: Chunk = {
    id: "alerts-summary",
    title: "Alerts overview",
    text:
      `There are ${open.length} open alerts: ${count((a) => a.severity === "critical" && a.status !== "resolved")} critical and ` +
      `${count((a) => a.severity === "warning" && a.status !== "resolved")} warnings. ` +
      `${count((a) => a.status === "active")} are unacknowledged, ${count((a) => a.status === "acknowledged")} acknowledged and ` +
      `${count((a) => a.status === "resolved")} resolved. ` +
      `Critical and still unacknowledged: ${names(alerts.filter((a) => a.severity === "critical" && a.status === "active"))}.`,
    href: "/alerts",
    keywords: "how many alerts critical warning open active unacknowledged acknowledged resolved count total urgent",
  };

  const critical: Chunk = {
    id: "alerts-critical",
    title: "Critical alerts",
    text: `Open critical alerts: ${names(alerts.filter((a) => a.severity === "critical" && a.status !== "resolved"))}. Critical means a safety or production risk right now.`,
    href: "/alerts",
    keywords: "critical urgent serious worst highest severity list which",
  };

  const unack: Chunk = {
    id: "alerts-unack",
    title: "Unacknowledged alerts",
    text: `Alerts nobody has acknowledged yet: ${names(alerts.filter((a) => a.status === "active"))}.`,
    href: "/alerts",
    keywords: "unacknowledged unread new pending active waiting",
  };

  const each: Chunk[] = alerts.map((a) => {
    const t = ALERT_TYPE_CONFIG[a.type];
    const mins = Math.max(0, Math.round((now - a.createdAt) / 60_000));
    return {
      id: `alert-${a.id}`,
      title: `${a.equipmentName} ${a.title}`,
      text:
        `${a.equipmentName}: ${a.title}, ${a.severity}, ${a.status}. Reading ${a.metric.actual} ${a.metric.unit} ` +
        `(${t.limitWord.toLowerCase()} ${a.metric.threshold} ${a.metric.unit}), raised ${mins} min ago at ${a.location}` +
        `${a.operator ? `, operator ${a.operator}` : ""}. Next step: ${a.action}`,
      href: `/alerts?open=${a.id}`,
      keywords: `${a.type} ${a.equipmentType} alert ${t.label}`,
    };
  });

  return [summary, critical, unack, ...each];
}
