import type { Metadata } from "next";
import { connection } from "next/server";
import { Fuel, Gauge, IndianRupee, SignalLow } from "lucide-react";
import { DataTable } from "@/components/modules/data-table";
import { ModulePage } from "@/components/modules/module-page";
import { StatStrip } from "@/components/modules/stat-strip";
import { currentTime } from "@/lib/alerts";
import { fmt0, fmt2, fmtINR } from "@/lib/format";
import { fuelRows, fuelStats } from "@/lib/fleet";
import type { TableColumn } from "@/lib/table";

export const metadata: Metadata = { title: "Fuel & telematics" };

const COLUMNS: TableColumn[] = [
  { key: "vehicle", label: "Vehicle", primary: true, sub: true },
  { key: "signal", label: "GPS signal", badge: true },
  { key: "fuelLevel", label: "Tank level", numeric: true },
  { key: "fuelUsed", label: "Fuel used", numeric: true },
  { key: "fuelPerT", label: "Fuel / tonne", numeric: true },
  { key: "cost", label: "Fuel cost", numeric: true },
  { key: "idle", label: "Idle share", numeric: true },
  { key: "engineTemp", label: "Engine temp", numeric: true },
  { key: "lastPing", label: "Last ping", numeric: true },
];

export default async function FuelTelematicsPage() {
  await connection();
  const now = currentTime();
  const s = fuelStats(now);
  return (
    <ModulePage title="Fuel & telematics" subtitle="Consumption, tank levels and device health · fuel totals for the last 7 days">
      <StatStrip
        stats={[
          { label: "Fuel used", value: `${fmt0(s.fuelL)} L`, hint: "whole fleet, 7 days", icon: Fuel },
          { label: "Fuel cost", value: fmtINR(s.costInr), hint: "at ₹92 per litre", icon: IndianRupee, tone: "info" },
          { label: "Fleet fuel / tonne", value: `${fmt2(s.perT)} L/t`, hint: "weighted by payload", icon: Gauge, tone: "good" },
          { label: "Needs attention", value: String(s.lowFuel + s.signalIssues), hint: `${s.lowFuel} low tank · ${s.signalIssues} signal`, icon: SignalLow, tone: s.lowFuel + s.signalIssues ? "warn" : "good" },
        ]}
      />
      <DataTable columns={COLUMNS} rows={fuelRows(now)} filterKey="signal" searchPlaceholder="Search vehicle or class" exportName="fuel-telematics" />
    </ModulePage>
  );
}
