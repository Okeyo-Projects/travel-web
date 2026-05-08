"use client";

import { DollarSign, Star, Ticket, Users } from "lucide-react";
import { useSiteI18n } from "@/components/site/site-i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AppLocale } from "@/lib/i18n";
import { getIntlLocale } from "@/lib/i18n";
import type { HostDashboardSummary } from "@/types/host-analytics";

function formatMoney(cents: number, currency: string, locale: AppLocale) {
  return new Intl.NumberFormat(getIntlLocale(locale), {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

type StatisticsCardsProps = {
  summary: HostDashboardSummary;
};

export function StatisticsCards({ summary }: StatisticsCardsProps) {
  const { t, locale } = useSiteI18n();

  const cards = [
    {
      title: t("host.stats.totalBookings"),
      value: summary.totalBookings.toLocaleString(),
      icon: Ticket,
    },
    {
      title: t("host.stats.revenue"),
      value: formatMoney(summary.totalRevenueCents, summary.currency, locale),
      icon: DollarSign,
    },
    {
      title: t("host.stats.guestsHosted"),
      value: summary.totalGuests.toLocaleString(),
      icon: Users,
    },
    {
      title: t("host.stats.averageRating"),
      value: summary.averageRating
        ? summary.averageRating.toFixed(1)
        : t("host.stats.noRatings"),
      icon: Star,
    },
  ] as const;

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
            <card.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tracking-tight">{card.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
