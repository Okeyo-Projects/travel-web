"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { ExperienceBreakdownPoint } from "@/types/host-analytics";

const chartConfig = {
  bookings: {
    label: "Bookings",
    color: "#0f766e",
  },
};

type ExperienceBreakdownChartProps = {
  data: ExperienceBreakdownPoint[];
};

export function ExperienceBreakdownChart({
  data,
}: ExperienceBreakdownChartProps) {
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
        <CardTitle>Top Experiences by Bookings</CardTitle>
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
