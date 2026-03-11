"use client";

import {
  BedDouble,
  Check,
  ChevronLeft,
  Clock3,
  Heart,
  Loader2,
  MapPin,
  Minus,
  ShieldCheck,
  Share2,
  Star,
  Users,
  X,
} from "lucide-react";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ExperienceGallery } from "@/components/experience/ExperienceGallery";
import { ReviewList } from "@/components/experience/ReviewList";
import { MarketingHeader } from "@/components/site/MarketingHeader";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBooking } from "@/hooks/use-booking";
import { useExperienceDetail } from "@/hooks/use-experience-detail";
import { ANALYTICS_EVENT } from "@/lib/analytics/events";
import { captureEvent } from "@/lib/analytics/posthog";

function formatMoney(cents: number | null | undefined, currency = "MAD") {
  if (typeof cents !== "number") {
    return "Sur demande";
  }

  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function formatDuration(days: number | null, hours: number | null) {
  if (days && days > 0) {
    return `${days} jour${days > 1 ? "s" : ""}`;
  }
  if (hours && hours > 0) {
    return `${hours}h`;
  }
  return "Flexible";
}

function formatDate(date: string | null | undefined) {
  if (!date) {
    return "--/--";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
  }).format(new Date(date));
}

function buildMapLinks(
  latitude: number | null,
  longitude: number | null,
  locationLabel: string,
) {
  if (typeof latitude !== "number" || typeof longitude !== "number") {
    const encodedQuery = encodeURIComponent(locationLabel);
    return {
      embedUrl: "https://www.openstreetmap.org/export/embed.html?bbox=-10.5%2C27.5%2C-0.5%2C36.5&layer=mapnik",
      externalUrl: `https://www.google.com/maps/search/?api=1&query=${encodedQuery}`,
    };
  }

  const delta = 0.035;
  const left = longitude - delta;
  const right = longitude + delta;
  const top = latitude + delta;
  const bottom = latitude - delta;

  return {
    embedUrl: `https://www.openstreetmap.org/export/embed.html?bbox=${left}%2C${bottom}%2C${right}%2C${top}&layer=mapnik&marker=${latitude}%2C${longitude}`,
    externalUrl: `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=12/${latitude}/${longitude}`,
  };
}

