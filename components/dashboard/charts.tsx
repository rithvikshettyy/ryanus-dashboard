"use client";

import { useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { BarChart3, Clock, Fuel, PieChart as PieIcon, TrendingUp } from "lucide-react";
import {
  ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig,
} from "@/components/ui/chart";
import { ChartTypePicker, type ChartType } from "@/components/ui/chart-type-picker";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { Segmented } from "@/components/ui/segmented";
import type { DashboardData, ClassSummary } from "@/lib/analytics";
import { CLASS_CONFIG } from "@/lib/constants";
import { useT } from "@/components/i18n-provider";
import { fmt0, fmtPct } from "@/lib/format";
import type { TFn } from "@/lib/i18n";
import type { VehicleClass } from "@/lib/types";

function classConfig(classes: VehicleClass[], t: TFn): ChartConfig {
  return Object.fromEntries(classes.map((c) => [c, { label: t(CLASS_CONFIG[c].label), color: CLASS_CONFIG[c].color }]));
}

// "13 Nov · A" (or "13 नव॰ · A") -> "13·A": drop the month word so axis ticks stay short in either language
const shortLabel = (l: string) => l.replace(/^(\d+)\s+\S+\s+·\s+/, "$1·");
const axisProps = { tickLine: false, axisLine: false, tickMargin: 8 } as const;

/* ---------- Shared: one series chart drawn as line, bar or area ---------- */
const TREND_TYPES: ChartType[] = ["line", "bar", "area"];

interface SeriesProps {
  data: Record<string, number | string>[];
  classes: VehicleClass[];
  type: Exclude<ChartType, "pie">;
  /** Unit shown on every Y tick, so a bare "4,200" never has to be guessed ("t", "L", "L/t"). */
  unit: string;
  yFormat?: (v: number) => string;
  yWidth?: number;
}

function SeriesChart({ data, classes, type, unit, yFormat = fmt0, yWidth = 64 }: SeriesProps) {
  const t = useT();
  const config = classConfig(classes, t);
  const cls = "aspect-auto h-72 w-full";
  const u = t(unit);

  const axes = (
    <>
      <CartesianGrid vertical={false} />
      <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" minTickGap={8} tickFormatter={shortLabel} />
      <YAxis
        {...axisProps}
        width={yWidth}
        domain={type === "line" ? ["auto", "auto"] : [0, "auto"]}
        tickFormatter={(v: number) => `${yFormat(v)} ${u}`}
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
            <Area key={c} dataKey={c} type="monotone" stroke={`var(--color-${c})`} fill={`var(--color-${c})`} fillOpacity={0.15} strokeWidth={2.5} isAnimationActive={false} />
          ))}
        </AreaChart>
      ) : (
        <LineChart data={data} margin={margin} accessibilityLayer>
          {axes}
          {classes.map((c) => (
            <Line key={c} dataKey={c} type="monotone" stroke={`var(--color-${c})`} strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} isAnimationActive={false} />
          ))}
        </LineChart>
      )}
    </ChartContainer>
  );
}

/* ---------- 1. Trend by shift with metric toggle (the only chart with a type picker) ---------- */
type TrendMetric = "payloadT" | "fuelL" | "trips";
const TREND_META: Record<TrendMetric, { label: string; unit: string }> = {
  payloadT: { label: "Payload", unit: "t" },
  fuelL: { label: "Fuel", unit: "L" },
  trips: { label: "Trips", unit: "trips" },
};

export function TrendChart({ data, classes }: { data: DashboardData["trend"]; classes: VehicleClass[] }) {
  const t = useT();
  const [metric, setMetric] = useState<TrendMetric>("payloadT");
  const [type, setType] = useState<Exclude<ChartType, "pie">>("line");
  const meta = TREND_META[metric];
  return (
    <Panel className="flex flex-col">
      <PanelHeader
        icon={TrendingUp}
        title={t("{metric} trend by shift", { metric: t(meta.label) })}
        description={t("Unit: {unit} per shift (A 06 to 14, B 14 to 22, C 22 to 06).", { unit: t(meta.unit) })}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Segmented
              label="Metric"
              value={metric}
              onChange={setMetric}
              options={(Object.keys(TREND_META) as TrendMetric[]).map((k) => ({ value: k, label: TREND_META[k].label }))}
            />
            <ChartTypePicker value={type} onChange={(v) => v !== "pie" && setType(v)} types={TREND_TYPES} />
          </div>
        }
      />
      <SeriesChart data={data[metric]} classes={classes} type={type} unit={meta.unit} />
    </Panel>
  );
}

