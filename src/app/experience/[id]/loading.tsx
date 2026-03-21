import { Skeleton } from "@/components/ui/skeleton";

export default function ExperienceLoading() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="h-16 border-b" />

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Gallery */}
        <div className="grid grid-cols-4 grid-rows-2 gap-2 h-[400px]">
          <Skeleton className="col-span-2 row-span-2 rounded-2xl" />
          <Skeleton className="rounded-xl" />
          <Skeleton className="rounded-xl" />
          <Skeleton className="rounded-xl" />
          <Skeleton className="rounded-xl" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: details */}
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-5 w-1/3" />
            <div className="flex gap-2">
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            <div className="space-y-2 pt-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/6" />
            </div>
          </div>

          {/* Right: booking card */}
          <div>
            <Skeleton className="h-64 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
