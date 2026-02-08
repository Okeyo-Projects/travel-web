"use client"

import * as React from "react"
import { useBookingContext } from "@/components/booking/booking-context"
// We need to import the dialog components. The list_dir showed they are in components/ui/dialog.tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ChevronLeft } from "lucide-react"

// Steps (These will be created next)
import { StepDates } from "@/components/booking/steps/step-dates"
import { StepGuests } from "@/components/booking/steps/step-guests"
import { StepOptions } from "@/components/booking/steps/step-options"
import { StepPromo } from "@/components/booking/steps/step-promo"
import { StepReview } from "@/components/booking/steps/step-review"

export function BookingModal() {
    const {
        isOpen,
        closeBooking,
        currentStep,
        nextStep,
        prevStep,
        experience,
        canProceed
    } = useBookingContext()

    if (!experience) return null

    // Helper to determine active step component
    const StepComponent = () => {
        switch (currentStep) {
            case "dates":
                return <StepDates />
            case "guests":
                return <StepGuests />
            case "options":
                return <StepOptions />
            case "promo":
                return <StepPromo />
            case "review":
                return <StepReview />
            default:
                return null
        }
    }

    // Helper for title
    const getStepTitle = () => {
        switch (currentStep) {
            case "dates": return "Dates du séjour"
            case "guests": return "Voyageurs"
            case "options": return experience.type === "trip" ? "Départs" : "Options"
            case "promo": return "Code promo"
            case "review": return "Récapitulatif"
            default: return ""
        }
    }

    // Determine if we show the "Back" button
    // For lodging, "dates" is first. For trip, "options" is first.
    const isFirstStep = (experience.type === "trip" && currentStep === "options") ||
        (experience.type !== "trip" && currentStep === "dates")

    // Determine if we show the standard footer button
    // The "Review" step will have its own submit button
    const isReview = currentStep === "review"

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && closeBooking()}>
            <DialogContent className="sm:max-w-[500px] p-0 gap-0 overflow-hidden h-[90vh] sm:h-auto flex flex-col">
                <DialogHeader className="p-4 border-b flex flex-row items-center gap-2 space-y-0">
                    {!isFirstStep && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 -ml-2" onClick={prevStep}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                    )}
                    <div className="flex-1 text-center pr-6"> {/* Balance the back button spacing if needed */}
                        <DialogTitle>{getStepTitle()}</DialogTitle>
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-4 min-h-[300px]">
                    <StepComponent />
                </div>

                {!isReview && (
                    <div className="p-4 border-t bg-background">
                        <Button className="w-full" size="lg" onClick={nextStep} disabled={!canProceed}>
                            Continuer
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
