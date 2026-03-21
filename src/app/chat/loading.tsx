import { Skeleton } from "@/components/ui/skeleton";

export default function ChatLoading() {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="h-16 border-b" />
      <div className="flex-1 flex flex-col max-w-3xl w-full mx-auto px-4 py-6 gap-4">
        {/* Message bubbles */}
        {Array.from({ length: 5 }).map((_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholder
          <div key={i} className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"}`}>
            <Skeleton
              className={`h-12 rounded-2xl ${i % 2 === 0 ? "w-2/3" : "w-1/2"}`}
            />
          </div>
        ))}
        {/* Input */}
        <div className="mt-auto">
          <Skeleton className="h-14 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
