"use client"

import * as React from "react"
import { useBookingContext } from "@/components/booking/booking-context"
import { Card } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Minus, Plus, Users } from "lucide-react"
import { getImageUrl } from "@/utils/functions" // Assuming this utility exists based on user's code
import Image from "next/image"

export function StepOptions() {
    const { experience } = useBookingContext()

    if (experience?.type === "trip") {
        return <TripOptions />
    }

    if (experience?.type === "lodging") {
        return <LodgingOptions />
    }

    return (
        <div className="text-center text-muted-foreground py-8">
            Aucune option disponible pour ce type d'expérience.
        </div>
    )
}

function TripOptions() {
    const { experience, departureId, setDepartureId } = useBookingContext()
    const departures = experience?.trip?.departures || []

    if (departures.length === 0) {
        return (
            <div className="text-center py-8">
                <p className="text-muted-foreground">Aucun départ prévu pour le moment.</p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <div className="text-center space-y-1 mb-4">
                <h3 className="font-medium">Choisissez un départ</h3>
                <p className="text-sm text-muted-foreground">Sélectionnez la date qui vous convient.</p>
            </div>

            <RadioGroup value={departureId ?? ""} onValueChange={setDepartureId} className="space-y-3">
                {departures.map((dep) => {
                    const date = new Date(dep.depart_at)
                    const formatter = new Intl.DateTimeFormat("fr-FR", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                        hour: "numeric",
                        minute: "numeric",
                    })
                    const dateStr = formatter.format(date)

                    return (
                        <div key={dep.id} className="flex items-start space-x-2 border rounded-lg p-3 hover:bg-muted/50 cursor-pointer" onClick={() => setDepartureId(dep.id)}>
                            <RadioGroupItem value={dep.id} id={dep.id} className="mt-1" />
                            <div className="grid gap-1.5 leading-none w-full">
                                <Label htmlFor={dep.id} className="font-medium cursor-pointer capitalize">
                                    {dateStr}
                                </Label>
                                <div className="flex justify-between text-sm text-muted-foreground">
                                    <span>
                                        {dep.seats_available}/{dep.seats_total} places
                                    </span>
                                    {dep.price_override_cents ? (
                                        <span className="font-semibold text-primary">
                                            {new Intl.NumberFormat("fr-FR", { style: "currency", currency: experience?.trip?.price_currency }).format(dep.price_override_cents / 100)}
                                        </span>
                                    ) : (
                                        <span>Prix standard</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    )
                })}
            </RadioGroup>
        </div>
    )
}

function LodgingOptions() {
    const { experience, roomSelections, setRoomSelection } = useBookingContext()
    const rooms = experience?.lodging?.rooms || []

    if (rooms.length === 0) {
        return (
            <div className="text-center py-8">
                <p className="text-muted-foreground">Aucune chambre disponible.</p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="text-center space-y-1 mb-4">
                <h3 className="font-medium">Choisissez vos chambres</h3>
                <p className="text-sm text-muted-foreground">Sélectionnez le nombre de chambres souhaité.</p>
            </div>

            <div className="space-y-4">
                {rooms.map(room => {
                    const selection = roomSelections.find(r => r.roomId === room.id)
                    const quantity = selection?.quantity || 0

                    return (
                        <Card key={room.id} className="overflow-hidden">
                            {room.photoUrls[0] && (
                                <div className="relative h-32 w-full bg-muted">
                                    <Image
                                        src={getImageUrl(room.photoUrls[0])!}
                                        alt={room.name || "Room"}
                                        fill
                                        className="object-cover"
                                    />
                                </div>
                            )}
                            <div className="p-4 space-y-3">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h4 className="font-semibold">{room.name}</h4>
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                            <Users className="h-3 w-3" />
                                            <span>{room.max_persons} pers. max</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="font-bold text-lg">
                                        {new Intl.NumberFormat("fr-FR", { style: "currency", currency: room.currency }).format(room.price_cents / 100)}
                                        <span className="text-sm font-normal text-muted-foreground"> / nuit</span>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-8 w-8 rounded-full"
                                            onClick={() => setRoomSelection(room.id, Math.max(0, quantity - 1))}
                                            disabled={quantity === 0}
                                        >
                                            <Minus className="h-4 w-4" />
                                        </Button>
                                        <span className="w-4 text-center tabular-nums">{quantity}</span>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-8 w-8 rounded-full"
                                            onClick={() => setRoomSelection(room.id, quantity + 1)}
                                            disabled={quantity >= (room.total_rooms || 10)}
                                        >
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    )
                })}
            </div>
        </div>
    )
}
