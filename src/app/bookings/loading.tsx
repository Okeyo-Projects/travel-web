import { Skeleton } from "@/components/ui/skeleton";

export default function BookingsLoading() {
  return (
    <div className="min-h-screen">
      <div className="h-16 border-b" />
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
        <Skeleton className="h-8 w-48 mb-6" />
        {Array.from({ length: 4 }).map((_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholder
          <div key={i} className="flex gap-4 p-4 border rounded-2xl">
            <Skeleton className="size-20 rounded-xl flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-4 w-1/4" />
            </div>
            <Skeleton className="h-8 w-20 rounded-lg flex-shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
