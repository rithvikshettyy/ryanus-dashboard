"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { SidebarContent } from "./sidebar-content";

const KEY = "sidebar-collapsed";

/** Desktop sidebar. Remembers collapsed/expanded in localStorage (per browser, so it is a convenience only). */
export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);

  // Read after mount: localStorage does not exist on the server, so reading it during render would mismatch.
  useEffect(() => {
    // Small laptops/tablets (768-1023px) start as an icon rail so the content keeps its room.
    const narrow = window.matchMedia("(min-width: 768px) and (max-width: 1023px)").matches;
    try {
      const saved = localStorage.getItem(KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCollapsed(saved === null ? narrow : saved === "1");
    } catch {
      setCollapsed(narrow); // private window or blocked storage
    }
  }, []);

  function toggle() {
    setCollapsed((c) => {
      try {
        localStorage.setItem(KEY, c ? "0" : "1");
      } catch {
        /* ignore */
      }
      return !c;
    });
  }

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-screen shrink-0 border-r bg-card md:block",
        collapsed ? "w-[76px]" : "w-64",
      )}
    >
      <SidebarContent collapsed={collapsed} onToggle={toggle} />
    </aside>
  );
}
