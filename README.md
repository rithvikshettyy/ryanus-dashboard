# MineOps: Mining Operations Analytics & Alerts Platform

A front-end for a mining fleet: compare vehicle classes on a **Fleet Performance dashboard**, and triage equipment problems on an **Alerts Management** screen. Built as a take-home assignment for Ryanus Consulting. Everything runs on static, seeded mock data. There is no backend.

- **Live demo:** _add Vercel URL here_
- **Repo:** https://github.com/rithvikshettyy/ryanus-dashboard

## What's inside

| Screen | Route | What it does |
|---|---|---|
| Fleet performance | `/dashboard` | Compare 2+ vehicle classes (e.g. Coal Dumper vs OB Dumper) over any date range: insights, KPI comparison cards, efficiency table, trend and share charts, time split, vehicle outliers, CSV export |
| Live tracking | `/dashboard?tab=tracking` | Simulated site map (satellite or street), moving trucks, trip list and trip log |
| Alerts | `/alerts` | Overview counts, filters, severity-first list, detail drawer, acknowledge / resolve / undo |
| Equipment | `/equipment/[id]` | Per-machine page with its alert history (linked from alerts) |
| Fleet modules | `/fleet/*`, `/shipments` | Vehicles, drivers, maintenance, fuel & telematics, route planning, active trucks, shipments. Sortable, searchable tables |
| Help | `/help` | FAQ plus a support chatbot that answers from the site's own data (no external API) |
| Settings | `/settings` | Preferences form |

Also: light/dark theme, notification bell, desktop alert notifications (opt-in), "people active" avatars, custom 404 and error pages, loading skeletons.

## Tech stack

- **Next.js 16** (App Router, Turbopack), **React 19**, **TypeScript** (strict)
- **Tailwind CSS 4** with design tokens as CSS variables in `app/globals.css`
- **shadcn/ui** on **Base UI** primitives, customised (not the default look)
- **Recharts** through the shadcn `ChartContainer` wrapper
- **lucide-react** icons, **sonner** toasts, **date-fns**, **next-themes**
- **Leaflet** for the site map (Esri satellite and OpenStreetMap tiles)
- **Geist** (via `next/font/google`) as the single typeface; numbers use `tabular-nums` so digits line up

## Run it

```bash
npm install
npm run dev        # http://localhost:3000  (redirects to /dashboard)
npm run build      # production build, type-checks everything
npm start          # serve the production build
npm run lint
```

Regenerate the mock data (deterministic, seed 42, so output is identical every run):

```bash
npx tsx scripts/generate-data.ts
```

No environment variables or secrets are needed.

## The assignment scenario

The brief asks to compare **Coal Dumper vs OB Dumper for 13 Nov to 14 Nov**. Open the dashboard, pick both classes and that period in the filter card, and the whole page recomputes. The filters are in the URL, so this view is a shareable link:

```
/dashboard?from=2026-11-13&to=2026-11-14&classes=coal-dumper,ob-dumper
```

Reference numbers for that scenario (use them to sanity-check the aggregation):

| | Trips | Payload | Distance | Fuel | Productive hours | Fuel / t | Fuel / km |
|---|---|---|---|---|---|---|---|
| Coal Dumper | 455 | 14,170 t | 2,792 km | 6,456 L | 314 h | 0.46 L/t | 2.31 L/km |
| OB Dumper | 410 | 21,761 t | 1,867 km | 6,838 L | 392 h | 0.31 L/t | 3.66 L/km |

## Design decisions

**Calm, UX-first, enterprise.** Warm off-white background, white cards with a 1px border and 16px radius, one near-black ink colour for primary actions, and colour reserved for meaning (good / bad / warning / info). Generous spacing, no decoration for its own sake.

**Colour is never the only signal.** Every severity or "better/worse" cue also has an icon and a text label. Text contrast targets 4.5:1 or better. Touch targets are at least 40px.

**Consistent class colours.** Coal Dumper is always slate, OB Dumper always amber, in every chart, pill and table, so the eye learns the mapping once.

**Chart type follows the question.**
- Trend over shifts: line chart (with a Payload / Fuel / Trips toggle)
- Compare totals per shift: grouped bars
- Share of the work between classes: 100% stacked bars
- Where the hours went: stacked bars (productive / idle / breakdown)
- Efficiency per class: head-to-head table with the better value highlighted

