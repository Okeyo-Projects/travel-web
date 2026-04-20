import { Loader2 } from "lucide-react";

export default function ChatLoading() {
  return (
    <div className="flex h-full min-h-0 items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  );
}
