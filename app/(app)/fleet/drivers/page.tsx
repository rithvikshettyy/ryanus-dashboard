import type { Metadata } from "next";
import { IdCard, ShieldCheck, UserCheck, Users } from "lucide-react";
import { DataTable } from "@/components/modules/data-table";
import { ModulePage } from "@/components/modules/module-page";
import { StatStrip } from "@/components/modules/stat-strip";
import { driverRows, driverStats } from "@/lib/fleet";
import type { TableColumn } from "@/lib/table";

export const metadata: Metadata = { title: "Driver directory" };

const COLUMNS: TableColumn[] = [
  { key: "driver", label: "Driver", primary: true, sub: true },
  { key: "status", label: "Status", badge: true },
  { key: "assigned", label: "Assigned to" },
  { key: "shift", label: "Shift" },
  { key: "experience", label: "Experience", numeric: true },
  { key: "safety", label: "Safety score", numeric: true },
  { key: "licence", label: "Licence valid till", numeric: true },
];

export default function DriversPage() {
  const s = driverStats();
  return (
    <ModulePage title="Driver directory" subtitle="Operators are shown by anonymous alias, no personal details">
      <StatStrip
        stats={[
          { label: "Drivers", value: String(s.total), hint: "in the directory", icon: Users },
          { label: "On shift", value: String(s.onShift), hint: "logged in now", icon: UserCheck, tone: "good" },
          { label: "Avg safety score", value: `${s.avgSafety.toFixed(0)}/100`, hint: "overspeed, braking, idling", icon: ShieldCheck, tone: "info" },
          { label: "Licences expiring", value: String(s.expiring), hint: "within 90 days", icon: IdCard, tone: s.expiring ? "warn" : "good" },
        ]}
      />
      <DataTable columns={COLUMNS} rows={driverRows()} filterKey="status" searchPlaceholder="Search alias, truck or shift" exportName="drivers" />
    </ModulePage>
  );
}
