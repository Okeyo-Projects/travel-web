import { Skeleton } from "@/components/ui/skeleton";

export default function HostLoading() {
  return (
    <div className="min-h-screen">
      <div className="h-16 border-b" />
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholder
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
