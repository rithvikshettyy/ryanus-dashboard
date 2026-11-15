import { titleMeta } from "@/lib/i18n/server";
import { CalendarClock, IndianRupee, TriangleAlert, Wrench } from "lucide-react";
import { DataTable } from "@/components/modules/data-table";
import { ModulePage } from "@/components/modules/module-page";
import { StatStrip } from "@/components/modules/stat-strip";
import { fmtINR } from "@/lib/format";
import { jobRows, jobStats } from "@/lib/fleet";
import type { TableColumn } from "@/lib/table";

export const generateMetadata = titleMeta("Maintenance & repairs");

const COLUMNS: TableColumn[] = [
  { key: "order", label: "Work order", primary: true, sub: true },
  { key: "vehicle", label: "Vehicle" },
  { key: "type", label: "Type" },
  { key: "priority", label: "Priority", badge: true },
  { key: "status", label: "Status", badge: true },
  { key: "due", label: "Due" },
  { key: "downtime", label: "Downtime", numeric: true },
  { key: "cost", label: "Est. cost", numeric: true },
  { key: "bay", label: "Location" },
];

export default function MaintenancePage() {
  const s = jobStats();
  return (
    <ModulePage title="Maintenance & repairs" subtitle="Work orders, planned downtime and workshop load">
      <StatStrip
        stats={[
          { label: "Open work orders", value: String(s.open), hint: `${s.inProgress} in progress`, icon: Wrench, tone: "info" },
          { label: "Overdue", value: String(s.overdue), hint: s.overdue ? "needs a supervisor" : "none", icon: TriangleAlert, tone: s.overdue ? "bad" : "good" },
          { label: "Planned downtime", value: `${s.downtimeH} h`, hint: "across open orders", icon: CalendarClock, tone: "warn" },
          { label: "Estimated cost", value: fmtINR(s.costInr), hint: "all listed orders", icon: IndianRupee },
        ]}
      />
      <DataTable columns={COLUMNS} rows={jobRows()} filterKey="status" searchPlaceholder="Search work order, vehicle or task" exportName="work-orders" />
    </ModulePage>
  );
}
