import { titleMeta } from "@/lib/i18n/server";
import { connection } from "next/server";
import { Map as MapIcon, Navigation, PackageOpen, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/modules/data-table";
import { ModulePage } from "@/components/modules/module-page";
import { StatStrip } from "@/components/modules/stat-strip";
import { currentTime } from "@/lib/alerts";
import { getT } from "@/lib/i18n/server";
import { activeTruckRows, activeTruckStats } from "@/lib/fleet";
import type { TableColumn } from "@/lib/table";
import Link from "next/link";

export const generateMetadata = titleMeta("Active trucks");

const COLUMNS: TableColumn[] = [
  { key: "truck", label: "Truck", primary: true },
  { key: "status", label: "Status", badge: true },
  { key: "route", label: "Route" },
  { key: "payload", label: "Payload", numeric: true },
  { key: "speed", label: "Speed", numeric: true },
  { key: "eta", label: "Leg ETA", numeric: true },
  { key: "operator", label: "Operator" },
  { key: "lastPing", label: "Last ping", numeric: true },
];

export default async function ActiveTrucksPage() {
  await connection();
  const t = await getT();
  const now = currentTime();
  const s = activeTruckStats(now);
  return (
    <ModulePage title="Active trucks" subtitle="Live status of every truck on shift · refresh the page for a new snapshot">
      <StatStrip
        stats={[
          { label: "On shift", value: String(s.total), hint: "trucks with a trip today", icon: Navigation },
          { label: "On the road", value: String(s.moving), hint: "hauling or returning", icon: Navigation, tone: "info" },
          { label: "At loading / dump", value: String(s.atSite), hint: "loading or dumping", icon: PackageOpen, tone: "warn" },
          { label: "No signal", value: String(s.lost), hint: s.lost ? "check telematics unit" : "all reporting", icon: WifiOff, tone: s.lost ? "bad" : "good" },
        ]}
      />
      <div className="flex justify-end">
        <Button variant="outline" className="h-10 gap-2" render={<Link href="/dashboard?tab=tracking" />}>
          <MapIcon className="size-4" aria-hidden /> {t("Open live map")}
        </Button>
      </div>
      <DataTable columns={COLUMNS} rows={activeTruckRows(now)} filterKey="status" searchPlaceholder="Search truck, route or operator" exportName="active-trucks" />
    </ModulePage>
  );
}
