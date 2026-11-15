"use client";

import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { BarChart3, Clock, Fuel, PieChart, TrendingUp } from "lucide-react";
import {
  ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig,
} from "@/components/ui/chart";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { Segmented } from "@/components/ui/segmented";
import type { DashboardData, ClassSummary } from "@/lib/analytics";
import { CLASS_CONFIG } from "@/lib/constants";
import { fmt0, fmtPct } from "@/lib/format";
import type { VehicleClass } from "@/lib/types";

function classConfig(classes: VehicleClass[]): ChartConfig {
  return Object.fromEntries(classes.map((c) => [c, { label: CLASS_CONFIG[c].label, color: CLASS_CONFIG[c].color }]));
}

const shortLabel = (l: string) => l.replace(" Nov", "").replace(" · ", "·");
const axisProps = { tickLine: false, axisLine: false, tickMargin: 8 } as const;

/* ---------- 1. Trend by shift (line) with metric toggle ---------- */
type TrendMetric = "payloadT" | "fuelL" | "trips";
const TREND_META: Record<TrendMetric, { label: string; unit: string }> = {
  payloadT: { label: "Payload", unit: "t" },
  fuelL: { label: "Fuel", unit: "L" },
  trips: { label: "Trips", unit: "trips" },
};

export function TrendChart({ data, classes }: { data: DashboardData["trend"]; classes: VehicleClass[] }) {
  const [metric, setMetric] = useState<TrendMetric>("payloadT");
  const meta = TREND_META[metric];
  return (
    <Panel className="flex flex-col">
      <PanelHeader
        icon={TrendingUp}
        title={`${meta.label} by shift`}
        description={`Unit: ${meta.unit} per shift (A 06 to 14, B 14 to 22, C 22 to 06). Lines show trend over the period.`}
        actions={
          <Segmented
            label="Metric"
            value={metric}
            onChange={setMetric}
            options={(Object.keys(TREND_META) as TrendMetric[]).map((k) => ({ value: k, label: TREND_META[k].label }))}
          />
        }
      />
      <ChartContainer config={classConfig(classes)} className="aspect-auto h-72 w-full">
        <LineChart data={data[metric]} margin={{ left: 0, right: 12, top: 8 }} accessibilityLayer>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" minTickGap={8} tickFormatter={shortLabel} />
          <YAxis {...axisProps} width={52} tickFormatter={(v: number) => fmt0(v)} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <ChartLegend content={<ChartLegendContent />} />
          {classes.map((c) => (
            <Line key={c} dataKey={c} type="monotone" stroke={`var(--color-${c})`} strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
          ))}
        </LineChart>
      </ChartContainer>
    </Panel>
  );
}

/* ---------- 2. Share of the work (100% bars) ---------- */
export function ShareChart({ share, classes }: { share: DashboardData["share"]; classes: VehicleClass[] }) {
  const rows = share.map((s) => ({
    metric: s.metric,
    ...Object.fromEntries(s.values.map((v) => [v.cls, v.value])),
  }));
  return (
    <Panel className="flex flex-col">
      <PanelHeader icon={PieChart} title="Share of the work" description="Each bar is 100% of that metric split between the selected classes. Hover for totals." />
      <ChartContainer config={classConfig(classes)} className="aspect-auto h-72 w-full">
        <BarChart data={rows} layout="vertical" stackOffset="expand" margin={{ left: 8, right: 12 }} accessibilityLayer>
          <CartesianGrid horizontal={false} />
          <YAxis dataKey="metric" type="category" {...axisProps} width={112} />
          <XAxis type="number" {...axisProps} tickFormatter={(v: number) => fmtPct(v)} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <ChartLegend content={<ChartLegendContent />} />
          {classes.map((c) => (
            <Bar key={c} dataKey={c} stackId="share" fill={`var(--color-${c})`} radius={2} />
          ))}
        </BarChart>
      </ChartContainer>
    </Panel>
  );
}