export default function ExperiencePage() {
  const params = useParams();
  const identifier = params?.id as string;
  const { data, isLoading, isError } = useExperienceDetail(identifier);
  const { openBooking, BookingModal } = useBooking();

  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (!data) return;
    captureEvent(ANALYTICS_EVENT.EXPERIENCE_VIEWED, {
      experience_id: data.transformed.id,
      type: data.transformed.type,
    });
  }, [data?.transformed.id, data?.transformed.type]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4">
        <p className="text-center text-lg font-medium text-destructive">Une erreur est survenue</p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Recharger
        </Button>
      </div>
    );
  }

  const experience = data.transformed;
  const { host, trip, lodging } = experience;

  const heroImages = experience.gallery
    .map((item) => item.url)
    .filter((item): item is string => Boolean(item));

  if (experience.thumbnailUrl && !heroImages.includes(experience.thumbnailUrl)) {
    heroImages.unshift(experience.thumbnailUrl);
  }

  const locationLabel = [experience.city, experience.region, experience.country]
    .filter(Boolean)
    .join(", ");

  const latitude = experience.location?.latitude ?? null;
  const longitude = experience.location?.longitude ?? null;
  const mapLinks = buildMapLinks(latitude, longitude, locationLabel || "Morocco");

  const nightsLabel = trip ? "pers." : "nuit";
  const basePrice =
    trip?.price_cents ??
    lodging?.rooms.find((room) => typeof room.price_cents === "number")?.price_cents ??
    null;
  const baseCurrency = trip?.currency ?? lodging?.rooms[0]?.currency ?? "MAD";
  const formattedPrice = formatMoney(basePrice, baseCurrency);
  const nextDeparture = trip?.departures?.[0]?.depart_at;

  const capacity = trip?.group_size_max
    ? trip.group_size_max
    : lodging?.rooms?.length
      ? lodging.rooms.reduce((acc, room) => acc + (room.max_persons || 0), 0)
      : null;

  const description = experience.longDescription || experience.shortDescription;
  const showReadMore = description.length > 280;
  const visibleDescription = showReadMore && !descriptionExpanded ? `${description.slice(0, 280)}...` : description;

  const itineraryByDay = (() => {
    if (!trip?.itinerary?.length) {
      return [] as Array<{ day: number; items: NonNullable<typeof trip>["itinerary"] }>;
    }

    const grouped = new Map<number, typeof trip.itinerary>();
    for (const item of trip?.itinerary ?? []) {
      const day = item.day_number || 1;
      const current = grouped.get(day) ?? [];
      current.push(item);
      grouped.set(day, current);
    }

    return Array.from(grouped.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([day, items]) => ({ day, items }));
  })();

  const hasStayTab = Boolean(lodging);
  const hasRoomsTab = Boolean(lodging?.rooms?.length);
  const hasItineraryTab = Boolean(trip?.itinerary?.length || trip);

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="bg-[#19181b] px-4 py-4 shadow-sm sm:px-8">
        <div className="mx-auto max-w-7xl">
          <MarketingHeader />
        </div>
      </div>

      <div className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => window.history.back()}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={async () => {
                await navigator.clipboard.writeText(window.location.href);
                captureEvent(ANALYTICS_EVENT.EXPERIENCE_SHARED, {
                  experience_id: experience.id,
                  method: "clipboard",
                });
                toast.success("Lien copié");
              }}
            >
              <Share2 className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setIsSaved((previous) => !previous);
                captureEvent(
                  isSaved
                    ? ANALYTICS_EVENT.EXPERIENCE_UNLIKED
                    : ANALYTICS_EVENT.EXPERIENCE_LIKED,
                  { experience_id: experience.id, source: "detail_page" },
                );
                toast.success(isSaved ? "Retiré des favoris" : "Ajouté aux favoris");
              }}
            >
              <Heart className={`h-5 w-5 ${isSaved ? "fill-current text-rose-500" : ""}`} />
            </Button>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="hidden items-center justify-between lg:flex">
          <Button variant="ghost" className="gap-2" onClick={() => window.history.back()}>
            <ChevronLeft className="h-4 w-4" />
            Retour
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="gap-2"
              onClick={async () => {
                await navigator.clipboard.writeText(window.location.href);
                captureEvent(ANALYTICS_EVENT.EXPERIENCE_SHARED, {
                  experience_id: experience.id,
                  method: "clipboard",
                });
                toast.success("Lien copié");
              }}
            >
              <Share2 className="h-4 w-4" />
              Partager
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => {
                setIsSaved((previous) => !previous);
                captureEvent(
                  isSaved
                    ? ANALYTICS_EVENT.EXPERIENCE_UNLIKED
                    : ANALYTICS_EVENT.EXPERIENCE_LIKED,
                  { experience_id: experience.id, source: "detail_page" },
                );
                toast.success(isSaved ? "Retiré des favoris" : "Ajouté aux favoris");
              }}
            >
              <Heart className={`h-4 w-4 ${isSaved ? "fill-current text-rose-500" : ""}`} />
              {isSaved ? "Enregistré" : "Enregistrer"}
            </Button>
          </div>
        </div>

        {/* ── Desktop: 2-column layout (media left, content right) ── */}
        <div className="hidden lg:grid lg:grid-cols-12 lg:gap-10">
          {/* LEFT COLUMN — Video + Photos (sticky) */}
          <div className="lg:col-span-5">
            <div className="sticky top-24 space-y-4">
              <ExperienceGallery images={heroImages} videoUrl={experience.video?.url} />
            </div>
          </div>

          {/* RIGHT COLUMN — All content */}
          <div className="lg:col-span-7 space-y-6">
            {/* Title & Meta */}
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {experience.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="capitalize">
                    {tag}
                  </Badge>
                ))}
              </div>

              <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{experience.title}</h1>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-1 text-foreground">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  <span className="font-semibold">{experience.metrics.rating?.toFixed(1) ?? "Nouveau"}</span>
                  {experience.metrics.reviews > 0 && (
                    <span className="underline underline-offset-2">({experience.metrics.reviews} avis)</span>
                  )}
                </div>
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {locationLabel}
                </span>
              </div>
            </div>

            {/* Host Card */}
            {host ? (
              <div className="rounded-2xl border bg-card p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-14 w-14 border">
                      <AvatarImage src={host.avatarUrl ?? undefined} />
                      <AvatarFallback>{host.name.slice(0, 1)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm text-muted-foreground">Hosted by</p>
                      <p className="text-lg font-semibold">{host.name}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        {host.verified ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700">
                            <ShieldCheck className="h-3.5 w-3.5" />
                            Vérifié
                          </span>
                        ) : null}
                        <span>{host.responseRate ?? "-"}% taux de réponse</span>
                        <span>{host.responseTimeHours ?? "-"}h temps de réponse</span>
                      </div>
                    </div>
                  </div>
                  <Button variant="outline">Contacter l&apos;hôte</Button>
                </div>
              </div>
            ) : null}

            {/* Booking CTA */}
            <Card className="rounded-3xl border-muted/60 shadow-lg shadow-black/5 overflow-hidden">
              <div className="bg-gradient-to-br from-primary/5 via-transparent to-transparent p-6">
                <div className="flex items-center justify-between gap-6">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {trip ? "Prochain départ" : "Tarif à partir de"}
                    </p>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-3xl font-bold tracking-tight text-foreground">{formattedPrice}</span>
                      <span className="text-sm font-medium text-muted-foreground">/ {nightsLabel}</span>
                    </div>
                  </div>
                  <Button 
                    className="h-12 px-8 text-sm font-semibold rounded-2xl shadow-md hover:shadow-lg transition-all" 
                    onClick={() => openBooking(experience)}
                  >
                    Réserver cette expérience
                  </Button>
                </div>
              </div>
            </Card>

            {/* Tabs */}
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-none border-b bg-transparent p-0">
                <TabsTrigger
                  value="overview"
                  className="rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                >
                  Aperçu
                </TabsTrigger>
                {hasItineraryTab ? (
                  <TabsTrigger
                    value="itinerary"
                    className="rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                  >
                    Itinéraire
                  </TabsTrigger>
                ) : null}
                {hasStayTab ? (
                  <TabsTrigger
                    value="stay"
                    className="rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                  >
                    Séjour
                  </TabsTrigger>
                ) : null}
                {hasRoomsTab ? (
                  <TabsTrigger
                    value="rooms"
                    className="rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                  >
                    Chambres
                  </TabsTrigger>
                ) : null}
                <TabsTrigger
                  value="location"
                  className="rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                >
                  Emplacement
                </TabsTrigger>
                {experience.metrics.reviews > 0 ? (
                  <TabsTrigger
                    value="reviews"
                    className="rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                  >
                    Avis
                  </TabsTrigger>
                ) : null}
              </TabsList>

              <TabsContent value="overview" className="mt-5 space-y-6">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <Card className="rounded-2xl border-muted">
                    <CardContent className="flex items-center gap-3 p-4">
                      <Clock3 className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-xs text-muted-foreground">Durée</p>
                        <p className="font-medium">{formatDuration(trip?.duration_days ?? null, trip?.duration_hours ?? null)}</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="rounded-2xl border-muted">
                    <CardContent className="flex items-center gap-3 p-4">
                      <Users className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-xs text-muted-foreground">Capacité max</p>
                        <p className="font-medium">{capacity ?? "Flexible"}</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="rounded-2xl border-muted">
                    <CardContent className="flex items-center gap-3 p-4">
                      <Badge className="h-6 rounded-full px-2 text-xs" variant="secondary">
                        {experience.type}
                      </Badge>
                      <div>
                        <p className="text-xs text-muted-foreground">Type</p>
                        <p className="font-medium capitalize">{experience.type}</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-2">
                  <h2 className="text-xl font-semibold">À propos de cette expérience</h2>
                  <p className="leading-relaxed text-muted-foreground">{visibleDescription}</p>
                  {showReadMore ? (
                    <Button
                      variant="link"
                      className="h-auto p-0 font-semibold"
                      onClick={() => setDescriptionExpanded((state) => !state)}
                    >
                      {descriptionExpanded ? "Voir moins" : "Lire plus"}
                    </Button>
                  ) : null}
                </div>

                <div className="space-y-3">
                  <h3 className="text-lg font-semibold">Équipements</h3>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {experience.amenities.map((amenity) => (
                      <div key={amenity.key} className="flex items-center gap-3 rounded-xl border bg-card p-3">
                        <Check className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">{amenity.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {experience.servicesIncluded.length || experience.servicesExcluded.length ? (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Card className="rounded-2xl">
                      <CardHeader>
                        <CardTitle className="text-base">Ce qui est inclus</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        {experience.servicesIncluded.length ? (
                          experience.servicesIncluded.map((service) => (
                            <p key={service.key} className="flex items-center gap-2">
                              <Check className="h-4 w-4 text-emerald-600" />
                              {service.label}
                            </p>
                          ))
                        ) : (
                          <p className="text-muted-foreground">Aucun détail fourni</p>
                        )}
                      </CardContent>
                    </Card>
                    <Card className="rounded-2xl">
                      <CardHeader>
                        <CardTitle className="text-base">Non inclus</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        {experience.servicesExcluded.length ? (
                          experience.servicesExcluded.map((service) => (
                            <p key={service.key} className="flex items-center gap-2">
                              <Minus className="h-4 w-4 text-amber-600" />
                              {service.label}
                            </p>
                          ))
                        ) : (
                          <p className="text-muted-foreground">Aucun détail fourni</p>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                ) : null}
              </TabsContent>

              <TabsContent value="itinerary" className="mt-5 space-y-4">
                {itineraryByDay.length ? (
                  itineraryByDay.map(({ day, items }) => (
                    <Card key={day} className="rounded-2xl">
                      <CardHeader>
                        <CardTitle className="text-base">Jour {day}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {items.map((item) => (
                          <div key={item.id} className="rounded-xl border bg-muted/20 p-3">
                            <p className="font-medium">{item.title}</p>
                            <p className="mt-1 text-sm text-muted-foreground">{item.details}</p>
                            <p className="mt-2 text-xs text-muted-foreground">{item.location_name ?? "Lieu à confirmer"}</p>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                    Détails d&apos;itinéraire indisponibles pour cette expérience.
                  </div>
                )}
              </TabsContent>

              <TabsContent value="stay" className="mt-5 space-y-4">
                {lodging ? (
                  <>
                    <Card className="rounded-2xl">
                      <CardHeader>
                        <CardTitle className="text-base">Règles de la maison</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm text-muted-foreground">
                        <p className="flex items-center gap-2">
                          {lodging.non_fumeur ? <Check className="h-4 w-4 text-emerald-600" /> : <X className="h-4 w-4 text-rose-600" />}
                          Non-fumeur
                        </p>
                        <p className="flex items-center gap-2">
                          {lodging.animaux_acceptes ? <Check className="h-4 w-4 text-emerald-600" /> : <X className="h-4 w-4 text-rose-600" />}
                          Animaux acceptés
                        </p>
                        <p>
                          <span className="font-medium text-foreground">Séjour minimum:</span>{" "}
                          {lodging.min_stay_nights ?? 1} nuit(s)
                        </p>
                        <p>{lodging.house_rules ?? "Règles supplémentaires à confirmer avec l&apos;hôte."}</p>
                      </CardContent>
                    </Card>

                    <Card className="rounded-2xl">
                      <CardHeader>
                        <CardTitle className="text-base">Horaires et annulation</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm text-muted-foreground">
                        <p>
                          Check-in: <span className="font-medium text-foreground">{lodging.check_in_time ?? "Flexible"}</span>
                        </p>
                        <p>
                          Check-out: <span className="font-medium text-foreground">{lodging.check_out_time ?? "Flexible"}</span>
                        </p>
                        <p>
                          Politique d&apos;annulation: <span className="font-medium capitalize text-foreground">{experience.cancellationPolicy}</span>
                        </p>
                      </CardContent>
                    </Card>
                  </>
                ) : (
                  <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                    Informations de séjour indisponibles.
                  </div>
                )}
              </TabsContent>

              <TabsContent value="rooms" className="mt-5 space-y-4">
                {lodging?.rooms?.length ? (
                  lodging.rooms.map((room) => (
                    <Card key={room.id} className="overflow-hidden rounded-2xl">
                      <div className="grid grid-cols-1 gap-0 lg:grid-cols-2">
                        <div className="bg-muted/30 p-2">
                          {room.photoUrls.length ? (
                            <Carousel opts={{ loop: room.photoUrls.length > 1 }}>
                              <CarouselContent className="ml-0">
                                {room.photoUrls.map((photoUrl, index) => (
                                  <CarouselItem key={`${room.id}-${index}`} className="pl-0">
                                    <div className="relative aspect-[4/3] overflow-hidden rounded-xl">
                                      <Image src={photoUrl} alt={room.name || "Room"} fill className="object-cover" />
                                    </div>
                                  </CarouselItem>
                                ))}
                              </CarouselContent>
                            </Carousel>
                          ) : (
                            <div className="flex aspect-[4/3] items-center justify-center rounded-xl bg-muted">
                              <BedDouble className="h-8 w-8 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="space-y-3 p-4">
                          <h3 className="text-lg font-semibold">{room.name ?? "Chambre"}</h3>
                          <p className="text-sm text-muted-foreground">{room.description ?? "Description non renseignée."}</p>
                          <div className="flex flex-wrap gap-2 text-xs">
                            <Badge variant="secondary" className="gap-1">
                              <Users className="h-3 w-3" />
                              {room.max_persons} pers. max
                            </Badge>
                            <Badge variant="secondary" className="gap-1">
                              <BedDouble className="h-3 w-3" />
                              {room.capacity_beds} lit(s)
                            </Badge>
                          </div>
                          <Separator />
                          <p className="text-lg font-semibold">{formatMoney(room.price_cents, room.currency)} / nuit</p>
                        </div>
                      </div>
                    </Card>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                    Aucune chambre disponible.
                  </div>
                )}
              </TabsContent>

              <TabsContent value="location" className="mt-5 space-y-4">
                <Card className="rounded-2xl">
                  <CardContent className="space-y-4 p-4">
                    <div className="flex items-start gap-2 text-sm text-muted-foreground">
                      <MapPin className="mt-0.5 h-4 w-4 text-primary" />
                      <span>{locationLabel || "Adresse non renseignée"}</span>
                    </div>
                    <div className="overflow-hidden rounded-xl border">
                      <iframe
                        title="Carte de l'expérience"
                        src={mapLinks.embedUrl}
                        className="h-72 w-full"
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                      />
                    </div>
                    <Button asChild variant="outline" className="w-full sm:w-auto">
                      <a href={mapLinks.externalUrl} target="_blank" rel="noreferrer">
                        Ouvrir dans Maps
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              {experience.metrics.reviews > 0 ? (
                <TabsContent
                  value="reviews"
                  className="mt-0 animate-in fade-in pb-8 duration-300 focus-visible:outline-none"
                >
                  <ReviewList experienceId={experience.id} />
                </TabsContent>
              ) : null}
            </Tabs>
          </div>
        </div>

        {/* ── Mobile / Tablet: stacked layout ── */}
        <div className="lg:hidden space-y-6">
          <section className="space-y-4">
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {experience.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="capitalize">
                    {tag}
                  </Badge>
                ))}
              </div>

              <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{experience.title}</h1>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-1 text-foreground">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  <span className="font-semibold">{experience.metrics.rating?.toFixed(1) ?? "Nouveau"}</span>
                  {experience.metrics.reviews > 0 && (
                    <span className="underline underline-offset-2">({experience.metrics.reviews} avis)</span>
                  )}
                </div>
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {locationLabel}
                </span>
              </div>
            </div>

            <ExperienceGallery images={heroImages} videoUrl={experience.video?.url} />
          </section>

          {host ? (
            <div className="rounded-2xl border bg-card p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-4">
                  <Avatar className="h-14 w-14 border">
                    <AvatarImage src={host.avatarUrl ?? undefined} />
                    <AvatarFallback>{host.name.slice(0, 1)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm text-muted-foreground">Hosted by</p>
                    <p className="text-lg font-semibold">{host.name}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {host.verified ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700">
                          <ShieldCheck className="h-3.5 w-3.5" />
                          Vérifié
                        </span>
                      ) : null}
                      <span>{host.responseRate ?? "-"}% taux de réponse</span>
                      <span>{host.responseTimeHours ?? "-"}h temps de réponse</span>
                    </div>
                  </div>
                </div>
                <Button variant="outline">Contacter l&apos;hôte</Button>
              </div>
            </div>
          ) : null}

          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-none border-b bg-transparent p-0">
              <TabsTrigger
                value="overview"
                className="rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
              >
                Aperçu
              </TabsTrigger>
              {hasItineraryTab ? (
                <TabsTrigger
                  value="itinerary"
                  className="rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                >
                  Itinéraire
                </TabsTrigger>
              ) : null}
              {hasStayTab ? (
                <TabsTrigger
                  value="stay"
                  className="rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                >
                  Séjour
                </TabsTrigger>
              ) : null}
              {hasRoomsTab ? (
                <TabsTrigger
                  value="rooms"
                  className="rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                >
                  Chambres
                </TabsTrigger>
              ) : null}
              <TabsTrigger
                value="location"
                className="rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
              >
                Emplacement
              </TabsTrigger>
              {experience.metrics.reviews > 0 ? (
                <TabsTrigger
                  value="reviews"
                  className="rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                >
                  Avis
                </TabsTrigger>
              ) : null}
            </TabsList>

            <TabsContent value="overview" className="mt-5 space-y-6">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Card className="rounded-2xl border-muted">
                  <CardContent className="flex items-center gap-3 p-4">
                    <Clock3 className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-xs text-muted-foreground">Durée</p>
                      <p className="font-medium">{formatDuration(trip?.duration_days ?? null, trip?.duration_hours ?? null)}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="rounded-2xl border-muted">
                  <CardContent className="flex items-center gap-3 p-4">
                    <Users className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-xs text-muted-foreground">Capacité max</p>
                      <p className="font-medium">{capacity ?? "Flexible"}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="rounded-2xl border-muted">
                  <CardContent className="flex items-center gap-3 p-4">
                    <Badge className="h-6 rounded-full px-2 text-xs" variant="secondary">
                      {experience.type}
                    </Badge>
                    <div>
                      <p className="text-xs text-muted-foreground">Type</p>
                      <p className="font-medium capitalize">{experience.type}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-2">
                <h2 className="text-xl font-semibold">À propos de cette expérience</h2>
                <p className="leading-relaxed text-muted-foreground">{visibleDescription}</p>
                {showReadMore ? (
                  <Button
                    variant="link"
                    className="h-auto p-0 font-semibold"
                    onClick={() => setDescriptionExpanded((state) => !state)}
                  >
                    {descriptionExpanded ? "Voir moins" : "Lire plus"}
                  </Button>
                ) : null}
              </div>

              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Équipements</h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {experience.amenities.map((amenity) => (
                    <div key={amenity.key} className="flex items-center gap-3 rounded-xl border bg-card p-3">
                      <Check className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">{amenity.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {experience.servicesIncluded.length || experience.servicesExcluded.length ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Card className="rounded-2xl">
                    <CardHeader>
                      <CardTitle className="text-base">Ce qui est inclus</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      {experience.servicesIncluded.length ? (
                        experience.servicesIncluded.map((service) => (
                          <p key={service.key} className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-emerald-600" />
                            {service.label}
                          </p>
                        ))
                      ) : (
                        <p className="text-muted-foreground">Aucun détail fourni</p>
                      )}
                    </CardContent>
                  </Card>
                  <Card className="rounded-2xl">
                    <CardHeader>
                      <CardTitle className="text-base">Non inclus</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      {experience.servicesExcluded.length ? (
                        experience.servicesExcluded.map((service) => (
                          <p key={service.key} className="flex items-center gap-2">
                            <Minus className="h-4 w-4 text-amber-600" />
                            {service.label}
                          </p>
                        ))
                      ) : (
                        <p className="text-muted-foreground">Aucun détail fourni</p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              ) : null}
            </TabsContent>

            <TabsContent value="itinerary" className="mt-5 space-y-4">
              {itineraryByDay.length ? (
                itineraryByDay.map(({ day, items }) => (
                  <Card key={day} className="rounded-2xl">
                    <CardHeader>
                      <CardTitle className="text-base">Jour {day}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {items.map((item) => (
                        <div key={item.id} className="rounded-xl border bg-muted/20 p-3">
                          <p className="font-medium">{item.title}</p>
                          <p className="mt-1 text-sm text-muted-foreground">{item.details}</p>
                          <p className="mt-2 text-xs text-muted-foreground">{item.location_name ?? "Lieu à confirmer"}</p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                  Détails d&apos;itinéraire indisponibles pour cette expérience.
                </div>
              )}
            </TabsContent>

            <TabsContent value="stay" className="mt-5 space-y-4">
              {lodging ? (
                <>
                  <Card className="rounded-2xl">
                    <CardHeader>
                      <CardTitle className="text-base">Règles de la maison</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm text-muted-foreground">
                      <p className="flex items-center gap-2">
                        {lodging.non_fumeur ? <Check className="h-4 w-4 text-emerald-600" /> : <X className="h-4 w-4 text-rose-600" />}
                        Non-fumeur
                      </p>
                      <p className="flex items-center gap-2">
                        {lodging.animaux_acceptes ? <Check className="h-4 w-4 text-emerald-600" /> : <X className="h-4 w-4 text-rose-600" />}
                        Animaux acceptés
                      </p>
                      <p>
                        <span className="font-medium text-foreground">Séjour minimum:</span>{" "}
                        {lodging.min_stay_nights ?? 1} nuit(s)
                      </p>
                      <p>{lodging.house_rules ?? "Règles supplémentaires à confirmer avec l&apos;hôte."}</p>
                    </CardContent>
                  </Card>

                  <Card className="rounded-2xl">
                    <CardHeader>
                      <CardTitle className="text-base">Horaires et annulation</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm text-muted-foreground">
                      <p>
                        Check-in: <span className="font-medium text-foreground">{lodging.check_in_time ?? "Flexible"}</span>
                      </p>
                      <p>
                        Check-out: <span className="font-medium text-foreground">{lodging.check_out_time ?? "Flexible"}</span>
                      </p>
                      <p>
                        Politique d&apos;annulation: <span className="font-medium capitalize text-foreground">{experience.cancellationPolicy}</span>
                      </p>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                  Informations de séjour indisponibles.
                </div>
              )}
            </TabsContent>

            <TabsContent value="rooms" className="mt-5 space-y-4">
              {lodging?.rooms?.length ? (
                lodging.rooms.map((room) => (
                  <Card key={room.id} className="overflow-hidden rounded-2xl">
                    <div className="grid grid-cols-1 gap-0">
                      <div className="bg-muted/30 p-2">
                        {room.photoUrls.length ? (
                          <Carousel opts={{ loop: room.photoUrls.length > 1 }}>
                            <CarouselContent className="ml-0">
                              {room.photoUrls.map((photoUrl, index) => (
                                <CarouselItem key={`${room.id}-${index}`} className="pl-0">
                                  <div className="relative aspect-[4/3] overflow-hidden rounded-xl">
                                    <Image src={photoUrl} alt={room.name || "Room"} fill className="object-cover" />
                                  </div>
                                </CarouselItem>
                              ))}
                            </CarouselContent>
                          </Carousel>
                        ) : (
                          <div className="flex aspect-[4/3] items-center justify-center rounded-xl bg-muted">
                            <BedDouble className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="space-y-3 p-4">
                        <h3 className="text-lg font-semibold">{room.name ?? "Chambre"}</h3>
                        <p className="text-sm text-muted-foreground">{room.description ?? "Description non renseignée."}</p>
                        <div className="flex flex-wrap gap-2 text-xs">
                          <Badge variant="secondary" className="gap-1">
                            <Users className="h-3 w-3" />
                            {room.max_persons} pers. max
                          </Badge>
                          <Badge variant="secondary" className="gap-1">
                            <BedDouble className="h-3 w-3" />
                            {room.capacity_beds} lit(s)
                          </Badge>
                        </div>
                        <Separator />
                        <p className="text-lg font-semibold">{formatMoney(room.price_cents, room.currency)} / nuit</p>
                      </div>
                    </div>
                  </Card>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                  Aucune chambre disponible.
                </div>
              )}
            </TabsContent>

            <TabsContent value="location" className="mt-5 space-y-4">
              <Card className="rounded-2xl">
                <CardContent className="space-y-4 p-4">
                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <MapPin className="mt-0.5 h-4 w-4 text-primary" />
                    <span>{locationLabel || "Adresse non renseignée"}</span>
                  </div>
                  <div className="overflow-hidden rounded-xl border">
                    <iframe
                      title="Carte de l'expérience"
                      src={mapLinks.embedUrl}
                      className="h-72 w-full"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                  </div>
                  <Button asChild variant="outline" className="w-full sm:w-auto">
                    <a href={mapLinks.externalUrl} target="_blank" rel="noreferrer">
                      Ouvrir dans Maps
                    </a>
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {experience.metrics.reviews > 0 ? (
              <TabsContent
                value="reviews"
                className="mt-0 animate-in fade-in pb-8 duration-300 focus-visible:outline-none"
              >
                <ReviewList experienceId={experience.id} />
              </TabsContent>
            ) : null}
          </Tabs>
        </div>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-50 border-t bg-background/95 p-4 backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase text-muted-foreground">À partir de</p>
            <p className="text-lg font-semibold">{formattedPrice}</p>
          </div>
          <Button className="h-11 rounded-full px-8" onClick={() => openBooking(experience)}>
            Réserver
          </Button>
        </div>
      </div>

      <BookingModal />
    </div>
  );
}
