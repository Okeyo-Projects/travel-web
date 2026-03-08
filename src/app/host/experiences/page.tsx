import { Compass, Wrench } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function HostExperiencesPage() {
  return (
    <Card className="border-slate-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Compass className="size-5 text-slate-700" />
          Host Experiences
        </CardTitle>
      </CardHeader>
      <CardContent className="flex items-center gap-2 text-sm text-slate-600">
        <Wrench className="size-4" />
        Experience visibility management is planned in Task 014.
      </CardContent>
    </Card>
  );
}

