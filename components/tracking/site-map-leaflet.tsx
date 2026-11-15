"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Layers, LocateFixed, Minus, Plus } from "lucide-react";
import { useT } from "@/components/i18n-provider";
import { CLASS_CONFIG } from "@/lib/constants";
import { MAP_H, MAP_W, ROUTES, SITES, splitRoute, toGps, type Trip, type TruckFlag } from "@/lib/tracking";
import { cn } from "@/lib/utils";

type Basemap = "satellite" | "street";

const STATUS_LABEL: Record<Trip["status"], string> = {
  loading: "Loading", hauling: "Hauling", dumping: "Dumping", returning: "Returning", "no-signal": "No signal", completed: "Completed",
};

// Free tile servers, no API key. Attribution is required by both and shown in the map corner.
const TILES: Record<Basemap, { url: string; attribution: string; maxZoom: number }> = {
  satellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Imagery &copy; Esri, Maxar, Earthstar Geographics",
    maxZoom: 19,
  },
  street: {
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "&copy; OpenStreetMap contributors",
    maxZoom: 19,
  },
};

const ll = (x: number, y: number): L.LatLngTuple => {
  const g = toGps(x, y);
  return [g.lat, g.lon];
};
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c);

function selectedIcon(t: Trip, name: string): L.DivIcon {
  const colour = t.status === "no-signal" ? "#6b7280" : "#2f6bf0";
  return L.divIcon({
    className: "truck-selected",
    iconSize: [0, 0],
    html: `
      <div style="position:relative;width:0;height:0">
        <span style="position:absolute;left:-26px;top:-26px;width:52px;height:52px;border-radius:50%;background:${colour};opacity:.22" class="animate-pulse"></span>
        <span style="position:absolute;left:-14px;top:-14px;width:28px;height:28px;border-radius:50%;background:${colour};border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center">
          <svg width="14" height="14" viewBox="-7 -7 14 14" style="transform:rotate(${t.heading}deg)"><path d="M-5 -5.5 L7 0 L-5 5.5 L-2 0 Z" fill="#fff"/></svg>
        </span>
        <span style="position:absolute;left:0;top:-38px;transform:translateX(-50%);white-space:nowrap;font:700 12px system-ui;color:#fff;background:rgba(17,24,39,.85);padding:2px 7px;border-radius:6px">${esc(name)}</span>
      </div>`,
  });
}

/**
 * Real map (Leaflet) with satellite imagery. Leaflet is imperative, so we create the map once in an
 * effect and then update markers and lines whenever the trips change (every second).
 */
