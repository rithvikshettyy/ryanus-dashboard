import { Skeleton } from "@/components/ui/skeleton";

// Shown automatically while the dashboard server component is loading (Suspense under the hood)
export default function Loading() {
  return (
    <>
      <div className="flex h-16 items-center border-b bg-card px-4 md:px-8">
        <Skeleton className="h-7 w-48" />
      </div>
      <div className="mx-auto max-w-[1400px] space-y-6 p-4 md:p-8">
        <Skeleton className="h-36 rounded-2xl" />
        <div className="grid gap-4 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-52 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    </>
  );
}
