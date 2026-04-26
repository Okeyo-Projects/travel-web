"use client";

import { Cell, Pie, PieChart } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { useSiteI18n } from "@/components/site/site-i18n";
import type { StatusBreakdownPoint } from "@/types/host-analytics";

const STATUS_COLORS = [
  "#0f766e",
  "#0ea5e9",
  "#f59e0b",
  "#8b5cf6",
  "#ef4444",
  "#64748b",
  "#10b981",
  "#ec4899",
];

function buildConfig(data: StatusBreakdownPoint[]) {
  return Object.fromEntries(
    data.map((point, index) => [
      point.status,
      {
        label: point.label,
        color: STATUS_COLORS[index % STATUS_COLORS.length],
      },
    ]),
  );
}

type StatusBreakdownChartProps = {
  data: StatusBreakdownPoint[];
};

export function StatusBreakdownChart({ data }: StatusBreakdownChartProps) {
  const { t } = useSiteI18n();
  const chartConfig = buildConfig(data);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("host.charts.statusBreakdown")}</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[280px] w-full">
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent nameKey="status" />} />
            <Pie
              data={data}
              dataKey="value"
              nameKey="status"
              innerRadius={58}
              outerRadius={92}
              strokeWidth={2}
            >
              {data.map((point, index) => (
                <Cell
                  key={point.status}
                  fill={STATUS_COLORS[index % STATUS_COLORS.length]}
                />
              ))}
            </Pie>
            <ChartLegend content={<ChartLegendContent nameKey="status" />} />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
