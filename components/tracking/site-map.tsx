"use client";

import { useState } from "react";
import { LocateFixed, Minus, Plus } from "lucide-react";
import { CLASS_CONFIG } from "@/lib/constants";
import { MAP_H, MAP_W, ROUTES, SITES, splitRoute, type Trip, type TruckFlag } from "@/lib/tracking";
import { cn } from "@/lib/utils";

const ZOOMS = [1, 1.7, 2.6];
const toPoints = (pts: [number, number][]) => pts.map((p) => p.join(",")).join(" ");
const halo = { paintOrder: "stroke", stroke: "#EEF1F6", strokeWidth: 4, strokeLinejoin: "round" } as const;

export function SiteMap({
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
  const [zoomIdx, setZoomIdx] = useState(0);
  const zoom = ZOOMS[zoomIdx];

  // When zoomed in, the view follows the selected truck (clamped so we never show outside the map).
  const w = MAP_W / zoom;
  const h = MAP_H / zoom;
  const vx = zoom === 1 ? 0 : Math.min(Math.max(selected.pos.x - w / 2, 0), MAP_W - w);
  const vy = zoom === 1 ? 0 : Math.min(Math.max(selected.pos.y - h / 2, 0), MAP_H - h);

  const route = ROUTES[selected.routeId];
  const reversed = selected.status === "returning";
  const { done, todo } = splitRoute(route, selected.progress, reversed);
  const legStart = reversed ? SITES[route.to] : SITES[route.from];
  const legEnd = reversed ? SITES[route.from] : SITES[route.to];

  return (
    <div className="relative overflow-hidden rounded-xl border bg-[#eef1f6]">
      <svg
        viewBox={`${vx} ${vy} ${w} ${h}`}
        className="block aspect-[5/3] w-full"
        role="img"
        aria-label={`Site map. ${selected.truck} is ${selected.status.replace("-", " ")} on the route from ${selected.from} to ${selected.to}.`}
      >
        {/* land use */}
        <path d="M30 70 Q120 30 230 80 Q265 150 215 225 Q120 258 45 215 Z" fill="#e1e6ee" stroke="#cfd6e2" strokeDasharray="6 5" />
        <path d="M50 380 Q150 340 250 400 Q285 470 220 520 Q120 545 60 500 Z" fill="#e1e6ee" stroke="#cfd6e2" strokeDasharray="6 5" />
        <path d="M690 420 Q790 390 880 430 Q910 500 840 535 Q740 550 690 500 Z" fill="#e1e6ee" stroke="#cfd6e2" strokeDasharray="6 5" />
        <rect x="795" y="95" width="135" height="95" rx="12" fill="#e1e6ee" stroke="#cfd6e2" strokeDasharray="6 5" />
        <rect x="545" y="272" width="30" height="36" rx="4" fill="#d7dde8" />
        {/* rail siding */}
        <g stroke="#b7c0cf" strokeWidth="3">
          <line x1="880" y1="330" x2="985" y2="330" />
          <line x1="880" y1="350" x2="985" y2="350" />
        </g>

        {/* haul roads: grey casing, white core */}
        {Object.values(ROUTES).map((r) => (
          <polyline key={`c-${r.id}`} points={toPoints(r.points)} fill="none" stroke="#d3d9e3" strokeWidth="17" strokeLinecap="round" strokeLinejoin="round" />
        ))}
        {Object.values(ROUTES).map((r) => (
          <polyline key={`w-${r.id}`} points={toPoints(r.points)} fill="none" stroke="#ffffff" strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" />
        ))}

        {/* selected route: green = travelled, blue = still to go */}
        <polyline points={toPoints(done)} fill="none" stroke="#1f9d6b" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points={toPoints(todo)} fill="none" stroke="#2f6bf0" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={legStart.x} cy={legStart.y} r="7" fill="#1f9d6b" stroke="#fff" strokeWidth="3" />
        <circle cx={legEnd.x} cy={legEnd.y} r="9" fill="#fff" stroke="#2f6bf0" strokeWidth="4" />

        {/* site labels */}
        <g fontSize="13" fontWeight="600" fill="#4b5563" style={{ pointerEvents: "none" }}>
          {Object.entries(SITES).map(([id, s]) => (
            <text key={id} x={s.x} y={s.y - 16} textAnchor="middle" style={halo}>
              {s.label}
            </text>
          ))}
        </g>

        {/* other trucks */}
        {trips
          .filter((t) => t.truck !== selected.truck)
          .map((t) => {
            const offline = t.status === "no-signal";
            const flagged = flags[t.truck];
            return (
              <g
                key={t.truck}
                role="button"
                tabIndex={0}
                aria-label={`${t.truck}, ${t.status.replace("-", " ")}${flagged ? `, alert: ${flagged.label}` : ""}`}
                onClick={() => onSelect(t.truck)}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelect(t.truck)}
                className="cursor-pointer outline-none [&:focus-visible>circle:first-child]:stroke-primary"
                style={{ transform: `translate(${t.pos.x}px, ${t.pos.y}px)`, transition: "transform 1s linear" }}
              >
                <title>{`${t.truck} · ${t.status.replace("-", " ")}`}</title>
                {flagged && <circle r="14" fill="none" stroke="var(--bad)" strokeWidth="2.5" />}
                <circle r="8.5" fill={offline ? "#9ca3af" : CLASS_CONFIG[t.cls].color} stroke="#fff" strokeWidth="3" />
                {offline && (
                  <text y="3.5" textAnchor="middle" fontSize="11" fontWeight="700" fill="#fff">
                    !
                  </text>
                )}
                {zoom > 1 && (
                  <text y="-18" textAnchor="middle" fontSize="11" fontWeight="600" fill="#374151" style={halo}>
                    {t.truck}
                  </text>
                )}
              </g>
            );
          })}

        {/* selected truck: pulsing halo, blue marker, direction arrow */}
        <g style={{ transform: `translate(${selected.pos.x}px, ${selected.pos.y}px)`, transition: "transform 1s linear" }}>
          <circle r="26" fill="#2f6bf0" opacity="0.16" className="animate-pulse" />
          <circle r="14" fill={selected.status === "no-signal" ? "#6b7280" : "#2f6bf0"} stroke="#fff" strokeWidth="3.5" />
          <path d="M-5 -5.5 L7 0 L-5 5.5 L-2 0 Z" fill="#fff" transform={`rotate(${selected.heading})`} />
          <text y="-24" textAnchor="middle" fontSize="13" fontWeight="700" fill="#111827" style={halo}>
            {selected.truck}
          </text>
        </g>
      </svg>

      <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-2 rounded-full border bg-card/95 px-3 py-1.5 text-xs font-medium shadow-xs">
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-productive opacity-60" />
          <span className="relative inline-flex size-2 rounded-full bg-productive" />
        </span>
        Live GPS · {trips.length} trucks on site
      </div>

      <div className="absolute bottom-3 right-3 flex flex-col items-center gap-2">
        <div className="flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm">
          <button
            type="button"
            aria-label="Zoom in"
            disabled={zoomIdx === ZOOMS.length - 1}
            onClick={() => setZoomIdx((i) => Math.min(i + 1, ZOOMS.length - 1))}
            className="flex size-10 items-center justify-center transition-colors hover:bg-muted disabled:opacity-40"
          >
            <Plus className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Zoom out"
            disabled={zoomIdx === 0}
            onClick={() => setZoomIdx((i) => Math.max(i - 1, 0))}
            className="flex size-10 items-center justify-center border-t transition-colors hover:bg-muted disabled:opacity-40"
          >
            <Minus className="size-4" />
          </button>
        </div>
        <button
          type="button"
          aria-label={`Locate ${selected.truck}`}
          title={`Zoom to ${selected.truck}`}
          onClick={() => setZoomIdx(ZOOMS.length - 1)}
          className={cn("flex size-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition-transform hover:scale-105")}
        >
          <LocateFixed className="size-5" />
        </button>
      </div>
    </div>
  );
}
