"use client";

import { useCallback, useMemo, useReducer, useState } from "react";
import { ShieldCheck, SearchX } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { useDebounce } from "@/hooks/use-debounce";
import { useNow } from "@/hooks/use-now";
import {
  DEFAULT_ALERT_FILTERS, filterAlerts, matchesStatus, sortAlerts, type AlertFilters, type StatusFilter,
} from "@/lib/alert-filters";
import type { Alert, AlertStatus } from "@/lib/types";
import { AlertCard, type AlertActions } from "./alert-card";
import { AlertFiltersBar } from "./alert-filters";
import { AlertSheet } from "./alert-sheet";
import { StatCards, type QuickFilter } from "./stat-cards";

// useReducer: one place that lists every way alert state can change. Never mutates, always returns a new array.
type Action =
  | { type: "ACKNOWLEDGE"; id: string }
  | { type: "RESOLVE"; id: string }
  | { type: "REOPEN"; id: string }
  | { type: "RESTORE"; id: string; status: AlertStatus };

function reducer(state: Alert[], action: Action): Alert[] {
  const set = (id: string, status: AlertStatus) => state.map((a) => (a.id === id ? { ...a, status } : a));
  switch (action.type) {
    case "ACKNOWLEDGE": return set(action.id, "acknowledged");
    case "RESOLVE": return set(action.id, "resolved");
    case "REOPEN": return set(action.id, "active");
    case "RESTORE": return set(action.id, action.status);
  }
}

export function AlertsView({ initialAlerts, serverNow }: { initialAlerts: Alert[]; serverNow: number }) {
  const [alerts, dispatch] = useReducer(reducer, initialAlerts);
  const [filters, setFilters] = useState<AlertFilters>(DEFAULT_ALERT_FILTERS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
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

  const actions: AlertActions = {
    onAcknowledge: (a) => update(a, { type: "ACKNOWLEDGE", id: a.id }, "acknowledged"),
    onResolve: (a) => update(a, { type: "RESOLVE", id: a.id }, "resolved"),
    onReopen: (a) => update(a, { type: "REOPEN", id: a.id }, "reopened"),
    onOpen: (a) => setSelectedId(a.id),
  };

  function update(a: Alert, action: Action, verb: string) {
    const previous = a.status;
    dispatch(action);
    toast.success(`${a.equipmentName} ${a.title} ${verb}`, {
      action: { label: "Undo", onClick: () => dispatch({ type: "RESTORE", id: a.id, status: previous }) },
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
        Showing <span className="num font-medium text-foreground">{visible.length}</span> of {alerts.length} alerts · critical first, then newest
      </p>

      {visible.length === 0 ? (
        <Panel className="flex flex-col items-center gap-2 py-16 text-center">
          {noneOpen && filters.status === "open" ? (
            <>
              <span className="flex size-12 items-center justify-center rounded-full bg-good-bg text-good">
                <ShieldCheck className="size-6" aria-hidden />
              </span>
              <p className="text-lg font-semibold">All clear</p>
              <p className="text-sm text-muted-foreground">No open alerts. Every piece of equipment is within limits.</p>
            </>
          ) : (
            <>
              <SearchX className="size-8 text-muted-foreground" aria-hidden />
              <p className="font-semibold">No alerts match these filters</p>
              <Button variant="outline" className="mt-2 h-10" onClick={() => setFilters(DEFAULT_ALERT_FILTERS)}>
                Clear filters
              </Button>
            </>
          )}
        </Panel>
      ) : (
        <ul className="space-y-3 md:space-y-4">
          {visible.map((a) => (
            <li key={a.id}>
              <AlertCard alert={a} now={now} actions={actions} />
            </li>
          ))}
        </ul>
      )}

      <AlertSheet
        alert={selected}
        related={related}
        now={now}
        actions={actions}
        onClose={() => setSelectedId(null)}
        onSelect={(a) => setSelectedId(a.id)}
      />
    </div>
  );
}
