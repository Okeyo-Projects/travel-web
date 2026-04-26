"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { useSiteI18n } from "@/components/site/site-i18n";
import type { ExperienceBreakdownPoint } from "@/types/host-analytics";

type ExperienceBreakdownChartProps = {
  data: ExperienceBreakdownPoint[];
};

export function ExperienceBreakdownChart({
  data,
}: ExperienceBreakdownChartProps) {
  const { t } = useSiteI18n();

  const chartConfig = {
    bookings: {
      label: t("host.charts.bookings"),
      color: "#0f766e",
    },
  };

  const normalized = data.map((item) => ({
    ...item,
    shortTitle:
      item.experienceTitle.length > 22
        ? `${item.experienceTitle.slice(0, 22)}…`
        : item.experienceTitle,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("host.charts.topExperiences")}</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[280px] w-full">
          <BarChart
            data={normalized}
            layout="vertical"
            margin={{ left: 8, right: 16, top: 8, bottom: 8 }}
          >
            <CartesianGrid horizontal={false} />
            <YAxis
              type="category"
              dataKey="shortTitle"
              tickLine={false}
              axisLine={false}
              width={124}
            />
            <XAxis type="number" tickLine={false} axisLine={false} />
            <ChartTooltip
              content={<ChartTooltipContent labelKey="experienceTitle" />}
            />
            <Bar dataKey="bookings" fill="var(--color-bookings)" radius={4} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
