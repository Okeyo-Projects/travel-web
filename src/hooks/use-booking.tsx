"use client"

import * as React from "react"
import { BookingProvider, useBookingContext } from "@/components/booking/booking-context"
import { BookingModal } from "@/components/booking/booking-modal"
import type { ExperienceDetail } from "@/types/experience-detail"

export function useBooking() {
    // We need a way to access the context from outside... 
    // Actually, the pattern here is: 
    // 1. The consumer renders <BookingProvider> wrapping their app? No, that's too global.
    // 2. The consumer renders <BookingModal /> which CONTAINS the Provider? 
    //    But then how do we call setBooking from outside?

    // Better pattern: 
    // The hook returns the Modal component (already wrapped in Provider if needed, 
    // or it just returns the logic if the provider is higher up).

    // Let's make a wrapper component that holds the state, and the hook controls it via ref or exposed method?
    // Easier: 
    // The hook returns { openBooking, BookingModal }. 
    // The BookingModal component *is* the Provider + Dialog.
    // BUT to call openBooking, we need access to the state inside the provider.

    // Solution: 
    // We can't easily hoist the state out without a parent provider.
    // So, let's assume the user will wrap the "ExperiencePage" or specific section with a Provider 
    // if they want to use `useBookingContext`. 

    // However, for a simple "hook that returns a modal", we usually use a store (zustand) or a Ref.
    // Given we are using React Context, we might need a `BookingRoot` component.

    // Let's stick to the plan: `useBooking` returns a `BookingWrapper` component and an `open` function.
    // Wait, if the state is inside the component, we can't control it from outside unless we use a Ref.

    const bookingRef = React.useRef<{ open: (exp: ExperienceDetail) => void } | null>(null)

    const openBooking = React.useCallback((experience: ExperienceDetail) => {
        bookingRef.current?.open(experience)
    }, [])

    const BookingModalWrapper = React.useMemo(() => {
        return () => (
            <BookingProvider>
                <BookingModalTrigger ref={bookingRef} />
                <BookingModal />
            </BookingProvider>
        )
    }, [])

    return {
        openBooking,
        BookingModal: BookingModalWrapper
    }
}

// Internal component to expose the context via forwardRef to the hook
const BookingModalTrigger = React.forwardRef((props, ref) => {
    const { openBooking } = useBookingContext()

    React.useImperativeHandle(ref, () => ({
        open: openBooking
    }))

    return null
})
BookingModalTrigger.displayName = "BookingModalTrigger"
