// Union types: a value can only be one of these strings. Typos become compile errors.
export type VehicleClass = "coal-dumper" | "ob-dumper" | "heavy-dumper" | "tipper" | "adt";
export type ShiftId = "A" | "B" | "C";

export interface Vehicle {
  id: string; // e.g. "CD 01"
  vehicleClass: VehicleClass;
}

// One row = one vehicle in one shift. Everything else is derived from these rows.
export interface ShiftRecord {
  vehicleId: string;
  vehicleClass: VehicleClass;
  date: string; // "2026-11-13" (ISO date, no time)
  shift: ShiftId;
  trips: number;
  payloadTonnes: number;
  distanceKm: number;
  fuelLitres: number;
  productiveHours: number;
  idleHours: number;
  breakdownHours: number;
}

export type EquipmentType = "truck" | "dumper" | "excavator" | "dozer";
export type AlertType =
  | "overspeed" | "underload" | "coolant-temp" | "engine-temp" | "low-fuel"
  | "offline" | "tyre-pressure" | "geofence" | "excess-idle";
export type Severity = "critical" | "warning" | "info";
export type AlertStatus = "active" | "acknowledged" | "resolved";

export interface AlertMetric {
  actual: number;
  threshold: number;
  unit: string;
  breach: "above" | "below"; // overspeed = above limit, low fuel = below limit
}

// Shape stored in alerts.json (minutesAgo is easy to write by hand)
export interface RawAlert {
  id: string;
  equipmentId: string;
  equipmentName: string;
  equipmentType: EquipmentType;
  type: AlertType;
  title: string;
  severity: Severity;
  status: AlertStatus;
  metric: AlertMetric;
  minutesAgo: number;
  location: string;
  operator?: string;
  action: string;
}

// Shape used in the UI: minutesAgo converted to a real timestamp at load time
export interface Alert extends Omit<RawAlert, "minutesAgo"> {
  createdAt: number; // ms since epoch
}
