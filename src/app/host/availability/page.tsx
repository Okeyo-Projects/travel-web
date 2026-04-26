import { CalendarRange, Wrench } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function HostAvailabilityPage() {
  return (
    <Card className="border-slate-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarRange className="size-5 text-slate-700" />
          Host Availability
        </CardTitle>
      </CardHeader>
      <CardContent className="flex items-center gap-2 text-sm text-slate-600">
        <Wrench className="size-4" />
        Full availability management is coming soon.
      </CardContent>
    </Card>
  );
}