**Gaps and outliers are called out, not left for the viewer to find.** "Key insights" are sentences computed from the data. Comparison cards show a difference pill coloured by whether higher or lower is better for that metric. The vehicle table flags utilisation under 75% and fuel per tonne 12%+ above its class average.

**Every state is designed.** Hover (soft shadow, row highlight), loading (`loading.tsx` skeletons and a pending spinner on filter changes), empty ("All clear" on alerts, "no data" on dashboard), and error (`error.tsx`, `not-found.tsx`).

### Architecture choices

| Decision | Why |
|---|---|
| **Dashboard filters live in the URL** (`?from&to&classes&vehicle&tab`) | Shareable, survives refresh, back/forward works, and the server can read them. Updated with `router.replace` inside `useTransition` so there is a pending state and no blank flash. |
| **Dashboard is a server component** that parses filters, filters records and aggregates | Heavy maths stays on the server. Only small computed, serialisable props reach the client chart and filter components. |
| **Client components only at the leaves** (charts, filters, interactive tables, map) | They need hooks, events or browser APIs. Everything else stays server-rendered. |
| **Ratios computed from totals, never averaged per vehicle** | Weighted, not unweighted, average. Fuel per tonne is total litres / total tonnes, which is the honest fleet figure. |
| **Alert state in a small external store** (`useSyncExternalStore` over `localStorage`) | Acknowledge / resolve persist across refresh with no backend, and every component (list, drawer, bell) reads the same source. The base alerts stay immutable; saved statuses are overlaid on top. |
| **Search debounced 300 ms** (`useDebounce`) | Filtering waits until typing pauses instead of re-running on every keystroke. |
| **Live "x min ago"** (`useNow` ticking hook) | Timestamps are stored once; the display string is derived on each tick, so it never goes stale. Interval is cleaned up on unmount. |
| **`minutesAgo` in the alerts JSON, converted to timestamps at load** | The demo never looks stale, whenever it is opened. |
| **Seeded random data** (mulberry32, seed 42) | Deterministic: no hydration mismatch, reproducible numbers. |
| **Dynamic import with `ssr: false` for Leaflet** | Leaflet touches `window`, so it can only run in the browser. |

### Project structure

```
app/
  layout.tsx, page.tsx            root layout (Geist, Toaster, theme); / redirects to /dashboard
  (app)/layout.tsx                sidebar + mobile nav; route group, not part of the URL
  (app)/dashboard/                server page + loading.tsx
  (app)/alerts/                   server page, hands data to the client AlertsView
  (app)/equipment/[id]/           dynamic route, generateStaticParams, notFound()
  (app)/fleet/*, shipments, help, settings
  error.tsx, not-found.tsx
components/
  ui/                             customised shadcn primitives
  layout/                         sidebar, mobile nav, header pieces, bell, refresh
  dashboard/                      filter bar, KPI cards, charts, tables, insights, export
  alerts/                         view, cards, threshold bar, filters, detail sheet, stat cards
  tracking/                       map, trip list, trip table
  modules/                        shared data table, help centre, support chat, settings form
lib/                              filters, analytics, format, alerts, tracking, fleet, rag, constants, types
hooks/                            use-debounce, use-now, use-alert-statuses, use-read-notifications, ...
data/                             vehicles.json, shift-records.json, alerts.json
scripts/generate-data.ts          seeded data generator
```

Rule of thumb used throughout: logic in `lib/`, UI in `components/`, numbers formatted only through `lib/format.ts` (en-IN grouping, units always shown).

## UX approach

### Dashboard
1. **Header** with page title and Export CSV.
2. **Filter card:** period (date range popover with presets), class pills (multi-select, at least one stays on), vehicle select, and a plain-language context line such as "Comparing Coal Dumper vs OB Dumper · 2 days · 6 shifts" plus Reset. You always know what you are looking at.
3. **Key insights:** a few computed sentences first, so the "so what" comes before the charts.
4. **Comparison cards:** value per class, a proportional bar per class, and a difference pill.
5. **Trend and efficiency:** line chart with metric toggle next to the head-to-head table.
6. **Fuel and efficiency:** share of work, fuel by shift, fuel per tonne by shift (L/t or L/km).
7. **Hours and vehicles:** productive / idle / breakdown split and a vehicle table with flagged outliers.

