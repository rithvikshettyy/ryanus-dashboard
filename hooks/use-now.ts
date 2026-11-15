"use client";

import { useEffect, useState } from "react";

/**
 * Current time that ticks every `intervalMs`. Starts from the server-provided time so the
 * first client render matches the server HTML (no hydration mismatch), then goes live.
 */
export function useNow(initial: number, intervalMs = 30_000): number {
  const [now, setNow] = useState(initial);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id); // cleanup: stop the timer when the component unmounts
  }, [intervalMs]);
  return now;
}
