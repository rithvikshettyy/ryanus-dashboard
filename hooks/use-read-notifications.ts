"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

const KEY = "ryanus-read-notifications";
const listeners = new Set<() => void>();

// useSyncExternalStore: the React way to read something outside React (here: localStorage).
// Every component using this hook stays in sync, and it survives page navigation and refresh.
function getSnapshot(): string {
  try {
    return localStorage.getItem(KEY) ?? "";
  } catch {
    return ""; // private mode / blocked storage: just behave as "nothing read"
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

export function useReadNotifications() {
  const raw = useSyncExternalStore(subscribe, getSnapshot, () => "");
  const read = useMemo(() => new Set(raw ? raw.split(",") : []), [raw]);

  const markRead = useCallback((ids: string[]) => {
    const next = new Set(getSnapshot().split(",").filter(Boolean));
    ids.forEach((id) => next.add(id));
    try {
      localStorage.setItem(KEY, Array.from(next).join(","));
    } catch {
      /* ignore */
    }
    listeners.forEach((l) => l());
  }, []);

  return { read, markRead };
}
