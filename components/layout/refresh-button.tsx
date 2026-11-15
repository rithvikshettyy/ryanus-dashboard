"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

/**
 * Re-fetches the page's server data without a full reload, so filters in the URL
 * and anything you typed stay as they are. useTransition gives us the "pending" flag for the spinner.
 */
export function RefreshButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      onClick={() => startTransition(() => router.refresh())}
      disabled={pending}
      aria-label="Refresh data"
      title="Refresh data"
      className="flex size-10 shrink-0 items-center justify-center rounded-lg border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-70"
    >
      <RefreshCw className={pending ? "size-[18px] animate-spin" : "size-[18px]"} />
    </button>
  );
}
