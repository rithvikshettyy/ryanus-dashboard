import { titleMeta } from "@/lib/i18n/server";
import { connection } from "next/server";
import { Gauge, Truck, Wrench, Activity } from "lucide-react";
import { DataTable } from "@/components/modules/data-table";
import { ModulePage } from "@/components/modules/module-page";
import { StatStrip } from "@/components/modules/stat-strip";
import { currentTime } from "@/lib/alerts";
import { vehicleRows } from "@/lib/fleet";
import type { TableColumn } from "@/lib/table";

export const generateMetadata = titleMeta("All vehicles");

const COLUMNS: TableColumn[] = [
  { key: "vehicle", label: "Vehicle", primary: true },
  { key: "class", label: "Class" },
  { key: "capacity", label: "Capacity", numeric: true },
  { key: "status", label: "Status", badge: true },
  { key: "utilisation", label: "Utilisation", numeric: true },
  { key: "fuelPerT", label: "Fuel / tonne", numeric: true },
  { key: "trips", label: "Trips", numeric: true },
  { key: "engineH", label: "Engine hours", numeric: true },
];

export default async function VehiclesPage() {
  await connection();
  const rows = vehicleRows(currentTime());
  const live = rows.filter((r) => ["Hauling", "Returning", "Loading", "Dumping"].includes(String(r.status))).length;
  const workshop = rows.filter((r) => r.status === "In workshop").length;
  const avgUtil = rows.reduce((s, r) => s + (r.utilisationSort as number), 0) / rows.length;
  return (
    <ModulePage title="All vehicles" subtitle="Every machine in the fleet · utilisation and fuel for the last 7 days">
      <StatStrip
        stats={[
          { label: "Fleet size", value: String(rows.length), hint: "5 vehicle classes", icon: Truck },
          { label: "Working now", value: String(live), hint: "hauling, loading or dumping", icon: Activity, tone: "good" },
          { label: "In workshop", value: String(workshop), hint: "see Maintenance", icon: Wrench, tone: "warn" },
          { label: "Avg utilisation", value: `${(avgUtil * 100).toFixed(0)}%`, hint: "productive / scheduled hours", icon: Gauge, tone: "info" },
        ]}
      />
      <DataTable columns={COLUMNS} rows={rows} filterKey="class" searchPlaceholder="Search vehicle, model or status" exportName="vehicles" />
    </ModulePage>
  );
}
