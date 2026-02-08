"use client"

import * as React from "react"
import { useBookingContext } from "@/components/booking/booking-context"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Check, X } from "lucide-react"

export function StepPromo() {
    const { promoCode, setPromoCode, quote, isLoadingQuote, quoteError } = useBookingContext()
    const [value, setValue] = React.useState(promoCode || "")

    // Update local state if context changes externally
    React.useEffect(() => {
        if (promoCode !== value) {
            setValue(promoCode || "")
        }
    }, [promoCode])

    const handleApply = () => {
        setPromoCode(value.trim() || null)
    }

    // Determine feedback status
    // quote.discount_cents > 0 ? SUCCESS
    // quote.message contains error ? ERROR. 
    // However, mobile implementations showed that getQuote returns success=true even if promo is invalid but message says so?
    // Let's rely on quote.discount_cents to determine success.

    const isApplied = quote && quote.discount_cents > 0
    const errorMessage = quoteError ? "Erreur lors du calcul" : (quote?.message && !isApplied && value ? quote.message : null)

    return (
        <div className="space-y-6">
            <div className="text-center space-y-1">
                <h3 className="font-medium">Avez-vous un code promo ?</h3>
                <p className="text-sm text-muted-foreground">Entrez-le ci-dessous pour bénéficier d'une réduction.</p>
            </div>

            <div className="space-y-2">
                <Label htmlFor="promo">Code Promo</Label>
                <div className="flex gap-2">
                    <Input
                        id="promo"
                        placeholder="Ex: WELCOME10"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        className="uppercase"
                    />
                    <Button onClick={handleApply} disabled={isLoadingQuote || !value}>
                        {isLoadingQuote ? "..." : "Appliquer"}
                    </Button>
                </div>

                {isApplied && (
                    <div className="flex items-center gap-2 text-green-600 text-sm mt-2">
                        <Check className="h-4 w-4" />
                        <span>Code appliqué : -{new Intl.NumberFormat("fr-FR", { style: "currency", currency: quote.currency }).format(quote.discount_cents / 100)}</span>
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
    )
}
