"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, Users } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { STATUS_CONFIG } from "@/components/tracking/trip-status";
import { useNow } from "@/hooks/use-now";
import { currentTrips } from "@/lib/tracking";
import { ACTIVE_USERS, type ActiveUser } from "@/lib/users";

function Avatar({ user, className = "size-8 text-[11px]" }: { user: ActiveUser; className?: string }) {
  return (
    <span
      aria-hidden
      className={`flex shrink-0 items-center justify-center rounded-full font-semibold ${className}`}
      style={{ background: user.tone.bg, color: user.tone.fg }}
    >
      {user.initial}
    </span>
  );
}

/** Avatar stack of who is on shift right now. Click it for the full list. */
export function ActiveUsers({ serverNow }: { serverNow: number }) {
  const [open, setOpen] = useState(false);
  const now = useNow(serverNow, 15_000);
  const total = ACTIVE_USERS.length;
  const shown = ACTIVE_USERS.slice(0, 4);

  // What each operator is doing right now, from the same simulation as the tracking map
  const trips = new Map(currentTrips(now).map((t) => [t.truck, t]));
  const staff = ACTIVE_USERS.filter((u) => u.role !== "Operator");
  const operators = ACTIVE_USERS.filter((u) => u.role === "Operator");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label={`${total} people active on site. Show list`}
        className="hidden h-10 items-center rounded-lg px-1.5 transition-colors hover:bg-muted aria-expanded:bg-muted sm:flex"
      >
        <span className="hidden items-center sm:flex">
          {shown.map((u, i) => (
            <span key={u.id} className="rounded-full border-2 border-card" style={{ marginLeft: i ? -8 : 0 }}>
              <Avatar user={u} />
            </span>
          ))}
        </span>
        <span className="num ml-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground sm:ml-2">
          <Users className="size-4 sm:hidden" aria-hidden />
          <span className="sm:hidden">{total}</span>
          <span className="hidden sm:inline">+{total - shown.length}</span>
        </span>
        <span className="relative ml-2 hidden size-2 sm:flex" aria-hidden>
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-productive opacity-60" />
          <span className="relative inline-flex size-2 rounded-full bg-productive" />
        </span>
      </PopoverTrigger>

      <PopoverContent align="end" sideOffset={8} className="w-[min(24rem,calc(100vw-1rem))] gap-0 rounded-2xl p-0">
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <h2 className="text-sm font-semibold">Active now</h2>
          <span className="num rounded-md bg-good-bg px-1.5 py-0.5 text-xs font-semibold text-good">{total} online</span>
          <p className="ml-auto text-xs text-muted-foreground">Anonymous</p>
        </div>

        <div className="max-h-[min(28rem,65vh)] overflow-y-auto">
          <p className="px-4 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Control room ({staff.length})
          </p>
          <ul>
            {staff.map((u) => (
              <li key={u.id} className="flex items-center gap-3 px-4 py-2">
                <Avatar user={u} className="size-9 text-xs" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{u.alias}</span>
                  <span className="block truncate text-xs text-muted-foreground">{u.role}</span>
                </span>
                <span className="num text-xs text-muted-foreground">since {u.since}</span>
              </li>
            ))}
          </ul>

          <p className="px-4 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Operators ({operators.length})
          </p>
          <ul className="pb-2">
            {operators.map((u) => {
              const trip = u.equipment ? trips.get(u.equipment) : undefined;
              const body = (
                <>
                  <Avatar user={u} className="size-9 text-xs" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{u.alias}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {u.equipment}
                      {trip ? ` · ${STATUS_CONFIG[trip.status].label}` : u.equipment === "Excavator 04" ? " · Loading" : " · Spreading"}
                    </span>
                  </span>
                  <span className="num text-xs text-muted-foreground">since {u.since}</span>
                  {trip && <ChevronRight className="size-4 text-muted-foreground" aria-hidden />}
                </>
              );
              return (
                <li key={u.id}>
                  {trip ? (
                    <Link
                      href={`/dashboard?tab=tracking&truck=${encodeURIComponent(u.equipment!)}`}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 px-4 py-2 transition-colors hover:bg-muted/60"
                      title={`Track ${u.equipment} on the map`}
                    >
                      {body}
                    </Link>
                  ) : (
                    <div className="flex items-center gap-3 px-4 py-2">{body}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        <p className="border-t px-4 py-2.5 text-xs text-muted-foreground">
          Names are hidden. Click an operator to follow their truck on the live map.
        </p>
      </PopoverContent>
    </Popover>
  );
}
