"use client";

import { AlertTriangle, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
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
  { value: "changed_plans", label: "Changement de programme" },
  { value: "found_alternative", label: "J'ai trouvé une autre option" },
  { value: "price_too_high", label: "Le prix est trop élevé" },
  { value: "personal_reasons", label: "Raison personnelle" },
  { value: "other", label: "Autre" },
] as const;

export type BookingCancellationReason =
  (typeof CANCELLATION_REASONS)[number]["value"];

export type BookingCancellationPayload = {
  reason: BookingCancellationReason | null;
  reasonLabel: string | null;
  details: string;
};

interface BookingCancellationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (payload: BookingCancellationPayload) => Promise<void> | void;
  isLoading?: boolean;
  policySummary: string;
  refundSummary: string;
}

export function BookingCancellationDialog({
  open,
  onOpenChange,
  onConfirm,
  isLoading = false,
  policySummary,
  refundSummary,
}: BookingCancellationDialogProps) {
  const [reason, setReason] = useState<BookingCancellationReason | null>(null);
  const [details, setDetails] = useState("");

  useEffect(() => {
    if (!open) {
      setReason(null);
      setDetails("");
    }
  }, [open]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (isLoading) return;
    onOpenChange(nextOpen);
  };

  const handleConfirm = () => {
    const selectedReason = CANCELLATION_REASONS.find(
      (option) => option.value === reason,
    );

    void onConfirm({
      reason,
      reasonLabel: selectedReason?.label ?? null,
      details: details.trim(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-xl" showCloseButton={!isLoading}>
        <DialogHeader>
          <DialogTitle>Annuler la réservation</DialogTitle>
          <DialogDescription>
            Cette action est définitive. Vérifiez les conditions ci-dessous
            avant de confirmer.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 size-5 text-destructive" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">
                  Votre réservation sera annulée immédiatement.
                </p>
                <p className="text-sm text-muted-foreground">
                  Vous devrez créer une nouvelle réservation si vous changez
                  d&apos;avis plus tard.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border bg-muted/20 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Politique
              </p>
              <p className="mt-2 text-sm text-foreground">{policySummary}</p>
            </div>
            <div className="rounded-xl border bg-muted/20 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Remboursement estimé
              </p>
              <p className="mt-2 text-sm text-foreground">{refundSummary}</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="booking-cancel-reason">Motif (facultatif)</Label>
            <Select
              value={reason ?? NO_REASON_VALUE}
              onValueChange={(value) =>
                setReason(
                  value === NO_REASON_VALUE
                    ? null
                    : (value as BookingCancellationReason),
                )
              }
            >
              <SelectTrigger id="booking-cancel-reason" className="w-full">
                <SelectValue placeholder="Choisir un motif" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_REASON_VALUE}>
                  Je préfère ne pas préciser
                </SelectItem>
                {CANCELLATION_REASONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="booking-cancel-details">
              Détails supplémentaires (facultatif)
            </Label>
            <Textarea
              id="booking-cancel-details"
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              placeholder="Ajoutez un peu de contexte si vous le souhaitez."
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
            Garder la réservation
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="size-4 animate-spin" /> : null}
            Annuler la réservation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
