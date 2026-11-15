import type { Metadata } from "next";
import { connection } from "next/server";
import { AlertsView } from "@/components/alerts/alerts-view";
import { LiveStatus } from "@/components/alerts/live-status";
import { PageHeader } from "@/components/layout/page-header";
import { currentTime, loadAlerts } from "@/lib/alerts";

export const metadata: Metadata = { title: "Alerts" };

export default async function AlertsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection(); // opt out of static rendering so "minutes ago" is computed per request
  const now = currentTime();
  const alerts = loadAlerts(now);
  const rawOpen = (await searchParams).open;
  const openParam = Array.isArray(rawOpen) ? rawOpen[0] : rawOpen;
  // validate: only open the drawer for an id that really exists
  const initialOpenId = alerts.some((a) => a.id === openParam) ? (openParam ?? null) : null;
  return (
    <>
      <PageHeader title="Alerts" subtitle="What happened, which equipment, how serious, what to do" actions={<LiveStatus serverNow={now} />} />
      <AlertsView initialAlerts={alerts} serverNow={now} initialOpenId={initialOpenId} />
    </>
  );
}
