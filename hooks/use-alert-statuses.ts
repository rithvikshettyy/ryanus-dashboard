"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import type { Alert, AlertStatus } from "@/lib/types";

/**
 * Acknowledge / resolve choices, shared by every component (alerts list, sidebar badge, bell).
 * Stored in localStorage as { alertId: status } and read with useSyncExternalStore,
 * so all of them update together and the choice survives navigation and refresh.
 */
const KEY = "ryanus-alert-status";
const listeners = new Set<() => void>();

function getSnapshot(): string {
  try {
    return localStorage.getItem(KEY) ?? "";
  } catch {
    return ""; // private mode / blocked storage: behave as "nothing changed"
  }
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb); // other browser tabs
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

function parse(raw: string): Record<string, AlertStatus> {
  try {
    const data = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
    // tolerate saves made by the richer format ({ s: status, ... }): keep just the status
    return Object.fromEntries(
      Object.entries(data).map(([id, v]) => [id, (typeof v === "string" ? v : (v as { s: AlertStatus }).s) as AlertStatus]),
    );
  } catch {
    return {};
  }
}

export function useAlertStatuses() {
  const raw = useSyncExternalStore(subscribe, getSnapshot, () => "");
  const overrides = useMemo(() => parse(raw), [raw]);

  const setStatus = useCallback((id: string, status: AlertStatus) => {
    const next = { ...parse(getSnapshot()), [id]: status };
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
    listeners.forEach((l) => l());
  }, []);

  return { overrides, setStatus };
}

/** Alerts with the user's acknowledge/resolve choices applied on top of the seed data. */
export function applyStatuses(alerts: Alert[], overrides: Record<string, AlertStatus>): Alert[] {
  return alerts.map((a) => (overrides[a.id] && overrides[a.id] !== a.status ? { ...a, status: overrides[a.id] } : a));
}
