"use client"

import * as React from "react"
import { useBookingContext } from "@/components/booking/booking-context"
import { Button } from "@/components/ui/button"
import { Minus, Plus } from "lucide-react"

export function StepGuests() {
    const { adults, children, infants, setGuests } = useBookingContext()

    const maxGuests = 10 // Hardcoded limit for now, ideally from experience config

    const update = (type: "adults" | "children" | "infants", delta: number) => {
        const current = type === "adults" ? adults : type === "children" ? children : infants
        const min = type === "adults" ? 1 : 0
        // Simple total check: adults + children < maxGuests?
        // Let's just limit individual counters for simplicity, validation is in context

        // Check global max?
        if (delta > 0 && (adults + children + infants >= maxGuests)) return

        const next = Math.max(min, current + delta)
        setGuests(type, next)
    }

    return (
        <div className="space-y-6">
            <div className="text-center space-y-1">
                <h3 className="font-medium">Qui participe au voyage ?</h3>
                <p className="text-sm text-muted-foreground">Indiquez le nombre de voyageurs.</p>
            </div>

            <div className="space-y-4">
                <GuestCounter
                    label="Adultes"
                    description="13 ans et plus"
                    value={adults}
                    onIncrement={() => update("adults", 1)}
                    onDecrement={() => update("adults", -1)}
                    min={1}
                />
                <GuestCounter
                    label="Enfants"
                    description="De 2 à 12 ans"
                    value={children}
                    onIncrement={() => update("children", 1)}
                    onDecrement={() => update("children", -1)}
                />
                <GuestCounter
                    label="Bébés"
                    description="Moins de 2 ans"
                    value={infants}
                    onIncrement={() => update("infants", 1)}
                    onDecrement={() => update("infants", -1)}
                />
            </div>
        </div>
    )
}

function GuestCounter({
    label,
    description,
    value,
    onIncrement,
    onDecrement,
    min = 0
}: {
    label: string
    description: string
    value: number
    onIncrement: () => void
    onDecrement: () => void
    min?: number
}) {
    return (
        <div className="flex items-center justify-between py-2">
            <div>
                <div className="font-medium">{label}</div>
                <div className="text-sm text-muted-foreground">{description}</div>
            </div>
            <div className="flex items-center gap-3">
                <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-full"
                    onClick={onDecrement}
                    disabled={value <= min}
                >
                    <Minus className="h-4 w-4" />
                </Button>
                <span className="w-4 text-center tabular-nums">{value}</span>
                <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-full"
                    onClick={onIncrement}
                >
                    <Plus className="h-4 w-4" />
                </Button>
            </div>
        </div>
    )
}
