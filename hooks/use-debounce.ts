"use client";

import { useEffect, useState } from "react";

/**
 * Debounce: wait until the value stops changing for `delay` ms, then update once.
 * Every change restarts the timer (the cleanup cancels the previous one).
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}