### Alerts
A supervisor should see five things in one glance: **what happened, which equipment, how serious, when, what to do.**
- **Overview cards** (Active, Critical, Warnings, Resolved) double as quick filters.
- **Alert card:** left severity stripe plus severity badge (icon and text), equipment icon and name, title, an **actual vs threshold bar** with "+50% over limit", live time ago, location, a one-line next step, and Acknowledge / Resolve / Details buttons.
- **Sort:** critical first, then newest.
- **Filters:** debounced search, severity chips, alert type, equipment type, status tabs (Unacknowledged / Acknowledged / Resolved / All), and time range (1h / 6h / 24h / All).
- **Detail drawer:** full context, threshold gauge, recommended action, operator, related and historical alerts for the same machine, actions, and a link to the equipment page.
- **Feedback:** toasts on every action, with Undo.

### Mobile
Designed for phones as well as desktop. Sidebar becomes a drawer. Tables that sort by clicking column headers get a "Sort by" select and direction button on phones. Filters wrap, charts resize, and nothing scrolls sideways down to 320px width.

## KPI definitions

| KPI | Definition |
|---|---|
| Total payload (t) | Sum of tonnes hauled |
| Total fuel (L) | Sum of litres consumed |
| Total distance (km) | Sum of kilometres driven |
| Total trips | Sum of completed trips |
| Productive hours | Hours spent loading, hauling or dumping |
| Avg payload per trip | Total payload / total trips |
| Fuel per tonne | Total fuel / total payload (L/t) |
| Fuel per km | Total fuel / total distance (L/km) |
| Tonnes per productive hour | Total payload / productive hours |
| Utilisation | Productive hours / (productive + idle + breakdown hours) |
| Fuel cost | Total fuel × diesel price |
| Breakdown share | Breakdown hours / total hours |

All ratios divide totals by totals, never average per-vehicle ratios.

## Mock data assumptions

- **Fleet:** 33 vehicles in 5 classes: Coal Dumper (8, 35 t), OB Dumper (10, 60 t), Heavy Dumper (4, 100 t), Coal Tipper (6, 25 t, long haul to the siding), ADT (5, 40 t, rough terrain).
- **Period:** 1 Nov to 17 Nov 2026, three shifts a day: A 06:00 to 14:00, B 14:00 to 22:00, C 22:00 to 06:00 (night shift about 10% slower). That is 1,683 shift records (33 vehicles × 17 days × 3 shifts).
- **Generation:** each class has its own haul distance, fuel burn and trip rate. Each vehicle also gets a personal fuel factor and availability, so some are fuel hogs or frequently down. That gives the outliers the vehicle table is meant to surface.
- **Diesel price:** ₹92 per litre (assumption), used for fuel cost.
- **Alert thresholds:** coolant 95 °C, engine 100 °C, low fuel 15%, offline after 5 min, tyre pressure 7.5 bar, idle 30 min. An alert counts as overdue after 10 minutes unacknowledged.
- **Alerts:** 12 alerts. The six from the brief appear with the exact values (45 km/h vs limit 30, 12 T vs expected 40 T, 108 °C coolant, 8% fuel, offline 15 min, 115 °C engine). The generic names in the brief (Truck-X, Truck-Y, Excavator-04, ...) are mapped onto the fleet's serial names (Coal Tipper 02, ADT 03, Excavator 04, ...) so alerts, map, tables and equipment pages all refer to the same machines. The rest are extras, including older resolved ones that populate the "related alerts" history.
- **Live tracking:** trips are simulated along routes laid over real satellite imagery near Faridabad, Haryana. Positions, loads and statuses are mock and derived from the clock; they are not real vehicles.
- **Alert state:** acknowledge / resolve is stored in your browser's `localStorage` (key `ryanus-alert-status`). Clear site data to reset.
- **Support chatbot:** keyword retrieval (BM25) over text generated from the site's own data. No LLM and no network call, so answers are only as good as the indexed facts.

## Accessibility

- Semantic landmarks and labelled controls; icon-only buttons have `aria-label`.
- Keyboard: all actions reachable, visible focus rings, drawers trap and restore focus.
- Severity and status shown by icon and text, not colour alone.

## Credits

- Heavy Dumper photo: Caterpillar 793D by TZorn, CC BY-SA 3.0, via Wikimedia Commons.
- Satellite imagery © Esri, Maxar, Earthstar Geographics. Street map © OpenStreetMap contributors.
- Typeface: [Geist](https://vercel.com/font). Icons: [lucide](https://lucide.dev).

## Known limitations

- No backend: data is static JSON, so nothing is truly real-time and acknowledgements are per browser.
- No automated tests yet; verification was done by type-checking, linting, production build and manual browser testing (desktop and touch emulation at 375px and 320px).
- The map needs internet access for tiles.