/* ---------- 3. Fuel by shift (grouped bars) ---------- */
export function FuelByShiftChart({ data, classes }: { data: DashboardData["trend"]["fuelL"]; classes: VehicleClass[] }) {
  return (
    <Panel className="flex flex-col">
      <PanelHeader icon={Fuel} title="Fuel by shift" description="Litres (L) burned per shift, grouped by class. Axis: 13·A = 13 Nov, shift A." />
      <ChartContainer config={classConfig(classes)} className="aspect-auto h-72 w-full">
        <BarChart data={data} margin={{ left: 0, right: 8, top: 8 }} accessibilityLayer>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" minTickGap={8} tickFormatter={shortLabel} />
          <YAxis {...axisProps} width={52} tickFormatter={(v: number) => fmt0(v)} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <ChartLegend content={<ChartLegendContent />} />
          {classes.map((c) => (
            <Bar key={c} dataKey={c} fill={`var(--color-${c})`} radius={[4, 4, 0, 0]} />
          ))}
        </BarChart>
      </ChartContainer>
    </Panel>
  );
}

/* ---------- 4. Fuel efficiency by shift (lines, L/t vs L/km) ---------- */
export function FuelEfficiencyChart({ trend, classes }: { trend: DashboardData["trend"]; classes: VehicleClass[] }) {
  const [metric, setMetric] = useState<"fuelPerTonne" | "fuelPerKm">("fuelPerTonne");
  return (
    <Panel className="flex flex-col">
      <PanelHeader
        icon={BarChart3}
        title={`Fuel per ${metric === "fuelPerTonne" ? "tonne" : "km"} by shift`}
        description="Lower is better. A rising line means worse efficiency."
        actions={
          <Segmented
            label="Efficiency unit"
            value={metric}
            onChange={setMetric}
            options={[
              { value: "fuelPerTonne", label: "L/t" },
              { value: "fuelPerKm", label: "L/km" },
            ]}
          />
        }
      />
      <ChartContainer config={classConfig(classes)} className="aspect-auto h-72 w-full">
        <LineChart data={trend[metric]} margin={{ left: 0, right: 12, top: 8 }} accessibilityLayer>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" minTickGap={8} tickFormatter={shortLabel} />
          <YAxis {...axisProps} width={44} domain={["auto", "auto"]} tickFormatter={(v: number) => v.toFixed(2)} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <ChartLegend content={<ChartLegendContent />} />
          {classes.map((c) => (
            <Line key={c} dataKey={c} type="monotone" stroke={`var(--color-${c})`} strokeWidth={2.5} dot={{ r: 3 }} />
          ))}
        </LineChart>
      </ChartContainer>
    </Panel>
  );
}

/* ---------- 5. Where the hours went (stacked 100%) ---------- */
const TIME_CONFIG: ChartConfig = {
  productive: { label: "Productive", color: "var(--productive)" },
  idle: { label: "Idle", color: "var(--idle)" },
  breakdown: { label: "Breakdown", color: "var(--breakdown)" },
};

export function TimeSplitChart({ split }: { split: DashboardData["timeSplit"] }) {
  return (
    <Panel className="flex flex-col">
      <PanelHeader icon={Clock} title="Where the hours went" description="Share of scheduled hours: productive, idle or in breakdown." />
      <ChartContainer config={TIME_CONFIG} className="aspect-auto h-56 w-full">
        <BarChart data={split} layout="vertical" stackOffset="expand" margin={{ left: 8, right: 12 }} accessibilityLayer>
          <CartesianGrid horizontal={false} />
          <YAxis dataKey="label" type="category" {...axisProps} width={104} />
          <XAxis type="number" {...axisProps} tickFormatter={(v: number) => fmtPct(v)} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <ChartLegend content={<ChartLegendContent />} />
          <Bar dataKey="productive" stackId="t" fill="var(--color-productive)" />
          <Bar dataKey="idle" stackId="t" fill="var(--color-idle)" />
          <Bar dataKey="breakdown" stackId="t" fill="var(--color-breakdown)" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ChartContainer>
      <ul className="mt-3 grid gap-1.5 text-sm sm:grid-cols-2">
        {split.map((s) => {
          const total = s.productive + s.idle + s.breakdown;
          return (
            <li key={s.cls} className="flex items-center justify-between rounded-lg bg-muted/60 px-3 py-1.5">
              <span className="text-muted-foreground">{s.label}</span>
              <span className="num">
                {fmtPct(total ? s.productive / total : 0)} productive · {fmtPct(total ? s.breakdown / total : 0)} breakdown
              </span>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

export type { ClassSummary };
