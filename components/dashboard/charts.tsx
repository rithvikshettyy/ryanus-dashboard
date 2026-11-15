"use client";

import { useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, Pie, PieChart, XAxis, YAxis } from "recharts";
import { BarChart3, Clock, Fuel, PieChart as PieIcon, TrendingUp } from "lucide-react";
import {
  ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig,
} from "@/components/ui/chart";
import { ChartTypePicker, type ChartType } from "@/components/ui/chart-type-picker";
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

/* ---------- Shared: one series chart that can be drawn as line, bar, area or pie ---------- */
const CHART_TYPES_ALL: ChartType[] = ["line", "bar", "area", "pie"];
const CHART_TYPES_RATIO: ChartType[] = ["line", "bar", "area"]; // a pie of "L per tonne" would be meaningless

interface SeriesProps {
  data: Record<string, number | string>[];
  classes: VehicleClass[];
  type: ChartType;
  yFormat?: (v: number) => string;
  yWidth?: number;
}

function SeriesChart({ data, classes, type, yFormat = fmt0, yWidth = 52 }: SeriesProps) {
  const config = classConfig(classes);
  const cls = "aspect-auto h-72 w-full";

  if (type === "pie") {
    // Pie = each class's total over the period, as a share of all selected classes
    const slices = classes.map((c) => ({
      key: c,
      value: Math.round(data.reduce((sum, r) => sum + Number(r[c] ?? 0), 0) * 100) / 100,
      fill: `var(--color-${c})`,
    }));
    return (
      <ChartContainer config={config} className={cls}>
        <PieChart accessibilityLayer>
          <ChartTooltip content={<ChartTooltipContent hideLabel nameKey="key" />} />
          <Pie data={slices} dataKey="value" nameKey="key" innerRadius="52%" outerRadius="82%" paddingAngle={2} strokeWidth={0} />
          <ChartLegend content={<ChartLegendContent nameKey="key" />} />
        </PieChart>
      </ChartContainer>
    );
  }

  const axes = (
    <>
      <CartesianGrid vertical={false} />
      <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" minTickGap={8} tickFormatter={shortLabel} />
      <YAxis
        {...axisProps}
        width={yWidth}
        domain={type === "bar" || type === "area" ? [0, "auto"] : ["auto", "auto"]}
        tickFormatter={yFormat}
      />
      <ChartTooltip content={<ChartTooltipContent />} />
      <ChartLegend content={<ChartLegendContent />} />
    </>
  );
  const margin = { left: 0, right: 12, top: 8 };

  return (
    <ChartContainer config={config} className={cls}>
      {type === "bar" ? (
        <BarChart data={data} margin={margin} accessibilityLayer>
          {axes}
          {classes.map((c) => (
            <Bar key={c} dataKey={c} fill={`var(--color-${c})`} radius={[4, 4, 0, 0]} />
          ))}
        </BarChart>
      ) : type === "area" ? (
        <AreaChart data={data} margin={margin} accessibilityLayer>
          {axes}
          {classes.map((c) => (
            <Area key={c} dataKey={c} type="monotone" stroke={`var(--color-${c})`} fill={`var(--color-${c})`} fillOpacity={0.15} strokeWidth={2.5} />
          ))}
        </AreaChart>
      ) : (
        <LineChart data={data} margin={margin} accessibilityLayer>
          {axes}
          {classes.map((c) => (
            <Line key={c} dataKey={c} type="monotone" stroke={`var(--color-${c})`} strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
          ))}
        </LineChart>
      )}
    </ChartContainer>
  );
}

/** Small donuts, one per row (used by the 100% charts when the user picks "pie"). */
function MiniDonuts({
  items,
  config,
}: {
  items: { title: string; slices: { key: string; value: number }[] }[];
  config: ChartConfig;
}) {
  return (
    <>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2 2xl:grid-cols-3">
        {items.map((it) => (
          <div key={it.title} className="min-w-0 text-center">
            <ChartContainer config={config} className="mx-auto aspect-square h-32">
              <PieChart accessibilityLayer>
                <ChartTooltip content={<ChartTooltipContent hideLabel nameKey="key" />} />
                <Pie
                  data={it.slices.map((s) => ({ ...s, fill: `var(--color-${s.key})` }))}
                  dataKey="value"
                  nameKey="key"
                  innerRadius="55%"
                  outerRadius="90%"
                  paddingAngle={2}
                  strokeWidth={0}
                />
              </PieChart>
            </ChartContainer>
            <p className="truncate text-xs font-medium text-muted-foreground">{it.title}</p>
          </div>
        ))}
      </div>
      <ul className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {Object.entries(config).map(([k, c]) => (
          <li key={k} className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm" style={{ background: c.color }} aria-hidden />
            {c.label}
          </li>
        ))}
      </ul>
    </>
  );
}

/* ---------- 1. Trend by shift with metric toggle ---------- */
type TrendMetric = "payloadT" | "fuelL" | "trips";
const TREND_META: Record<TrendMetric, { label: string; unit: string }> = {
  payloadT: { label: "Payload", unit: "t" },
  fuelL: { label: "Fuel", unit: "L" },
  trips: { label: "Trips", unit: "trips" },
};

