"use client";

import { CartesianGrid, Line, LineChart, XAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { BookingTrendPoint } from "@/types/host-analytics";

const chartConfig = {
  bookings: {
    label: "Bookings",
    color: "#0f766e",
  },
  revenue: {
    label: "Revenue",
    color: "#0284c7",
  },
};

type BookingsChartProps = {
  data: BookingTrendPoint[];
};

export function BookingsChart({ data }: BookingsChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Bookings and Revenue Trend</CardTitle>
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
