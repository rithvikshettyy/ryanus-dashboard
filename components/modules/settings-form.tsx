"use client";

import { useState } from "react";
import { Bell, Gauge, MapPin, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { cn } from "@/lib/utils";

const THRESHOLDS = [
  { key: "overspeed", label: "Speed limit", unit: "km/h", value: 30 },
  { key: "coolant", label: "Coolant temperature", unit: "°C", value: 95 },
  { key: "engine", label: "Engine temperature", unit: "°C", value: 100 },
  { key: "fuel", label: "Low fuel", unit: "%", value: 15 },
  { key: "offline", label: "Offline after", unit: "min", value: 5 },
];

const TOGGLES = [
  { key: "critical", label: "Critical alerts", text: "Pop up immediately, even in the background", on: true },
  { key: "warning", label: "Warnings", text: "Show in the bell, no pop up", on: true },
  { key: "digest", label: "Shift summary", text: "A short report at the end of each shift", on: false },
  { key: "sound", label: "Alert sound", text: "Play a tone for critical alerts", on: false },
];

function Switch({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className="flex h-10 w-12 shrink-0 items-center justify-center"
    >
      <span className={cn("flex h-6 w-11 items-center rounded-full p-0.5 transition-colors", checked ? "bg-primary" : "bg-border")}>
        <span className={cn("size-5 rounded-full bg-white shadow transition-transform", checked && "translate-x-5")} />
      </span>
    </button>
  );
}

export function SettingsForm() {
  const [values, setValues] = useState(() => Object.fromEntries(THRESHOLDS.map((t) => [t.key, String(t.value)])));
  const [toggles, setToggles] = useState(() => Object.fromEntries(TOGGLES.map((t) => [t.key, t.on])));
  const [units, setUnits] = useState<"metric" | "imperial">("metric");

  const save = () => toast.success("Settings saved");

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel>
        <PanelHeader icon={Gauge} title="Alert thresholds" description="An alert fires when a reading crosses these limits" />
        <div className="space-y-3">
          {THRESHOLDS.map((t) => (
            <label key={t.key} className="flex items-center gap-3">
              <span className="flex-1 text-sm font-medium">{t.label}</span>
              <span className="relative">
                <input
                  type="number"
                  inputMode="numeric"
                  value={values[t.key]}
                  onChange={(e) => setValues((v) => ({ ...v, [t.key]: e.target.value }))}
                  className="num h-10 w-28 rounded-lg border bg-background pl-3 pr-12 text-right text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{t.unit}</span>
              </span>
            </label>
          ))}
        </div>
      </Panel>

      <Panel>
        <PanelHeader icon={Bell} title="Notifications" description="What reaches you and how" />
        <ul className="divide-y">
          {TOGGLES.map((t) => (
            <li key={t.key} className="flex items-center gap-3 py-1.5">
              <span className="min-w-0 flex-1 text-sm">
                <span className="block font-medium">{t.label}</span>
                <span className="block text-xs text-muted-foreground">{t.text}</span>
              </span>
              <Switch label={t.label} checked={toggles[t.key]} onChange={() => setToggles((s) => ({ ...s, [t.key]: !s[t.key] }))} />
            </li>
          ))}
        </ul>
      </Panel>

      <Panel>
        <PanelHeader icon={MapPin} title="Site and display" description="Applies to every screen" />
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Site</dt><dd className="font-medium">Faridabad, Haryana</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Time zone</dt><dd className="font-medium">IST (UTC+05:30)</dd></div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">Units</dt>
            <dd className="flex rounded-lg border p-0.5" role="group" aria-label="Units">
              {(["metric", "imperial"] as const).map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setUnits(u)}
                  aria-pressed={units === u}
                  className={cn("h-9 rounded-md px-3 text-sm font-medium capitalize", units === u ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}
                >
                  {u}
                </button>
              ))}
            </dd>
          </div>
        </dl>
      </Panel>

      <div className="flex items-end justify-end">
        <Button className="h-11 w-full gap-2 sm:w-auto" onClick={save}>
          <Save className="size-4" aria-hidden /> Save changes
        </Button>
      </div>
    </div>
  );
}
