"use client";

import { CartesianGrid, Line, LineChart, XAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { useSiteI18n } from "@/components/site/site-i18n";
import type { BookingTrendPoint } from "@/types/host-analytics";

type BookingsChartProps = {
  data: BookingTrendPoint[];
};

export function BookingsChart({ data }: BookingsChartProps) {
  const { t } = useSiteI18n();

  const chartConfig = {
    bookings: {
      label: t("host.charts.bookings"),
      color: "#0f766e",
    },
    revenue: {
      label: t("host.charts.revenue"),
      color: "#0284c7",
    },
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("host.charts.bookingsTrend")}</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[280px] w-full">
          <LineChart
            data={data}
            margin={{ left: 8, right: 8, top: 8, bottom: 8 }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={22}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Line
              dataKey="bookings"
              type="monotone"
              stroke="var(--color-bookings)"
              strokeWidth={2}
              dot={false}
            />
            <Line
              dataKey="revenue"
              type="monotone"
              stroke="var(--color-revenue)"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
