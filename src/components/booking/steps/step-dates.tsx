"use client"

import * as React from "react"
import { useBookingContext } from "@/components/booking/booking-context"
import { Calendar } from "@/components/ui/calendar" // Assuming this exists
import { addDays } from "date-fns"

import { DateRange } from "react-day-picker"

export function StepDates() {
    const { startDate, endDate, setDates } = useBookingContext()

    // Use a range state for the Calendar component
    const [range, setRange] = React.useState<DateRange | undefined>({
        from: startDate,
        to: endDate,
    })

    // Update context when range changes
    React.useEffect(() => {
        setDates(range?.from, range?.to)
    }, [range, setDates])

    return (
        <div className="flex flex-col items-center space-y-4">
            <div className="text-center space-y-1">
                <h3 className="font-medium">Quand partez-vous ?</h3>
                <p className="text-sm text-muted-foreground">Sélectionnez vos dates d'arrivée et de départ.</p>
            </div>

            <Calendar
                mode="range"
                selected={range}
                onSelect={setRange}
                disabled={(date) => date < new Date() || date < addDays(new Date(), -1)}
                // @ts-ignore - DayPicker props can be tricky with types sometimes
                initialFocus
                numberOfMonths={1} // Keep it simple for modal width
                className="rounded-md border shadow"
            />

            {/* Optional: Show selected range text or duration */}
            {/* <div className="text-sm">
        {startDate && endDate ? (
          <span>{format(startDate, 'dd MMM')} - {format(endDate, 'dd MMM')}</span>
        ) : (
          <span>Selectionnez des dates</span>
        )}
      </div> */}
        </div>
    )
}
