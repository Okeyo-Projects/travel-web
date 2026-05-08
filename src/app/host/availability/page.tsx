import { CalendarRange, Wrench } from "lucide-react";
import { useSiteI18n } from "@/components/site/site-i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function HostAvailabilityPage() {
  const { t } = useSiteI18n();
  return (
    <Card className="border-slate-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarRange className="size-5 text-slate-700" />
          {t("host.availability.title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex items-center gap-2 text-sm text-slate-600">
        <Wrench className="size-4" />
        {t("host.availability.comingSoon")}
      </CardContent>
    </Card>
  );
}