/* ---------- 2. Share of the work (100% bars) ---------- */
export function ShareChart({ share, classes }: { share: DashboardData["share"]; classes: VehicleClass[] }) {
  const t = useT();
  const rows = share.map((s) => ({
    metric: s.metric,
    ...Object.fromEntries(s.values.map((v) => [v.cls, v.value])),
  }));
  return (
    <Panel className="flex flex-col">
      <PanelHeader
        icon={PieIcon}
        title="Workload distribution"
        description="Each bar is 100% of that metric, split between the selected classes. Hover for totals."
      />
      <ChartContainer config={classConfig(classes, t)} className="aspect-auto h-72 w-full">
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

/* ---------- 3. Fuel by shift (grouped bars: a class-to-class volume comparison) ---------- */
export function FuelByShiftChart({ data, classes }: { data: DashboardData["trend"]["fuelL"]; classes: VehicleClass[] }) {
  const t = useT();
  const first = data[0]?.label ?? "";
  return (
    <Panel className="flex flex-col">
      <PanelHeader
        icon={Fuel}
        title="Fuel consumption by shift"
        // The axis example comes from the data itself, so it always matches the selected period.
        description={t("Litres (L) burned per shift. Axis: {example}.", { example: `${shortLabel(first)} = ${first}` })}
      />
      <SeriesChart data={data} classes={classes} type="bar" unit="L" />
    </Panel>
  );
}

/* ---------- 4. Fuel efficiency by shift (L/t vs L/km) ---------- */
export function FuelEfficiencyChart({ trend, classes }: { trend: DashboardData["trend"]; classes: VehicleClass[] }) {
  const [metric, setMetric] = useState<"fuelPerTonne" | "fuelPerKm">("fuelPerTonne");
  const t = useT();
  return (
    <Panel className="flex flex-col">
      <PanelHeader
        icon={BarChart3}
        title={t(metric === "fuelPerTonne" ? "Fuel per tonne by shift" : "Fuel per km by shift")}
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
      <SeriesChart
        data={trend[metric]}
        classes={classes}
        type="line"
        unit={metric === "fuelPerTonne" ? "L/t" : "L/km"}
        yWidth={76}
        yFormat={(v) => v.toFixed(2)}
      />
    </Panel>
  );
}

/* ---------- 5. Where the hours went (stacked 100% bars) ---------- */
const TIME_CONFIG: ChartConfig = {
  productive: { label: "Productive", color: "var(--productive)" },
  idle: { label: "Idle", color: "var(--idle)" },
  breakdown: { label: "Breakdown", color: "var(--breakdown)" },
};

export function TimeSplitChart({ split }: { split: DashboardData["timeSplit"] }) {
  const t = useT();
  // Labels translated here (module-level config is English)
  const timeConfig: ChartConfig = Object.fromEntries(
    Object.entries(TIME_CONFIG).map(([k, c]) => [k, { ...c, label: typeof c.label === "string" ? t(c.label) : c.label }]),
  );
  return (
    <Panel className="flex flex-col">
      <PanelHeader
        icon={Clock}
        title="Equipment time utilisation"
        description="Share of scheduled hours: productive, idle or in breakdown."
      />
      <ChartContainer config={timeConfig} className="aspect-auto h-56 w-full">
        <BarChart data={split} layout="vertical" stackOffset="expand" margin={{ left: 8, right: 12 }} accessibilityLayer>
          <CartesianGrid horizontal={false} />
          <YAxis dataKey="label" type="category" {...axisProps} width={104} />
          <XAxis type="number" {...axisProps} tickFormatter={(v: number) => fmtPct(v)} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar dataKey="productive" stackId="t" fill="var(--color-productive)" />
          <Bar dataKey="idle" stackId="t" fill="var(--color-idle)" />
          <Bar dataKey="breakdown" stackId="t" fill="var(--color-breakdown)" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ChartContainer>
      {/* Own legend so the order always matches the stack: productive, idle, breakdown */}
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {Object.entries(timeConfig).map(([k, c]) => (
          <li key={k} className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm" style={{ background: c.color }} aria-hidden />
            {c.label}
          </li>
        ))}
      </ul>
      <ul className="mt-3 grid gap-1.5 text-sm sm:grid-cols-2">
        {split.map((s) => {
          const total = s.productive + s.idle + s.breakdown;
          return (
            <li key={s.cls} className="rounded-lg bg-muted/60 px-3 py-2">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="num flex flex-wrap gap-x-3 whitespace-nowrap font-medium">
                <span>{t("{p} productive", { p: fmtPct(total ? s.productive / total : 0) })}</span>
                {/* breakdown is a thin sliver in the bar, so it is called out here in words and in red */}
                <span className="text-bad">{t("{b} breakdown", { b: fmtPct(total ? s.breakdown / total : 0) })}</span>
              </p>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

export type { ClassSummary };