export function SiteMapLeaflet({
  trips,
  selected,
  onSelect,
  flags,
}: {
  trips: Trip[];
  selected: Trip;
  onSelect: (truck: string) => void;
  flags: Record<string, TruckFlag>;
}) {
  const tr = useT();
  const trRef = useRef(tr); // SiteMap is re-mounted (key) when the language changes, so this never goes stale
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const tiles = useRef<L.TileLayer | null>(null);
  const layers = useRef<{
    trucks: Map<string, { dot: L.CircleMarker; ring: L.CircleMarker | null }>;
    selected: L.Marker | null;
    done: L.Polyline | null;
    todo: L.Polyline | null;
    ends: L.LayerGroup | null;
  }>({ trucks: new Map(), selected: null, done: null, todo: null, ends: null });
  const fitZoom = useRef(14);
  const onSelectRef = useRef(onSelect);
  const [basemap, setBasemap] = useState<Basemap>("satellite");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  // 1) Create the map once: roads, site pins
  useEffect(() => {
    if (!el.current || map.current) return;
    const m = L.map(el.current, { zoomControl: false, attributionControl: true, maxZoom: 19 });
    map.current = m;
    m.attributionControl.setPrefix(false);

    const bounds = L.latLngBounds([ll(0, 0), ll(MAP_W, MAP_H)]);
    m.fitBounds(bounds, { padding: [8, 8] });
    fitZoom.current = m.getZoom();

    // haul roads: soft white casing so they read on satellite imagery
    Object.values(ROUTES).forEach((r) => {
      const pts = r.points.map(([x, y]) => ll(x, y));
      L.polyline(pts, { color: "#ffffff", weight: 8, opacity: 0.55, lineCap: "round", interactive: false }).addTo(m);
      L.polyline(pts, { color: "#fbbf24", weight: 3, opacity: 0.95, dashArray: "2 7", lineCap: "round", interactive: false }).addTo(m);
    });

    // sites
    Object.values(SITES).forEach((s) => {
      L.circleMarker(ll(s.x, s.y), { radius: 6, color: "#fff", weight: 2, fillColor: "#111827", fillOpacity: 1, interactive: false })
        .bindTooltip(trRef.current(s.label), { permanent: true, direction: "top", offset: [0, -6], className: "site-label" })
        .addTo(m);
    });

    layers.current.ends = L.layerGroup().addTo(m);
    setReady(true);

    const trucks = layers.current.trucks;
    return () => {
      m.remove();
      map.current = null;
      tiles.current = null;
      trucks.clear();
      layers.current = { trucks, selected: null, done: null, todo: null, ends: null };
    };
  }, []);

  // 2) Basemap: satellite or street
  useEffect(() => {
    const m = map.current;
    if (!m || !ready) return;
    tiles.current?.remove();
    const t = TILES[basemap];
    tiles.current = L.tileLayer(t.url, { attribution: t.attribution, maxZoom: t.maxZoom }).addTo(m);
    tiles.current.bringToBack();
  }, [basemap, ready]);

  // 3) Trucks, selected route, selected marker: runs on every tick
  useEffect(() => {
    const m = map.current;
    const L_ = layers.current;
    if (!m || !ready) return;

    // other trucks
    const seen = new Set<string>();
    trips.forEach((t) => {
      if (t.truck === selected.truck) return;
      seen.add(t.truck);
      const pos = ll(t.pos.x, t.pos.y);
      const offline = t.status === "no-signal";
      const flagged = Boolean(flags[t.truck]);
      let entry = L_.trucks.get(t.truck);
      if (!entry) {
        const dot = L.circleMarker(pos, { radius: 7, weight: 2.5, color: "#fff", fillOpacity: 1 }).addTo(m);
        dot.on("click", () => onSelectRef.current(t.truck));
        dot.bindTooltip(trRef.current(t.truck), { direction: "top", offset: [0, -6] });
        entry = { dot, ring: null };
        L_.trucks.set(t.truck, entry);
      }
      entry.dot.setLatLng(pos).setStyle({ fillColor: offline ? "#9ca3af" : CLASS_CONFIG[t.cls].color });
      if (flagged && !entry.ring) {
        entry.ring = L.circleMarker(pos, { radius: 13, weight: 2.5, color: "#dc2626", fill: false, interactive: false }).addTo(m);
      }
      if (entry.ring) entry.ring.setLatLng(pos);
      if (!flagged && entry.ring) {
        entry.ring.remove();
        entry.ring = null;
      }
    });
    // the selected truck is drawn by the big marker below
    L_.trucks.forEach((entry, name) => {
      if (!seen.has(name)) {
        entry.dot.remove();
        entry.ring?.remove();
        L_.trucks.delete(name);
      }
    });

    // selected route: green = travelled, blue = still to go
    const route = ROUTES[selected.routeId];
    const reversed = selected.status === "returning";
    const { done, todo } = splitRoute(route, selected.progress, reversed);
    const toLine = (pts: [number, number][]) => pts.map(([x, y]) => ll(x, y));
    if (!L_.done) {
      L_.done = L.polyline(toLine(done), { color: "#22c55e", weight: 5, lineCap: "round", interactive: false }).addTo(m);
      L_.todo = L.polyline(toLine(todo), { color: "#3b82f6", weight: 5, lineCap: "round", interactive: false }).addTo(m);
    } else {
      L_.done.setLatLngs(toLine(done));
      L_.todo?.setLatLngs(toLine(todo));
    }
    const legStart = reversed ? SITES[route.to] : SITES[route.from];
    const legEnd = reversed ? SITES[route.from] : SITES[route.to];
    L_.ends?.clearLayers();
    L.circleMarker(ll(legStart.x, legStart.y), { radius: 7, weight: 3, color: "#fff", fillColor: "#22c55e", fillOpacity: 1, interactive: false }).addTo(L_.ends!);
    L.circleMarker(ll(legEnd.x, legEnd.y), { radius: 9, weight: 4, color: "#3b82f6", fillColor: "#fff", fillOpacity: 1, interactive: false }).addTo(L_.ends!);

    // selected truck
    const pos = ll(selected.pos.x, selected.pos.y);
    if (!L_.selected) {
      L_.selected = L.marker(pos, { icon: selectedIcon(selected, trRef.current(selected.truck)), zIndexOffset: 1000, keyboard: false }).addTo(m);
    } else {
      L_.selected.setLatLng(pos).setIcon(selectedIcon(selected, trRef.current(selected.truck)));
    }
  }, [trips, selected, flags, ready]);

  // 4) When the user picks another truck while zoomed in, follow it
  useEffect(() => {
    const m = map.current;
    if (!m || !ready) return;
    if (m.getZoom() > fitZoom.current) m.panTo(ll(selected.pos.x, selected.pos.y), { animate: true });
    // only when the selection changes, not on every position tick
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected.truck, ready]);

  return (
    <div className="relative isolate overflow-hidden rounded-xl border bg-[#1f2937]">
      <div
        ref={el}
        role="region"
        aria-label={tr("Satellite map. {truck} is {status} on the route from {from} to {to}.", { truck: selected.truck, status: tr(STATUS_LABEL[selected.status]), from: selected.from, to: selected.to })}
        className="aspect-[5/3] min-h-[320px] w-full"
      />

      <div className="pointer-events-none absolute left-3 top-3 z-[500] flex items-center gap-2 rounded-full border bg-card/95 px-3 py-1.5 text-xs font-medium shadow-xs">
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-productive opacity-60" />
          <span className="relative inline-flex size-2 rounded-full bg-productive" />
        </span>
        {tr("Live GPS · {n} trucks on site", { n: trips.length })}
      </div>

      <div className="absolute bottom-7 right-3 z-[500] flex flex-col items-center gap-2">
        <button
          type="button"
          aria-label={basemap === "satellite" ? tr("Switch to street map") : tr("Switch to satellite")}
          title={basemap === "satellite" ? tr("Street map") : tr("Satellite")}
          onClick={() => setBasemap((b) => (b === "satellite" ? "street" : "satellite"))}
          className="flex size-10 items-center justify-center rounded-xl border bg-card shadow-sm transition-colors hover:bg-muted"
        >
          <Layers className="size-4" />
        </button>
        <div className="flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm">
          <button type="button" aria-label={tr("Zoom in")} onClick={() => map.current?.zoomIn()} className="flex size-10 items-center justify-center transition-colors hover:bg-muted">
            <Plus className="size-4" />
          </button>
          <button type="button" aria-label={tr("Zoom out")} onClick={() => map.current?.zoomOut()} className="flex size-10 items-center justify-center border-t transition-colors hover:bg-muted">
            <Minus className="size-4" />
          </button>
        </div>
        <button
          type="button"
          aria-label={tr("Locate {truck}", { truck: selected.truck })}
          title={tr("Zoom to {truck}", { truck: selected.truck })}
          onClick={() => map.current?.flyTo(ll(selected.pos.x, selected.pos.y), 17, { duration: 0.8 })}
          className={cn("flex size-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition-transform hover:scale-105")}
        >
          <LocateFixed className="size-5" />
        </button>
      </div>
    </div>
  );
}
