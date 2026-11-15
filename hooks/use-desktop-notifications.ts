"use client";

import { useCallback, useSyncExternalStore } from "react";

export type NotifyPermission = NotificationPermission | "unsupported";

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function getSnapshot(): NotifyPermission {
  return typeof Notification === "undefined" ? "unsupported" : Notification.permission;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  // The user can also change the permission from Chrome's address-bar lock icon: listen for that too.
  let status: PermissionStatus | null = null;
  navigator.permissions
    ?.query({ name: "notifications" })
    .then((s) => {
      status = s;
      s.onchange = cb;
    })
    .catch(() => {});
  return () => {
    listeners.delete(cb);
    if (status) status.onchange = null;
  };
}

/** Browser (OS-level) notifications. Permission must be asked from a user click, never silently. */
export function useDesktopNotifications() {
  const permission = useSyncExternalStore(subscribe, getSnapshot, (): NotifyPermission => "default");

  const request = useCallback(async (): Promise<NotifyPermission> => {
    if (typeof Notification === "undefined") return "unsupported";
    const result = await Notification.requestPermission();
    emit();
    return result;
  }, []);

  return { permission, request };
}

/** Show a native notification. Clicking it focuses this tab and opens `href`. */
export function showDesktopNotification(title: string, body: string, opts: { tag?: string; href?: string } = {}) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  try {
    const n = new Notification(title, { body, tag: opts.tag, icon: "/favicon.ico" });
    n.onclick = () => {
      window.focus();
      if (opts.href) window.location.assign(opts.href);
      n.close();
    };
  } catch {
    /* some mobile browsers only allow notifications via a service worker: ignore */
  }
}
