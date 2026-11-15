"use client";

import { useState } from "react";
import { useT } from "@/components/i18n-provider";
import { useNow } from "@/hooks/use-now";
import { timeAgo } from "@/lib/format";

export function LiveStatus({ serverNow }: { serverNow: number }) {
  const t = useT();
  const now = useNow(serverNow, 15_000);
  const [loadedAt] = useState(serverNow);
  return (
    <p className="hidden items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-xs text-muted-foreground sm:flex" role="status">
      <span className="relative flex size-2">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-productive opacity-60" />
        <span className="relative inline-flex size-2 rounded-full bg-productive" />
      </span>
      {t("Live · Updated {ago}", { ago: timeAgo(now - loadedAt, t) })}
    </p>
  );
}
