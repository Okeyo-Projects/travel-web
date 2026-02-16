"use client";

import { ChevronLeft, Loader2, Tag } from "lucide-react";
import * as React from "react";
import { useBookingContext } from "@/components/booking/booking-context";
import { StepDates } from "@/components/booking/steps/step-dates";
import { StepGuests } from "@/components/booking/steps/step-guests";
import { StepOptions } from "@/components/booking/steps/step-options";
import { StepPromo } from "@/components/booking/steps/step-promo";
import { StepReview } from "@/components/booking/steps/step-review";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import type { BookingStep } from "./booking-context";

const STEP_LABELS: Record<BookingStep, string> = {
  guests: "Guests",
  options: "Options",
  dates: "Dates",
  promo: "Promo",
  review: "Review",
};

const STEP_TITLES: Record<BookingStep, string> = {
  guests: "Who's coming?",
  options: "Choose your option",
  dates: "Pick your dates",
  promo: "Promo code",
  review: "Review & confirm",
};

function formatCents(cents: number, currency: string) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function BookingModal() {
  const {
    isOpen,
    closeBooking,
    currentStep,
    nextStep,
    prevStep,
    experience,
    canProceed,
    quote,
    isLoadingQuote,
    quoteError,
  } = useBookingContext();

  if (!experience) return null;

  const stepsOrder: BookingStep[] =
    experience.type === "lodging"
      ? ["guests", "options", "dates", "promo", "review"]
      : ["options", "guests", "promo", "review"];

  const currentIndex = stepsOrder.indexOf(currentStep);
  const isFirstStep = currentIndex === 0;
  const isReview = currentStep === "review";

  const StepComponent = () => {
    switch (currentStep) {
      case "dates":
        return <StepDates />;
      case "guests":
        return <StepGuests />;
      case "options":
        return <StepOptions />;
      case "promo":
        return <StepPromo />;
      case "review":
        return <StepReview />;
      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && closeBooking()}>
      <DialogContent className="sm:max-w-[520px] p-0 gap-0 overflow-hidden max-h-[92vh] flex flex-col">
        {/* ── Header ──────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 border-b px-4 py-3">
          {!isFirstStep ? (
            <button
              type="button"
              onClick={prevStep}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full hover:bg-muted transition-colors"
              aria-label="Go back"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          ) : (
            <div className="h-8 w-8 shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide truncate">
              {experience.title}
            </p>
            <h2 className="text-base font-semibold leading-tight">
              {STEP_TITLES[currentStep]}
            </h2>
          </div>
        </div>

        {/* ── Step indicator ──────────────────────────────────────── */}
        <div className="flex items-start gap-0 border-b px-4 pt-3 pb-2 bg-muted/20">
          {stepsOrder.map((step, i) => {
            const isActive = i === currentIndex;
            const isDone = i < currentIndex;
            return (
              <React.Fragment key={step}>
                <div className="flex flex-col items-center gap-1.5 min-w-0">
                  <div
                    className={`h-1 rounded-full transition-all duration-300 ${
                      isActive
                        ? "w-10 bg-primary"
                        : isDone
                          ? "w-6 bg-primary/50"
                          : "w-6 bg-muted-foreground/20"
                    }`}
                  />
                  <span
                    className={`text-[10px] font-medium whitespace-nowrap transition-colors ${
                      isActive
                        ? "text-primary"
                        : isDone
                          ? "text-muted-foreground"
                          : "text-muted-foreground/40"
                    }`}
                  >
                    {STEP_LABELS[step]}
                  </span>
                </div>
                {i < stepsOrder.length - 1 && (
                  <div className="flex-1 h-px bg-border mt-[3px] mx-1" />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* ── Step content ────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-5 py-5 min-h-0">
          <StepComponent />
        </div>

        {/* ── Sticky footer with live price + action button ───────── */}
        {!isReview && (
          <div className="border-t bg-background px-4 pt-3 pb-4">
            <div className="flex items-end justify-between gap-4">
              {/* Live price */}
              <div className="min-w-0">
                {isLoadingQuote ? (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>Calculating…</span>
                  </div>
                ) : quoteError ? (
                  <span className="text-xs text-destructive">
                    Price unavailable
                  </span>
                ) : quote ? (
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground">
                      Total estimate
                    </p>
                    <div className="flex items-baseline gap-1.5">
                      {quote.discount_cents > 0 && (
                        <span className="text-xs line-through text-muted-foreground/60">
                          {formatCents(
                            quote.total_cents + quote.discount_cents,
                            quote.currency,
                          )}
                        </span>
                      )}
                      <span className="text-lg font-bold">
                        {formatCents(quote.total_cents, quote.currency)}
                      </span>
                    </div>
                    {quote.discount_cents > 0 && (
                      <div className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                        <Tag className="size-3" />
                        <span>{quote.message ?? "Promo applied"}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Complete details to see price
                  </p>
                )}
              </div>

              <Button
                size="lg"
                onClick={nextStep}
                disabled={!canProceed || isLoadingQuote}
                className="shrink-0 px-7"
              >
                Continue
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
