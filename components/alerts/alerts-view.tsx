"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCheck, ShieldCheck, SearchX } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { useDebounce } from "@/hooks/use-debounce";
import { applyStatuses, useAlertStatuses } from "@/hooks/use-alert-statuses";
import { useNow } from "@/hooks/use-now";
import {
  DEFAULT_ALERT_FILTERS, filterAlerts, matchesStatus, sortAlerts, type AlertFilters, type StatusFilter,
} from "@/lib/alert-filters";
import type { Alert } from "@/lib/types";
import { AlertCard, type AlertActions } from "./alert-card";
import { AlertFiltersBar } from "./alert-filters";
import { AlertSheet } from "./alert-sheet";
import { ResolveDialog, type ResolveReason } from "./resolve-dialog";
import { StatCards, type QuickFilter } from "./stat-cards";

export function AlertsView({
  initialAlerts,
  serverNow,
  initialOpenId,
}: {
  initialAlerts: Alert[];
  serverNow: number;
  initialOpenId: string | null;
}) {
  const t = useT();
  const router = useRouter();
  // Status changes live in a shared store (not local state) so the sidebar badge and bell update too.
  const { overrides, setStatus } = useAlertStatuses();
  const alerts = useMemo(() => applyStatuses(initialAlerts, overrides), [initialAlerts, overrides]);
  const [filters, setFilters] = useState<AlertFilters>(DEFAULT_ALERT_FILTERS);
  const [selectedId, setSelectedId] = useState<string | null>(initialOpenId);
  // A notification link (?open=id) can arrive while this page is already mounted.
  // Adjusting state during render (instead of in an effect) is React's recommended pattern for that.
  const [seenOpenId, setSeenOpenId] = useState(initialOpenId);
  if (initialOpenId !== seenOpenId) {
    setSeenOpenId(initialOpenId);
    if (initialOpenId) setSelectedId(initialOpenId);
  }
  const now = useNow(serverNow);

  // Debounce: filtering waits 300ms after the last keystroke instead of running on every key.
  const debouncedSearch = useDebounce(filters.search, 300);

  const visible = useMemo(
    () => sortAlerts(filterAlerts(alerts, filters, debouncedSearch, now)),
    [alerts, filters, debouncedSearch, now],
  );

  const counts = useMemo(() => {
    const c = {} as Record<StatusFilter, number>;
    (["open", "unacknowledged", "acknowledged", "resolved", "all"] as StatusFilter[]).forEach((s) => {
      c[s] = alerts.filter((a) => matchesStatus(a, s)).length;
    });
    return c;
  }, [alerts]);

  const change = useCallback((patch: Partial<AlertFilters>) => setFilters((f) => ({ ...f, ...patch })), []);

  function quickFilter(k: QuickFilter) {
    if (k === "active") setFilters({ ...DEFAULT_ALERT_FILTERS, status: "open" });
    if (k === "critical") setFilters({ ...DEFAULT_ALERT_FILTERS, status: "open", severity: ["critical"] });
    if (k === "warning") setFilters({ ...DEFAULT_ALERT_FILTERS, status: "open", severity: ["warning"] });
    if (k === "resolved") setFilters({ ...DEFAULT_ALERT_FILTERS, status: "resolved" });
  }

  // Critical alerts ask for a reason first (design rule); everything else resolves in one click.
  const [resolving, setResolving] = useState<Alert | null>(null);
  // Bulk acknowledge: only open Warning/Info alerts can be ticked.
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const canBulk = (a: Alert) => a.status === "active" && a.severity !== "critical";
  const bulkable = visible.filter(canBulk);
  const pickedVisible = bulkable.filter((a) => picked.has(a.id));

  function togglePick(a: Alert) {
    setPicked((s) => {
      const next = new Set(s);
      if (next.has(a.id)) next.delete(a.id);
      else next.add(a.id);
      return next;
    });
  }

  function acknowledgePicked() {
    const list = pickedVisible;
    list.forEach((a) => setStatus(a.id, "acknowledged"));
    setPicked(new Set());
    toast.success(t("{n} alerts acknowledged", { n: list.length }), {
      duration: 5000,
      action: { label: t("Undo"), onClick: () => list.forEach((a) => setStatus(a.id, "active")) },
    });
  }

  const actions: AlertActions = {
    onAcknowledge: (a) => update(a, "acknowledged", "acknowledged"),
    onResolve: (a) => (a.severity === "critical" ? setResolving(a) : update(a, "resolved", "resolved")),
    onReopen: (a) => update(a, "active", "reopened"),
    onOpen: (a) => setSelectedId(a.id),
  };

  function update(a: Alert, status: Alert["status"], verb: string, reason?: ResolveReason) {
    const previous = a.status;
    setStatus(a.id, status);
    setPicked((s) => {
      if (!s.has(a.id)) return s;
      const next = new Set(s);
      next.delete(a.id);
      return next;
    });
    const msg = t(`{name} {title} ${verb}`, { name: a.equipmentName, title: a.title });
    toast.success(reason ? `${msg} · ${t(reason)}` : msg, {
      duration: 5000, // undo window
      action: { label: t("Undo"), onClick: () => setStatus(a.id, previous) },
    });
  }

  // Always read the selected alert from state so the sheet reflects acknowledge/resolve instantly.
  const selected = alerts.find((a) => a.id === selectedId) ?? null;
  const related = selected
    ? sortAlerts(alerts.filter((a) => a.equipmentId === selected.equipmentId && a.id !== selected.id))
    : [];

  const noneOpen = counts.open === 0;

  return (
    <div className="mx-auto max-w-[1200px] space-y-5 p-4 md:space-y-6 md:p-8">
      <StatCards alerts={alerts} filters={filters} onSelect={quickFilter} />
      <AlertFiltersBar filters={filters} onChange={change} onClear={() => setFilters(DEFAULT_ALERT_FILTERS)} counts={counts} />

      <p className="text-sm text-muted-foreground" aria-live="polite">
        {t("Showing {n} of {m} alerts · critical first, then newest", { n: visible.length, m: alerts.length })}
      </p>

      {bulkable.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            className="h-10 gap-1.5"
            onClick={() => setPicked(new Set(bulkable.map((a) => a.id)))}
          >
            {t("Select warnings & info ({n})", { n: bulkable.length })}
          </Button>
          {pickedVisible.length > 0 && (
            <>
              <Button className="h-10 gap-1.5" onClick={acknowledgePicked}>
                <CheckCheck /> {t("Acknowledge {n} selected", { n: pickedVisible.length })}
              </Button>
              <Button variant="ghost" className="h-10" onClick={() => setPicked(new Set())}>
                {t("Clear selection")}
              </Button>
            </>
          )}
        </div>
      )}

      {visible.length === 0 ? (
        <Panel className="flex flex-col items-center gap-2 py-16 text-center">
          {noneOpen && filters.status === "open" ? (
            <>
              <span className="flex size-12 items-center justify-center rounded-full bg-good-bg text-good">
                <ShieldCheck className="size-6" aria-hidden />
              </span>
              <p className="text-lg font-semibold">{t("All clear")}</p>
              <p className="text-sm text-muted-foreground">{t("No open alerts. Every piece of equipment is within limits.")}</p>
            </>
          ) : (
            <>
              <SearchX className="size-8 text-muted-foreground" aria-hidden />
              <p className="font-semibold">{t("No alerts match these filters")}</p>
              <Button variant="outline" className="mt-2 h-10" onClick={() => setFilters(DEFAULT_ALERT_FILTERS)}>
                {t("Clear filters")}
              </Button>
            </>
          )}
        </Panel>
      ) : (
        <ul className="space-y-3 md:space-y-4">
          {visible.map((a) => (
            <li key={a.id}>
              <AlertCard
                alert={a}
                now={now}
                actions={actions}
                selected={picked.has(a.id)}
                onToggleSelect={canBulk(a) ? togglePick : undefined}
              />
            </li>
          ))}
        </ul>
      )}

      <ResolveDialog
        alert={resolving}
        onCancel={() => setResolving(null)}
        onConfirm={(a, reason) => {
          setResolving(null);
          update(a, "resolved", "resolved", reason);
        }}
      />

      <AlertSheet
        alert={selected}
        related={related}
        now={now}
        actions={actions}
        onClose={() => {
          setSelectedId(null);
          // clear ?open=… so the same notification can be opened again later
          if (initialOpenId) router.replace("/alerts", { scroll: false });
        }}
        onSelect={(a) => setSelectedId(a.id)}
      />
    </div>
  );
}
