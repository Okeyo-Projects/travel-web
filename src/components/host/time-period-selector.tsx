"use client";

import { Button } from "@/components/ui/button";
import {
  HOST_DASHBOARD_PERIOD_OPTIONS,
  type HostDashboardPeriod,
} from "@/types/host-analytics";

type TimePeriodSelectorProps = {
  value: HostDashboardPeriod;
  onChange: (period: HostDashboardPeriod) => void;
};

export function TimePeriodSelector({
  value,
  onChange,
}: TimePeriodSelectorProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {HOST_DASHBOARD_PERIOD_OPTIONS.map((option) => (
        <Button
          key={option.value}
          type="button"
          variant={option.value === value ? "default" : "outline"}
          size="sm"
          onClick={() => onChange(option.value)}
          className="shrink-0"
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}
