"use client"

import * as React from "react"
import { addDays, differenceInDays } from "date-fns"
import { useGetBookingQuote, type BookingQuoteResult } from "@/hooks/use-booking-mutations"
import type { ExperienceDetail } from "@/types/experience-detail"
import { useAuth } from "@/hooks/use-auth" // Assuming this exists or we need to check
import { toast } from "sonner"

/* -------------------------------------------------------------------------------------------------
 * Types
 * -----------------------------------------------------------------------------------------------*/

export type BookingStep =
    | "dates"      // Initial step: Select dates (Lodging)
    | "guests"     // Select guests
    | "options"    // Select rooms (Lodging) or Departures (Trip)
    | "promo"      // Enter promo code
    | "review"     // Review and pay

export type RoomSelection = {
    roomId: string
    quantity: number
}

interface BookingContextValue {
    // Data
    experience: ExperienceDetail | null
    isOpen: boolean
    currentStep: BookingStep

    // State
    startDate: Date | undefined
    endDate: Date | undefined
    adults: number
    children: number
    infants: number
    departureId: string | null
    roomSelections: RoomSelection[]
    promoCode: string | null
    guestNotes: string

    // Computed
    quote: BookingQuoteResult | null
    isLoadingQuote: boolean
    quoteError: Error | null
    canProceed: boolean
    nights: number

    // Actions
    openBooking: (experience: ExperienceDetail) => void
    closeBooking: () => void
    setDates: (start: Date | undefined, end: Date | undefined) => void
    setGuests: (type: "adults" | "children" | "infants", value: number) => void
    setDepartureId: (id: string | null) => void
    setRoomSelection: (roomId: string, quantity: number) => void
    setPromoCode: (code: string | null) => void
    setGuestNotes: (notes: string) => void
    goToStep: (step: BookingStep) => void
    nextStep: () => void
    prevStep: () => void
}

const BookingContext = React.createContext<BookingContextValue | undefined>(undefined)

/* -------------------------------------------------------------------------------------------------
 * Provider
 * -----------------------------------------------------------------------------------------------*/

