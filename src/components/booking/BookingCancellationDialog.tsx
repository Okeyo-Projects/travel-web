"use client";

import { AlertTriangle, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useSiteI18n } from "@/components/site/site-i18n";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const NO_REASON_VALUE = "__none__";

const CANCELLATION_REASONS = [
  { value: "changed_plans", key: "changedPlans" },
  { value: "found_alternative", key: "foundAlternative" },
  { value: "price_too_high", key: "priceTooHigh" },
  { value: "personal_reasons", key: "personalReasons" },
  { value: "other", key: "other" },
] as const;

export type BookingCancellationReason =
  (typeof CANCELLATION_REASONS)[number]["value"];

export type BookingCancellationPayload = {
  reason: BookingCancellationReason | null;
  reasonLabel: string | null;
  details: string;
};

type BookingCancellationDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (payload: BookingCancellationPayload) => Promise<void> | void;
  isLoading?: boolean;
  policySummary: string;
  refundSummary: string;
};

export function BookingCancellationDialog({
  open,
  onOpenChange,
  onConfirm,
  isLoading = false,
  policySummary,
  refundSummary,
}: BookingCancellationDialogProps) {
  const { t } = useSiteI18n();
  const [reason, setReason] = useState<BookingCancellationReason | null>(null);
  const [details, setDetails] = useState("");

  useEffect(() => {
    if (!open) {
      setReason(null);
      setDetails("");
    }
  }, [open]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (isLoading) {
      return;
    }

    onOpenChange(nextOpen);
  };

  const handleConfirm = () => {
    const selectedReason = CANCELLATION_REASONS.find(
      (option) => option.value === reason,
    );

    void onConfirm({
      reason,
      reasonLabel: selectedReason
        ? t(`booking.cancellationDialog.reasons.${selectedReason.key}`)
        : null,
      details: details.trim(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-xl" showCloseButton={!isLoading}>
        <DialogHeader>
          <DialogTitle>{t("booking.cancellationDialog.title")}</DialogTitle>
          <DialogDescription>
            {t("booking.cancellationDialog.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 size-5 text-destructive" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">
                  {t("booking.cancellationDialog.warningTitle")}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t("booking.cancellationDialog.warningDescription")}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border bg-muted/20 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t("booking.cancellationDialog.policy")}
              </p>
              <p className="mt-2 text-sm text-foreground">{policySummary}</p>
            </div>
            <div className="rounded-xl border bg-muted/20 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t("booking.cancellationDialog.refund")}
              </p>
              <p className="mt-2 text-sm text-foreground">{refundSummary}</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="booking-cancel-reason">
              {t("booking.cancellationDialog.reasonLabel")}
            </Label>
            <Select
              value={reason ?? NO_REASON_VALUE}
              onValueChange={(value) => {
                setReason(
                  value === NO_REASON_VALUE
                    ? null
                    : (value as BookingCancellationReason),
                );
              }}
            >
              <SelectTrigger id="booking-cancel-reason" className="w-full">
                <SelectValue
                  placeholder={t("booking.cancellationDialog.reasonPlaceholder")}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_REASON_VALUE}>
                  {t("booking.cancellationDialog.reasonSkip")}
                </SelectItem>
                {CANCELLATION_REASONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {t(`booking.cancellationDialog.reasons.${option.key}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="booking-cancel-details">
              {t("booking.cancellationDialog.detailsLabel")}
            </Label>
            <Textarea
              id="booking-cancel-details"
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              placeholder={t("booking.cancellationDialog.detailsPlaceholder")}
              rows={4}
              maxLength={500}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            {t("booking.cancellationDialog.keep")}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="size-4 animate-spin" /> : null}
            {t("booking.cancellationDialog.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
