import type { Metadata } from "next";
import { CircleCheck, Clock, PackageCheck, Truck } from "lucide-react";
import { DataTable } from "@/components/modules/data-table";
import { ModulePage } from "@/components/modules/module-page";
import { StatStrip } from "@/components/modules/stat-strip";
import { fmt0 } from "@/lib/format";
import { shipmentRows, shipmentStats } from "@/lib/fleet";
import type { TableColumn } from "@/lib/table";

export const metadata: Metadata = { title: "Shipments & deliveries" };

const COLUMNS: TableColumn[] = [
  { key: "shipment", label: "Shipment", primary: true, sub: true },
  { key: "status", label: "Status", badge: true },
  { key: "route", label: "From → to" },
  { key: "qty", label: "Quantity", numeric: true },
  { key: "trucks", label: "Trucks", numeric: true },
  { key: "time", label: "ETA / delivered" },
  { key: "slip", label: "Weighbridge slip" },
];

export default function ShipmentsPage() {
  const s = shipmentStats();
  return (
    <ModulePage title="Shipments & deliveries" subtitle="Coal and overburden movements for today's shifts">
      <StatStrip
        stats={[
          { label: "Dispatched today", value: `${fmt0(s.dispatched)} t`, hint: "loading, in transit, delivered", icon: Truck },
          { label: "In transit", value: `${fmt0(s.inTransit)} t`, hint: "on the road or loading", icon: Clock, tone: "info" },
          { label: "Delivered", value: `${fmt0(s.delivered)} t`, hint: "weighbridge confirmed", icon: PackageCheck, tone: "good" },
          { label: "Delayed", value: String(s.delayed), hint: s.delayed ? "shipment behind plan" : "all on time", icon: CircleCheck, tone: s.delayed ? "bad" : "good" },
        ]}
      />
      <DataTable columns={COLUMNS} rows={shipmentRows()} filterKey="status" searchPlaceholder="Search shipment, material or destination" exportName="shipments" />
    </ModulePage>
  );
}
