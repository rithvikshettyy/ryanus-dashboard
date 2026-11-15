"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BellRing, ChevronDown, LifeBuoy, Mail, MapPinned, MessageCircle, Phone, Search, ShieldAlert } from "lucide-react";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { SupportChat } from "@/components/modules/support-chat";
import { useDebounce } from "@/hooks/use-debounce";
import { FAQ } from "@/lib/faq";
import type { Chunk } from "@/lib/rag";
import type { Alert } from "@/lib/types";

const GUIDES = [
  { href: "/alerts", icon: ShieldAlert, title: "Handling alerts", text: "Severity, thresholds and next steps." },
  { href: "/dashboard?tab=tracking", icon: MapPinned, title: "Live truck tracking", text: "Map, trips and ETA per truck." },
  { href: "/settings", icon: BellRing, title: "Notification settings", text: "Choose what reaches you." },
];

export function HelpCenter({ chunks, alerts, serverNow }: { chunks: Chunk[]; alerts: Alert[]; serverNow: number }) {
  const [query, setQuery] = useState("");
  const [chatOpen, setChatOpen] = useState(false);
  const q = useDebounce(query, 250).trim().toLowerCase();
  const items = useMemo(() => FAQ.filter((f) => !q || `${f.q} ${f.a}`.toLowerCase().includes(q)), [q]);

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <SupportChat open={chatOpen} onOpenChange={setChatOpen} chunks={chunks} alerts={alerts} serverNow={serverNow} />
      <div className="space-y-4 lg:col-span-2">
        <div className="grid gap-3 sm:grid-cols-3">
          {GUIDES.map(({ href, icon: Icon, title, text }) => (
            <Link key={title} href={href} className="group min-w-0 rounded-2xl border bg-card p-4 shadow-xs transition-shadow hover:shadow-md">
              <span className="flex size-9 items-center justify-center rounded-lg bg-primary-soft text-primary">
                <Icon className="size-[18px]" aria-hidden />
              </span>
              <p className="mt-3 text-sm font-semibold group-hover:text-primary">{title}</p>
              <p className="text-xs text-muted-foreground">{text}</p>
            </Link>
          ))}
        </div>

        <Panel>
          <PanelHeader icon={LifeBuoy} title="Frequently asked questions" description="Search the answers or open one" />
          <div className="relative mb-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search help"
              aria-label="Search help"
              className="h-10 w-full rounded-lg border bg-background pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary/30"
            />
          </div>
          {items.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <p className="text-sm text-muted-foreground">No answers match &ldquo;{query}&rdquo;.</p>
              <button
                type="button"
                onClick={() => setChatOpen(true)}
                className="inline-flex h-10 items-center gap-2 rounded-lg border px-4 text-sm font-medium transition-colors hover:bg-muted"
              >
                <MessageCircle className="size-4" aria-hidden /> Ask support instead
              </button>
            </div>
          ) : (
            <div className="divide-y">
              {items.map((f) => (
                <details key={f.q} className="group py-1">
                  <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
                    <span className="flex-1">{f.q}</span>
                    <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
                  </summary>
                  <p className="pb-3 text-sm text-muted-foreground">{f.a}</p>
                </details>
              ))}
            </div>
          )}
        </Panel>
      </div>

      <Panel className="h-fit space-y-4">
        <PanelHeader title="Contact the control room" description="24 x 7 · typical reply under 10 minutes" />
        <button
          type="button"
          onClick={() => setChatOpen(true)}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          <MessageCircle className="size-[18px]" aria-hidden /> Ask support
        </button>
        <a href="tel:+910000000000" className="flex min-h-12 items-center gap-3 rounded-xl border p-3 transition-colors hover:bg-muted/60">
          <span className="flex size-9 items-center justify-center rounded-lg bg-good-bg text-good"><Phone className="size-[18px]" aria-hidden /></span>
          <span className="text-sm"><span className="block font-medium">Emergency line</span><span className="text-xs text-muted-foreground">Radio channel 4 or desk phone 100</span></span>
        </a>
        <a href="mailto:support@example.com" className="flex min-h-12 items-center gap-3 rounded-xl border p-3 transition-colors hover:bg-muted/60">
          <span className="flex size-9 items-center justify-center rounded-lg bg-info-bg text-info"><Mail className="size-[18px]" aria-hidden /></span>
          <span className="text-sm"><span className="block font-medium">Email support</span><span className="text-xs text-muted-foreground">For reports, access and data issues</span></span>
        </a>
      </Panel>
    </div>
  );
}