export function TrendChart({ data, classes }: { data: DashboardData["trend"]; classes: VehicleClass[] }) {
  const [metric, setMetric] = useState<TrendMetric>("payloadT");
  const [type, setType] = useState<ChartType>("line");
  const meta = TREND_META[metric];
  return (
    <Panel className="flex flex-col">
      <PanelHeader
        icon={TrendingUp}
        title={`${meta.label} trend by shift`}
        description={
          type === "pie"
            ? `Share of total ${meta.label.toLowerCase()} (${meta.unit}) over the period, by class.`
            : `Unit: ${meta.unit} per shift (A 06 to 14, B 14 to 22, C 22 to 06).`
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Segmented
              label="Metric"
              value={metric}
              onChange={setMetric}
              options={(Object.keys(TREND_META) as TrendMetric[]).map((k) => ({ value: k, label: TREND_META[k].label }))}
            />
            <ChartTypePicker value={type} onChange={setType} types={CHART_TYPES_ALL} />
          </div>
        }
      />
      <SeriesChart data={data[metric]} classes={classes} type={type} />
    </Panel>
  );
}

/* ---------- 2. Share of the work (100% bars or donuts) ---------- */
export function ShareChart({ share, classes }: { share: DashboardData["share"]; classes: VehicleClass[] }) {
  const [type, setType] = useState<ChartType>("bar");
  const rows = share.map((s) => ({
    metric: s.metric,
    ...Object.fromEntries(s.values.map((v) => [v.cls, v.value])),
  }));
  return (
    <Panel className="flex flex-col">
      <PanelHeader
        icon={PieIcon}
        title="Workload distribution"
        description="Each bar or donut is 100% of that metric split between the selected classes. Hover for totals."
        actions={<ChartTypePicker value={type} onChange={setType} types={["bar", "pie"]} />}
      />
      {type === "pie" ? (
        <MiniDonuts
          config={classConfig(classes)}
          items={share.map((s) => ({ title: s.metric, slices: s.values.map((v) => ({ key: v.cls, value: v.value })) }))}
        />
      ) : (
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
      )}
    </Panel>
  );
}

/* ---------- 3. Fuel by shift ---------- */
export function FuelByShiftChart({ data, classes }: { data: DashboardData["trend"]["fuelL"]; classes: VehicleClass[] }) {
  const [type, setType] = useState<ChartType>("bar");
  return (
    <Panel className="flex flex-col">
      <PanelHeader
        icon={Fuel}
        title="Fuel consumption by shift"
        description={
          type === "pie"
            ? "Share of total litres (L) burned over the period, by class."
            : "Litres (L) burned per shift. Axis: 15·A = 15 Nov, shift A."
        }
        actions={<ChartTypePicker value={type} onChange={setType} types={CHART_TYPES_ALL} />}
      />
      <SeriesChart data={data} classes={classes} type={type} />
    </Panel>
  );
}

/* ---------- 4. Fuel efficiency by shift (L/t vs L/km) ---------- */
export function FuelEfficiencyChart({ trend, classes }: { trend: DashboardData["trend"]; classes: VehicleClass[] }) {
  const [metric, setMetric] = useState<"fuelPerTonne" | "fuelPerKm">("fuelPerTonne");
  const [type, setType] = useState<ChartType>("line");
  return (
    <Panel className="flex flex-col">
      <PanelHeader
        icon={BarChart3}
        title={`Fuel per ${metric === "fuelPerTonne" ? "tonne" : "km"} by shift`}
        description="Lower is better. A rising line means worse efficiency."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Segmented
              label="Efficiency unit"
              value={metric}
              onChange={setMetric}
              options={[
                { value: "fuelPerTonne", label: "L/t" },
                { value: "fuelPerKm", label: "L/km" },
              ]}
            />
            <ChartTypePicker value={type} onChange={setType} types={CHART_TYPES_RATIO} />
          </div>
        }
      />
      <SeriesChart data={trend[metric]} classes={classes} type={type} yWidth={44} yFormat={(v) => v.toFixed(2)} />
    </Panel>
  );
}

/* ---------- 5. Where the hours went (stacked 100% or donuts) ---------- */
const TIME_CONFIG: ChartConfig = {
  productive: { label: "Productive", color: "var(--productive)" },
  idle: { label: "Idle", color: "var(--idle)" },
  breakdown: { label: "Breakdown", color: "var(--breakdown)" },
};

export function TimeSplitChart({ split }: { split: DashboardData["timeSplit"] }) {
  const [type, setType] = useState<ChartType>("bar");
  return (
    <Panel className="flex flex-col">
      <PanelHeader
        icon={Clock}
        title="Equipment time utilisation"
        description="Share of scheduled hours: productive, idle or in breakdown."
        actions={<ChartTypePicker value={type} onChange={setType} types={["bar", "pie"]} />}
      />
      {type === "pie" ? (
        <MiniDonuts
          config={TIME_CONFIG}
          items={split.map((s) => ({
            title: s.label,
            slices: [
              { key: "productive", value: s.productive },
              { key: "idle", value: s.idle },
              { key: "breakdown", value: s.breakdown },
            ],
          }))}
        />
      ) : (
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
      )}
      <ul className="mt-3 grid gap-1.5 text-sm sm:grid-cols-2">
        {split.map((s) => {
          const total = s.productive + s.idle + s.breakdown;
          return (
            <li key={s.cls} className="flex flex-col gap-0.5 rounded-lg bg-muted/60 px-3 py-1.5 sm:flex-row sm:items-center sm:justify-between">
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
