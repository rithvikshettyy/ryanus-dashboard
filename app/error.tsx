"use client"; // error boundaries must be client components

import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
      <span className="flex size-12 items-center justify-center rounded-xl bg-bad-bg text-bad">
        <TriangleAlert aria-hidden />
      </span>
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      <p className="max-w-md text-sm text-muted-foreground">{error.message || "Unexpected error while loading this page."}</p>
      <Button onClick={reset} className="h-10 px-4">
        Try again
      </Button>
    </div>
  );
}
