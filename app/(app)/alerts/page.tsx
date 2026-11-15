import type { Metadata } from "next";
import { connection } from "next/server";
import { AlertsView } from "@/components/alerts/alerts-view";
import { LiveStatus } from "@/components/alerts/live-status";
import { PageHeader } from "@/components/layout/page-header";
import { currentTime, loadAlerts } from "@/lib/alerts";

export const metadata: Metadata = { title: "Alerts" };

export default async function AlertsPage() {
  await connection(); // opt out of static rendering so "minutes ago" is computed per request
  const now = currentTime();
  return (
    <>
      <PageHeader title="Alerts" subtitle="What happened, which equipment, how serious, what to do" actions={<LiveStatus serverNow={now} />} />
      <AlertsView initialAlerts={loadAlerts(now)} serverNow={now} />
    </>
  );
}
