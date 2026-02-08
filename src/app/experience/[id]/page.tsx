"use client"

import * as React from "react"
import Image from "next/image"
import { useParams } from "next/navigation"
import {
  Loader2,
  MapPin,
  Star,
  Share2,
  Heart,
  ChevronLeft,
  Calendar,
  Users,
  Check,
  ShieldCheck
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useExperienceDetail } from "@/hooks/use-experience-detail"
import { getImageUrl } from "@/utils/functions"
import { useBooking } from "@/hooks/use-booking"

export default function ExperiencePage() {
  const params = useParams()
  const id = params?.id as string
  const { data, isLoading, isError } = useExperienceDetail(id)
  const { openBooking, BookingModal } = useBooking()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-destructive text-lg font-medium">Une erreur est survenue</p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Réessayer
        </Button>
      </div>
    )
  }

  const experience = data.transformed
  const { host, trip, lodging } = experience

  const price = trip?.price_per_person
    ? new Intl.NumberFormat("fr-FR", { style: "currency", currency: trip.price_currency }).format(trip.price_per_person / 100)
    : lodging?.rooms[0]?.price_cents
      ? new Intl.NumberFormat("fr-FR", { style: "currency", currency: lodging.rooms[0].currency }).format(lodging.rooms[0].price_cents / 100)
      : "Sur demande"

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Hero Section */}
      <div className="relative h-[50vh] w-full bg-muted">
        {experience.thumbnailUrl && (
          <Image
            src={experience.thumbnailUrl}
            alt={experience.title}
            fill
            className="object-cover"
            priority
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />

        <div className="absolute top-4 left-4 right-4 flex justify-between items-center text-white">
          <Button variant="ghost" size="icon" className="rounded-full bg-black/20 hover:bg-black/40 text-white" onClick={() => window.history.back()}>
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" className="rounded-full bg-black/20 hover:bg-black/40 text-white">
              <Share2 className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="rounded-full bg-black/20 hover:bg-black/40 text-white">
              <Heart className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 -mt-10 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Header Info */}
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-3xl font-bold">{experience.title}</h1>
                  <div className="flex items-center gap-2 text-muted-foreground mt-2">
                    <MapPin className="h-4 w-4" />
                    <span>{experience.city}, {experience.country}</span>
                  </div>
                </div>
                {experience.metrics.rating && (
                  <div className="flex items-center gap-1 bg-primary/10 px-3 py-1 rounded-full">
                    <Star className="h-4 w-4 fill-primary text-primary" />
                    <span className="font-semibold text-primary">{experience.metrics.rating.toFixed(1)}</span>
                    <span className="text-muted-foreground text-sm">({experience.metrics.reviews})</span>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {experience.tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="capitalize">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>

            <Separator />

            {/* Host Info */}
            {host && (
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={host.avatarUrl ?? undefined} />
                  <AvatarFallback>{host.name[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold text-lg">Proposé par {host.name}</h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {host.verified && (
                      <Badge variant="outline" className="text-xs border-green-500 text-green-600 gap-1">
                        <ShieldCheck className="h-3 w-3" /> Vérifié
                      </Badge>
                    )}
                    <span>Hôte depuis {new Date().getFullYear()}</span>
                  </div>
                </div>
              </div>
            )}

            <Separator />

            {/* Tabs */}
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="w-full justify-start overflow-x-auto">
                <TabsTrigger value="overview">Aperçu</TabsTrigger>
                {trip && <TabsTrigger value="itinerary">Itinéraire</TabsTrigger>}
                {lodging && <TabsTrigger value="rooms">Chambres</TabsTrigger>}
                <TabsTrigger value="reviews">Avis</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6 mt-6">
                <div className="prose max-w-none dark:prose-invert">
                  <p>{experience.longDescription || experience.shortDescription}</p>
                </div>

                {experience.amenities.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg">Ce que propose ce lieu</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {experience.amenities.map(amenity => (
                        <div key={amenity.key} className="flex items-center gap-2">
                          {/* We could render icons here if we mapped them to Lucide */}
                          <Check className="h-4 w-4 text-muted-foreground" />
                          <span>{amenity.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>

              {trip && (
                <TabsContent value="itinerary" className="mt-6 space-y-6">
                  <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
                    {trip.itinerary.map((item, index) => (
                      <div key={item.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-300 group-[.is-active]:bg-primary text-slate-500 group-[.is-active]:text-emerald-50 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                          <span className="font-bold text-sm">{item.day_number}</span>
                        </div>
                        <Card className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4">
                          <h4 className="font-bold mb-1">{item.title}</h4>
                          <p className="text-sm text-muted-foreground">{item.details}</p>
                        </Card>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              )}

              {lodging && (
                <TabsContent value="rooms" className="mt-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {lodging.rooms.map(room => (
                      <Card key={room.id}>
                        <div className="aspect-video relative bg-muted rounded-t-lg overflow-hidden">
                          {room.photoUrls[0] && (
                            <Image src={getImageUrl(room.photoUrls[0])!} alt={room.name || "Room"} fill className="object-cover" />
                          )}
                        </div>
                        <CardHeader>
                          <CardTitle className="text-base">{room.name}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-sm text-muted-foreground space-y-1">
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4" />
                              <span>{room.max_persons} personnes</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4" />
                              <span>{room.capacity_beds} lits</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>
              )}

              <TabsContent value="reviews" className="mt-6">
                <div className="text-center text-muted-foreground py-12">
                  Les avis seront bientôt disponibles.
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar Booking */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold">{price}</span>
                    <span className="text-muted-foreground font-normal text-sm">
                      / {trip ? "personne" : "nuit"}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="border rounded-lg p-3">
                      <label className="text-xs text-muted-foreground font-semibold uppercase block mb-1">Arrivée</label>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span className="text-sm">--/--</span>
                      </div>
                    </div>
                    <div className="border rounded-lg p-3">
                      <label className="text-xs text-muted-foreground font-semibold uppercase block mb-1">Départ</label>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span className="text-sm">--/--</span>
                      </div>
                    </div>
                  </div>

                  <div className="border rounded-lg p-3">
                    <label className="text-xs text-muted-foreground font-semibold uppercase block mb-1">Voyageurs</label>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span className="text-sm">1 voyageur</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button className="w-full" size="lg" onClick={() => openBooking(experience)}>
                    Réserver
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        </div>
      </div>
      <BookingModal />
    </div>
  )
}
