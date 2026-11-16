"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Pending = { kind: "link"; href: string } | { kind: "back" } | null;

/**
 * Warn before the user loses unsaved edits. Three ways to leave a page, three guards:
 *  1. Close tab / refresh / type a new URL: the browser's own "Leave site?" prompt (beforeunload).
 *  2. Click an in-app link (sidebar, bell...): Next's router never fires beforeunload, so we catch the
 *     click in the capture phase, cancel it, and ask with our own dialog.
 *  3. Browser Back button: while dirty we keep one extra history entry; Back pops it and we ask.
 * Returns `pending` (non-null = show the dialog) plus `stay` / `leave` handlers.
 */
export function useUnsavedChanges(dirty: boolean) {
  const router = useRouter();
  const [pending, setPending] = useState<Pending>(null);
  const allow = useRef(false); // set right before we leave on purpose, so our own guards step aside
  const guardPushed = useRef(false);

  // 1) Tab close / refresh
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (allow.current) return;
      e.preventDefault();
      e.returnValue = ""; // required by some browsers to show the prompt
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  // 2) In-app link clicks
  useEffect(() => {
    if (!dirty) return;
    const onClick = (e: MouseEvent) => {
      if (allow.current || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return; // external links get the browser prompt
      if (url.pathname + url.search === window.location.pathname + window.location.search) return; // same page / hash
      e.preventDefault();
      e.stopPropagation(); // capture phase: Next's <Link> never sees this click
      setPending({ kind: "link", href: url.pathname + url.search + url.hash });
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [dirty]);

  // 3) Browser Back button
  useEffect(() => {
    if (!dirty) return;
    if (!guardPushed.current) {
      window.history.pushState({ unsavedGuard: true }, "", window.location.href);
      guardPushed.current = true;
    }
    const onPop = () => {
      if (allow.current) return;
      guardPushed.current = false; // our extra entry was just consumed
      setPending({ kind: "back" });
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [dirty]);

  const stay = useCallback(() => {
    if (pending?.kind === "back") {
      window.history.pushState({ unsavedGuard: true }, "", window.location.href); // re-arm the guard
      guardPushed.current = true;
    }
    setPending(null);
  }, [pending]);

  const leave = useCallback(() => {
    const p = pending;
    allow.current = true;
    setPending(null);
    if (p?.kind === "link") router.push(p.href);
    else if (p?.kind === "back") window.history.back();
  }, [pending, router]);

  return { pending, stay, leave };
}
