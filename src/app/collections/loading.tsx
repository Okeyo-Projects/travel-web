import { Skeleton } from "@/components/ui/skeleton";

export default function CollectionsLoading() {
  return (
    <div className="min-h-screen">
      <div className="h-16 border-b" />
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <Skeleton className="h-8 w-48 mb-2" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholder
            <div key={i} className="space-y-3">
              <Skeleton className="aspect-video w-full rounded-2xl" />
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
