"use client";

import { Check, X } from "lucide-react";
import * as React from "react";
import { useBookingContext } from "@/components/booking/booking-context";
import { useSiteI18n } from "@/components/site/site-i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getIntlLocale } from "@/lib/i18n";

export function StepPromo() {
  const { locale, t } = useSiteI18n();
  const { promoCode, setPromoCode, quote, isLoadingQuote, quoteError } =
    useBookingContext();
  const [value, setValue] = React.useState(promoCode || "");
  const intlLocale = getIntlLocale(locale);

  // Update local state if context changes externally
  React.useEffect(() => {
    if (promoCode !== value) {
      setValue(promoCode || "");
    }
  }, [promoCode, value]);

  const handleApply = () => {
    setPromoCode(value.trim() || null);
  };

  // Determine feedback status
  // quote.discount_cents > 0 ? SUCCESS
  // quote.message contains error ? ERROR.
  // However, mobile implementations showed that getQuote returns success=true even if promo is invalid but message says so?
  // Let's rely on quote.discount_cents to determine success.

  const isApplied = quote && quote.discount_cents > 0;
  const errorMessage = quoteError
    ? t("booking.steps.promo.errorCalculating")
    : quote?.message && !isApplied && value
      ? quote.message
      : null;

  return (
    <div className="space-y-6">
      <div className="text-center space-y-1">
        <h3 className="font-medium">{t("booking.steps.promo.title")}</h3>
        <p className="text-sm text-muted-foreground">
          {t("booking.steps.promo.description")}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="promo">{t("booking.steps.promo.label")}</Label>
        <div className="flex gap-2">
          <Input
            id="promo"
            placeholder={t("booking.steps.promo.placeholder")}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="uppercase"
          />
          <Button onClick={handleApply} disabled={isLoadingQuote || !value}>
            {isLoadingQuote
              ? t("booking.steps.promo.loading")
              : t("booking.steps.promo.apply")}
          </Button>
        </div>

        {isApplied && (
          <div className="flex items-center gap-2 text-green-600 text-sm mt-2">
            <Check className="h-4 w-4" />
            <span>
              {t("booking.steps.promo.applied")} -
              {new Intl.NumberFormat(intlLocale, {
                style: "currency",
                currency: quote.currency,
              }).format(quote.discount_cents / 100)}
            </span>
          </div>
        )}

        {errorMessage && (
          <div className="flex items-center gap-2 text-destructive text-sm mt-2">
            <X className="h-4 w-4" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>
    </div>
  );
}
