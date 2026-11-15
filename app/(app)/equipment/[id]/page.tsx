import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ArrowLeft, MapPin, UserRound } from "lucide-react";
import { SeverityBadge, StatusPill } from "@/components/alerts/status-pill";
import { ThresholdBar } from "@/components/alerts/threshold-bar";
import { PageHeader } from "@/components/layout/page-header";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { EQUIPMENT_CONFIG, SEVERITY_RANK, currentTime, loadAlerts } from "@/lib/alerts";
import { timeAgo } from "@/lib/format";

type Props = { params: Promise<{ id: string }> };

function forEquipment(id: string, now: number) {
  return loadAlerts(now)
    .filter((a) => a.equipmentId === id)
    .sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] || b.createdAt - a.createdAt);
}

// params is a Promise in Next 15+. App Router equivalent of getServerSideProps({ params }).
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const first = forEquipment(id, 0)[0];
  return { title: first ? first.equipmentName : "Equipment" };
}

export default async function EquipmentPage({ params }: Props) {
  await connection();
  const { id } = await params;
  const now = currentTime();
  const alerts = forEquipment(id, now);
  if (alerts.length === 0) notFound();

  const eq = alerts[0];
  const Icon = EQUIPMENT_CONFIG[eq.equipmentType].icon;
  const open = alerts.filter((a) => a.status !== "resolved");

  return (
    <>
      <PageHeader title={eq.equipmentName} subtitle={`${EQUIPMENT_CONFIG[eq.equipmentType].label} · ${eq.location}`} />
      <div className="mx-auto max-w-[1000px] space-y-5 p-4 md:p-8">
        <Link href="/alerts" className="inline-flex h-10 items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="size-4" /> Back to alerts
        </Link>

        <Panel className="flex flex-wrap items-center gap-4">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-primary-soft text-primary">
            <Icon className="size-7" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-lg font-semibold">{eq.equipmentName}</p>
            <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5"><MapPin className="size-3.5" /> {eq.location}</span>
              {eq.operator && <span className="flex items-center gap-1.5"><UserRound className="size-3.5" /> {eq.operator}</span>}
            </p>
          </div>
          <div className="flex gap-6 text-center">
            <div>
              <p className="num text-2xl font-semibold">{open.length}</p>
              <p className="text-xs text-muted-foreground">Open alerts</p>
            </div>
            <div>
              <p className="num text-2xl font-semibold">{alerts.length}</p>
              <p className="text-xs text-muted-foreground">Total alerts</p>
            </div>
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Alert history" description="Most severe first, then newest." />
          <ul className="space-y-3">
            {alerts.map((a) => (
              <li key={a.id} className="grid gap-3 rounded-xl border p-4 transition-shadow hover:shadow-md md:grid-cols-[1fr_260px] md:items-center">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <SeverityBadge severity={a.severity} />
                    <StatusPill status={a.status} />
                    <span className="num text-xs text-muted-foreground">{timeAgo(now - a.createdAt)}</span>
                  </div>
                  <p className="font-medium">{a.title}</p>
                  <p className="text-sm text-muted-foreground">{a.action}</p>
                </div>
                <ThresholdBar alert={a} />
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}
