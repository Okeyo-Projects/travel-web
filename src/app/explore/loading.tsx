import { Skeleton } from "@/components/ui/skeleton";

export default function ExploreLoading() {
  return (
    <div className="min-h-screen">
      {/* Header skeleton */}
      <div className="h-16 border-b" />

      {/* Search bar skeleton */}
      <div className="px-4 py-6 max-w-7xl mx-auto">
        <Skeleton className="h-12 w-full max-w-2xl rounded-full mb-8" />

        {/* Category filters */}
        <div className="flex gap-3 mb-8 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholder
            <Skeleton key={i} className="h-9 w-24 rounded-full flex-shrink-0" />
          ))}
        </div>

        {/* Experience cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholder
            <div key={i} className="space-y-3">
              <Skeleton className="aspect-[4/3] w-full rounded-2xl" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-1/3" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