export function BookingProvider({ children }: { children: React.ReactNode }) {
    const [isOpen, setIsOpen] = React.useState(false)
    const [experience, setExperience] = React.useState<ExperienceDetail | null>(null)

    // Steps
    const [currentStep, setCurrentStep] = React.useState<BookingStep>("dates")

    // Form State
    const [startDate, setStartDate] = React.useState<Date | undefined>(undefined)
    const [endDate, setEndDate] = React.useState<Date | undefined>(undefined)
    const [adults, setAdults] = React.useState(1)
    const [childrenCount, setChildrenCount] = React.useState(0)
    const [infants, setInfants] = React.useState(0)
    const [departureId, setDepartureId] = React.useState<string | null>(null)
    const [roomSelections, setRoomSelections] = React.useState<RoomSelection[]>([])
    const [promoCode, setPromoCode] = React.useState<string | null>(null)
    const [guestNotes, setGuestNotes] = React.useState("")

    // Quote State
    const { mutateAsync: getQuote, isPending: isLoadingQuote, error: quoteError, reset: resetQuote } = useGetBookingQuote()
    const [quote, setQuote] = React.useState<BookingQuoteResult | null>(null)

    // Reset state when opening for a new experience
    const openBooking = React.useCallback((exp: ExperienceDetail) => {
        setExperience(exp)
        setIsOpen(true)

        // Reset form
        setStartDate(undefined)
        setEndDate(undefined)
        setAdults(1)
        setChildrenCount(0)
        setInfants(0)
        setDepartureId(null)
        setRoomSelections([])
        setPromoCode(null)
        setGuestNotes("")
        setQuote(null)
        resetQuote()

        // Determine initial step
        if (exp.type === "trip") {
            // Trips usually start with Departure selection or Options if multiple departures
            // But standard flow: Options (Departures) -> Guests -> Review
            setCurrentStep("options")

            // Auto-select first departure if only one exists?
            if (exp.trip?.departures && exp.trip.departures.length > 0) {
                // Maybe don't auto-select to force user choice
            }
        } else {
            // Lodging starts with Dates
            setCurrentStep("dates")
        }
    }, [resetQuote])

    const closeBooking = React.useCallback(() => {
        setIsOpen(false)
    }, [])

    // Derived Values
    const nights = React.useMemo(() => {
        if (!startDate || !endDate) return 0
        return differenceInDays(endDate, startDate)
    }, [startDate, endDate])

    // Quote Effect
    React.useEffect(() => {
        // Debounce or just trigger when valid requirements are met
        const fetchQuote = async () => {
            if (!experience) return

            // Validation for quote fetching
            let readyToQuote = false

            if (experience.type === "lodging") {
                if (startDate && endDate && roomSelections.length > 0) {
                    readyToQuote = true
                }
            } else if (experience.type === "trip") {
                if (departureId) {
                    readyToQuote = true
                }
            }

            if (readyToQuote) {
                try {
                    const result = await getQuote({
                        experienceId: experience.id,
                        fromDate: startDate ? startDate.toISOString().split('T')[0] : "",
                        toDate: endDate ? endDate.toISOString().split('T')[0] : (startDate ? startDate.toISOString().split('T')[0] : ""),
                        adults,
                        children: childrenCount,
                        infants,
                        rooms: roomSelections.map(r => ({ room_type_id: r.roomId, quantity: r.quantity })),
                        departureId: departureId ?? undefined,
                        promotionCode: promoCode ?? undefined,
                    })
                    setQuote(result)
                } catch (err) {
                    setQuote(null)
                    // Error is handled by hook state, but we could toast here
                }
            } else {
                setQuote(null)
            }
        }

        const timer = setTimeout(fetchQuote, 500)
        return () => clearTimeout(timer)
    }, [
        experience,
        startDate,
        endDate,
        adults,
        childrenCount,
        infants,
        roomSelections,
        departureId,
        promoCode,
        getQuote
    ])

    // Navigation Logic
    const stepsOrder: BookingStep[] = React.useMemo(() => {
        if (experience?.type === "lodging") {
            return ["dates", "guests", "options", "promo", "review"]
        }
        return ["options", "guests", "promo", "review"]
    }, [experience])

    const nextStep = React.useCallback(() => {
        const currentIndex = stepsOrder.indexOf(currentStep)
        if (currentIndex < stepsOrder.length - 1) {
            setCurrentStep(stepsOrder[currentIndex + 1])
        }
    }, [currentStep, stepsOrder])

    const prevStep = React.useCallback(() => {
        const currentIndex = stepsOrder.indexOf(currentStep)
        if (currentIndex > 0) {
            setCurrentStep(stepsOrder[currentIndex - 1])
        }
    }, [currentStep, stepsOrder])

    // Helpers
    const setGuests = (type: "adults" | "children" | "infants", value: number) => {
        if (type === "adults") setAdults(value)
        if (type === "children") setChildrenCount(value)
        if (type === "infants") setInfants(value)
    }

    const setRoomSelection = (roomId: string, quantity: number) => {
        setRoomSelections(prev => {
            // Remove existing
            const filtered = prev.filter(r => r.roomId !== roomId)
            if (quantity > 0) {
                return [...filtered, { roomId, quantity }]
            }
            return filtered
        })
    }

    const canProceed = React.useMemo(() => {
        if (!experience) return false

        switch (currentStep) {
            case "dates":
                return !!startDate && !!endDate && nights > 0
            case "guests":
                return adults > 0
            case "options":
                if (experience.type === "lodging") return roomSelections.length > 0
                if (experience.type === "trip") return !!departureId
                return true
            case "promo":
                return true // Always optional
            case "review":
                return !!quote && quote.success
            default:
                return false
        }
    }, [experience, currentStep, startDate, endDate, nights, adults, roomSelections, departureId, quote])

    const value = {
        experience,
        isOpen,
        currentStep,
        startDate,
        endDate,
        adults,
        children: childrenCount,
        infants,
        departureId,
        roomSelections,
        promoCode,
        guestNotes,
        quote,
        isLoadingQuote,
        quoteError: quoteError as Error | null,
        canProceed,
        nights,
        openBooking,
        closeBooking,
        setDates: (s, e) => { setStartDate(s); setEndDate(e) },
        setGuests,
        setDepartureId,
        setRoomSelection,
        setPromoCode,
        setGuestNotes,
        goToStep: setCurrentStep,
        nextStep,
        prevStep,
    }

    return (
        <BookingContext.Provider value={value}>
            {children}
        </BookingContext.Provider>
    )
}

export function useBookingContext() {
    const context = React.useContext(BookingContext)
    if (!context) {
        throw new Error("useBookingContext must be used within a BookingProvider")
    }
    return context
}
