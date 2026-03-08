import { BarChart3, Clock3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function HostDashboardPage() {
  return (
    <Card className="border-slate-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="size-5 text-slate-700" />
          Host Dashboard
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-slate-600">
        <p>
          Host analytics summary will be implemented in Task 013.
        </p>
        <p className="flex items-center gap-2">
          <Clock3 className="size-4" />
          For now, mode switching and host navigation are active.
        </p>
      </CardContent>
    </Card>
  );
}

