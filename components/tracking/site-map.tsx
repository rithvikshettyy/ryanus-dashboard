"use client";

import dynamic from "next/dynamic";
import { T } from "@/components/i18n-provider";

// Leaflet touches `window`, so it can only run in the browser: ssr:false skips server rendering for it.
export const SiteMap = dynamic(() => import("./site-map-leaflet").then((m) => m.SiteMapLeaflet), {
  ssr: false,
  loading: () => <div className="aspect-[5/3] min-h-[320px] w-full animate-pulse rounded-xl border bg-muted"><span className="sr-only"><T>Loading map</T></span></div>,
});
