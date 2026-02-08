"use client"

import * as React from "react"
import { useBookingContext } from "@/components/booking/booking-context"
import { useCreateBooking } from "@/hooks/use-booking-mutations"
import { useAuth } from "@/hooks/use-auth" // Assuming
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Loader2, Calendar, Users, Percent } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

export function StepReview() {
    const {
        experience,
        startDate,
        endDate,
        adults,
        children,
        infants,
        departureId,
        roomSelections,
        promoCode,
        guestNotes,
        setGuestNotes,
        quote,
        isLoadingQuote
    } = useBookingContext()

    const { mutateAsync: createBooking, isPending: isSubmitting } = useCreateBooking()
    // const { user } = useAuth() // We might need user ID
    const router = useRouter()

    if (!experience || !quote) return null

    const formatCurrency = (amountCents: number) => {
        return new Intl.NumberFormat("fr-FR", { style: "currency", currency: quote.currency }).format(amountCents / 100)
    }

    const handleSubmit = async () => {
        if (!experience.host?.id) return
        // if (!user) ... // Handled by auth guard implicitly or we should check?

        try {
            await createBooking({
                experienceId: experience.id,
                hostId: experience.host.id,
                guestId: "TODO_GET_USER_ID", // FIXME: Need to get user ID from auth hook
                fromDate: startDate?.toISOString().split('T')[0] ?? "",
                toDate: endDate?.toISOString().split('T')[0] ?? (startDate?.toISOString().split('T')[0] ?? ""),
                adults,
                children,
                infants,
                departureId,
                rooms: roomSelections.map(r => ({ room_type_id: r.roomId, quantity: r.quantity })),
                guestNotes,
                subtotalCents: quote.subtotal_cents,
                feesCents: quote.fees_cents,
                taxesCents: quote.taxes_cents,
                totalCents: quote.total_cents,
                currency: quote.currency,
                metadata: {
                    nights: quote.nights,
                    experienceType: experience.type,
                    promotionCode: promoCode
                }
            })

            toast.success("Demande de réservation envoyée !")
            // Close modal or redirect?
            // window.location.reload() // or closeBooking()
            // Let's rely on the parent or redirect to a success page
            // router.push('/bookings')
        } catch (error) {
            toast.error("Erreur lors de la réservation. Veuillez réessayer.")
            console.error(error)
        }
    }

    // Date formatting
    const dateStr = React.useMemo(() => {
        if (startDate && endDate) {
            return `${new Intl.DateTimeFormat("fr-FR", { dateStyle: "short" }).format(startDate)} au ${new Intl.DateTimeFormat("fr-FR", { dateStyle: "short" }).format(endDate)}`
        }
        return startDate ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "short" }).format(startDate) : ""
    }, [startDate, endDate])

    return (
        <div className="space-y-6">
            <div className="space-y-4">
                <h3 className="font-medium text-lg">Récapitulatif</h3>

                {/* Details Card */}
                <div className="bg-muted/40 rounded-lg p-4 space-y-3 text-sm">
                    <div className="flex items-center gap-3">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>{dateStr}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>
                            {adults} adultes
                            {children > 0 && `, ${children} enfants`}
                            {infants > 0 && `, ${infants} bébés`}
                        </span>
                    </div>
                    {quote.discount_cents > 0 && (
                        <div className="flex items-center gap-3 text-green-600">
                            <Percent className="h-4 w-4" />
                            <span>Code promo appliqué</span>
                        </div>
                    )}
                </div>

                {/* Price Breakdown */}
                <div className="space-y-2">
                    {quote.breakdown.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-sm">
                            <span className="text-muted-foreground">{item.label}</span>
                            <span>{formatCurrency(item.amount_cents)}</span>
                        </div>
                    ))}

                    <Separator className="my-2" />

                    <div className="flex justify-between font-bold text-lg">
                        <span>Total</span>
                        <span>{formatCurrency(quote.total_cents)}</span>
                    </div>
                </div>

                {/* Notes */}
                <div className="space-y-2 pt-2">
                    <label htmlFor="notes" className="text-sm font-medium">Message à l'hôte (optionnel)</label>
                    <Textarea
                        id="notes"
                        placeholder="Bonjour, je suis impatient de..."
                        value={guestNotes}
                        onChange={(e) => setGuestNotes(e.target.value)}
                        className="resize-none h-24"
                    />
                </div>
            </div>

            <div className="pt-4 border-t bg-background">
                <Button className="w-full" size="lg" onClick={handleSubmit} disabled={isSubmitting || isLoadingQuote}>
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Confirmer la réservation
                </Button>
                <p className="text-xs text-center text-muted-foreground mt-2">
                    Vous ne serez débité que lorsque l'hôte aura accepté votre demande.
                </p>
            </div>
        </div>
    )
}
