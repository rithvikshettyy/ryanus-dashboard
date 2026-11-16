"use client";

import { useState } from "react";
import { Bell, Gauge, MapPin, Save, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/components/i18n-provider";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
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
  const t = useT();
  const [values, setValues] = useState(() => Object.fromEntries(THRESHOLDS.map((x) => [x.key, String(x.value)])));
  const [toggles, setToggles] = useState(() => Object.fromEntries(TOGGLES.map((x) => [x.key, x.on])));
  const [units, setUnits] = useState<"metric" | "imperial">("metric");

  // "Saved" snapshot: what the form looked like at the last save. dirty = current differs from it.
  const snapshot = JSON.stringify({ values, toggles, units });
  const [saved, setSaved] = useState(snapshot);
  const dirty = snapshot !== saved;
  const { pending, stay, leave } = useUnsavedChanges(dirty);

  const save = () => {
    setSaved(snapshot);
    toast.success(t("Settings saved"));
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel>
        <PanelHeader icon={Gauge} title="Alert thresholds" description="An alert fires when a reading crosses these limits" />
        <div className="space-y-3">
          {THRESHOLDS.map((x) => (
            <label key={x.key} className="flex items-center gap-3">
              <span className="flex-1 text-sm font-medium">{t(x.label)}</span>
              <span className="relative">
                <input
                  type="number"
                  inputMode="numeric"
                  value={values[x.key]}
                  onChange={(e) => setValues((v) => ({ ...v, [x.key]: e.target.value }))}
                  className="num h-10 w-28 rounded-lg border bg-background pl-3 pr-12 text-right text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{t(x.unit)}</span>
              </span>
            </label>
          ))}
        </div>
      </Panel>

      <Panel>
        <PanelHeader icon={Bell} title="Notifications" description="What reaches you and how" />
        <ul className="divide-y">
          {TOGGLES.map((x) => (
            <li key={x.key} className="flex items-center gap-3 py-1.5">
              <span className="min-w-0 flex-1 text-sm">
                <span className="block font-medium">{t(x.label)}</span>
                <span className="block text-xs text-muted-foreground">{t(x.text)}</span>
              </span>
              <Switch label={t(x.label)} checked={toggles[x.key]} onChange={() => setToggles((s) => ({ ...s, [x.key]: !s[x.key] }))} />
            </li>
          ))}
        </ul>
      </Panel>

      <Panel>
        <PanelHeader icon={MapPin} title="Site and display" description="Applies to every screen" />
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between gap-4"><dt className="text-muted-foreground">{t("Site")}</dt><dd className="font-medium">{t("Faridabad, Haryana")}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-muted-foreground">{t("Time zone")}</dt><dd className="font-medium">{t("IST (UTC+05:30)")}</dd></div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">{t("Language")}</dt>
            <dd className="w-52"><LanguageSwitcher /></dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">{t("Units")}</dt>
            <dd className="flex rounded-lg border p-0.5" role="group" aria-label={t("Units")}>
              {(["metric", "imperial"] as const).map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setUnits(u)}
                  aria-pressed={units === u}
                  className={cn("h-10 rounded-md px-3 text-sm font-medium capitalize", units === u ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}
                >
                  {t(u)}
                </button>
              ))}
            </dd>
          </div>
        </dl>
      </Panel>

      <div className="flex flex-col items-stretch justify-end gap-2 sm:flex-row sm:items-center sm:justify-end sm:self-end">
        {dirty && (
          <span role="status" className="flex items-center gap-1.5 rounded-md bg-warn-bg px-2.5 py-1.5 text-sm font-medium text-warn">
            <TriangleAlert className="size-4" aria-hidden /> {t("Unsaved changes")}
          </span>
        )}
        <Button className="h-11 w-full gap-2 sm:w-auto" onClick={save} disabled={!dirty}>
          <Save className="size-4" aria-hidden /> {t("Save changes")}
        </Button>
      </div>

      <Dialog open={pending !== null} onOpenChange={(o) => !o && stay()}>
        <DialogContent>
          <DialogTitle>{t("Leave without saving?")}</DialogTitle>
          <DialogDescription>{t("You have unsaved changes. If you leave now they will be lost.")}</DialogDescription>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" className="h-10" onClick={stay}>
              {t("Stay on page")}
            </Button>
            <Button variant="destructive" className="h-10" onClick={leave}>
              {t("Discard and leave")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
