import {
  BedDouble,
  Check,
  Clock3,
  MapPin,
  Minus,
  ShieldCheck,
  Star,
  Users,
  X,
} from "lucide-react";
import Image from "next/image";
import { ExperienceAnalytics } from "@/components/experience/ExperienceAnalytics";
import { ExperienceBookingSection } from "@/components/experience/ExperienceBookingSection";
import { ExperienceDescription } from "@/components/experience/ExperienceDescription";
import { ExperienceDetailHeader } from "@/components/experience/ExperienceDetailHeader";
import { ExperienceGallery } from "@/components/experience/ExperienceGallery";
import { ReviewList } from "@/components/experience/ReviewList";
import { RoomBookingButton } from "@/components/experience/RoomBookingButton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getLowestPricedRoom } from "@/lib/experience-pricing";
import type { ExperienceDetail } from "@/types/experience-detail";

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

function buildMapLinks(
  latitude: number | null,
  longitude: number | null,
  locationLabel: string,
) {
  if (typeof latitude !== "number" || typeof longitude !== "number") {
    const encodedQuery = encodeURIComponent(locationLabel);
    return {
      embedUrl:
        "https://www.openstreetmap.org/export/embed.html?bbox=-10.5%2C27.5%2C-0.5%2C36.5&layer=mapnik",
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

export function ExperienceDetailView({
  experience,
  url,
}: {
  experience: ExperienceDetail;
  url: string;
}) {
  const { host, trip, lodging } = experience;

  const heroImages = experience.gallery
    .map((item) => item.url)
    .filter((item): item is string => Boolean(item));

  if (
    experience.thumbnailUrl &&
    !heroImages.includes(experience.thumbnailUrl)
  ) {
    heroImages.unshift(experience.thumbnailUrl);
  }

  const locationLabel = [experience.city, experience.region, experience.country]
    .filter(Boolean)
    .join(", ");

  const imageAlts = heroImages.map((_, index) => {
    const total = heroImages.length;
    const photoNumber = index + 1;
    return `Photo ${photoNumber} of ${total} - ${experience.title} in ${locationLabel}`;
  });

  const latitude = experience.location?.latitude ?? null;
  const longitude = experience.location?.longitude ?? null;
  const mapLinks = buildMapLinks(
    latitude,
    longitude,
    locationLabel || "Morocco",
  );

  const nightsLabel = trip ? "pers." : "nuit";
  const lowestPricedRoom = getLowestPricedRoom(lodging?.rooms);
  const basePrice = trip?.price_cents ?? lowestPricedRoom?.price_cents ?? null;
  const baseCurrency = trip?.currency ?? lowestPricedRoom?.currency ?? "MAD";
  const formattedPrice = formatMoney(basePrice, baseCurrency);

  const capacity = trip?.group_size_max
    ? trip.group_size_max
    : lodging?.rooms?.length
      ? lodging.rooms.reduce((acc, room) => acc + (room.max_persons || 0), 0)
      : null;

  const description = experience.longDescription || experience.shortDescription;

  const itineraryByDay = (() => {
    if (!trip?.itinerary?.length) {
      return [] as Array<{
        day: number;
        items: NonNullable<typeof trip>["itinerary"];
      }>;
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

  const allRoomItems = Array.from(
    new Map(
      (lodging?.rooms ?? [])
        .flatMap((room) => room.items)
        .map((item) => [item.key, item]),
    ).values(),
  );
  const allEquipment = [...experience.amenities, ...allRoomItems];

  return (
    <div className="min-h-screen bg-background pb-24">
      <ExperienceAnalytics
        experienceId={experience.id}
        type={experience.type}
      />

      <ExperienceDetailHeader
        title={experience.title}
        url={url}
        description={experience.shortDescription}
        locationLabel={locationLabel}
        previewImageUrl={experience.thumbnailUrl}
        experienceId={experience.id}
      />

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {/* ── Desktop: 2-column layout (media left, content right) ── */}
        <div className="hidden lg:grid lg:grid-cols-12 lg:gap-10">
          {/* LEFT COLUMN — Video + Photos (sticky) */}
          <div className="lg:col-span-5">
            <div className="sticky top-24 space-y-4">
              <ExperienceGallery
                images={heroImages}
                video={experience.video}
                imageAlts={imageAlts}
              />
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

              <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
                {experience.title}
              </h1>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-1 text-foreground">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  <span className="font-semibold">
                    {experience.metrics.rating?.toFixed(1) ?? "Nouveau"}
                  </span>
                  {experience.metrics.reviews > 0 && (
                    <span className="underline underline-offset-2">
                      ({experience.metrics.reviews} avis)
                    </span>
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
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Booking CTA */}
            <ExperienceBookingSection
              experience={experience}
              formattedPrice={formattedPrice}
              nightsLabel={nightsLabel}
            />

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
                        <p className="font-medium">
                          {formatDuration(
                            trip?.duration_days ?? null,
                            trip?.duration_hours ?? null,
                          )}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="rounded-2xl border-muted">
                    <CardContent className="flex items-center gap-3 p-4">
                      <Users className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Capacité max
                        </p>
                        <p className="font-medium">{capacity ?? "Flexible"}</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="rounded-2xl border-muted">
                    <CardContent className="flex items-center gap-3 p-4">
                      <Badge
                        className="h-6 rounded-full px-2 text-xs"
                        variant="secondary"
                      >
                        {experience.type}
                      </Badge>
                      <div>
                        <p className="text-xs text-muted-foreground">Type</p>
                        <p className="font-medium capitalize">
                          {experience.type}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <ExperienceDescription description={description} />

                <div className="space-y-3">
                  <h3 className="text-lg font-semibold">Équipements</h3>
                  {allEquipment.length > 0 ? (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {allEquipment.map((item) => (
                        <div
                          key={item.key}
                          className="flex items-center gap-3 rounded-xl border bg-card p-3"
                        >
                          <Check className="h-4 w-4 text-primary" />
                          <span className="text-sm font-medium">
                            {item.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Aucun équipement renseigné.
                    </p>
                  )}
                </div>

                {experience.servicesIncluded.length ||
                experience.servicesExcluded.length ? (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Card className="rounded-2xl">
                      <CardHeader>
                        <CardTitle className="text-base">
                          Ce qui est inclus
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        {experience.servicesIncluded.length ? (
                          experience.servicesIncluded.map((service) => (
                            <p
                              key={service.key}
                              className="flex items-center gap-2"
                            >
                              <Check className="h-4 w-4 text-emerald-600" />
                              {service.label}
                            </p>
                          ))
                        ) : (
                          <p className="text-muted-foreground">
                            Aucun détail fourni
                          </p>
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
                            <p
                              key={service.key}
                              className="flex items-center gap-2"
                            >
                              <Minus className="h-4 w-4 text-amber-600" />
                              {service.label}
                            </p>
                          ))
                        ) : (
                          <p className="text-muted-foreground">
                            Aucun détail fourni
                          </p>
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
                          <div
                            key={item.id}
                            className="rounded-xl border bg-muted/20 p-3"
                          >
                            <p className="font-medium">{item.title}</p>
                            <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">
                              {item.details}
                            </p>
                            <p className="mt-2 text-xs text-muted-foreground">
                              {item.location_name ?? "Lieu à confirmer"}
                            </p>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                    Détails d&apos;itinéraire indisponibles pour cette
                    expérience.
                  </div>
                )}
              </TabsContent>

              <TabsContent value="stay" className="mt-5 space-y-4">
                {lodging ? (
                  <>
                    <Card className="rounded-2xl">
                      <CardHeader>
                        <CardTitle className="text-base">
                          Règles de la maison
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm text-muted-foreground">
                        <p className="flex items-center gap-2">
                          {lodging.non_fumeur ? (
                            <Check className="h-4 w-4 text-emerald-600" />
                          ) : (
                            <X className="h-4 w-4 text-rose-600" />
                          )}
                          Non-fumeur
                        </p>
                        <p className="flex items-center gap-2">
                          {lodging.animaux_acceptes ? (
                            <Check className="h-4 w-4 text-emerald-600" />
                          ) : (
                            <X className="h-4 w-4 text-rose-600" />
                          )}
                          Animaux acceptés
                        </p>
                        <p>
                          <span className="font-medium text-foreground">
                            Séjour minimum:
                          </span>{" "}
                          {lodging.min_stay_nights ?? 1} nuit(s)
                        </p>
                        <p className="whitespace-pre-wrap">
                          {lodging.house_rules ??
                            "Règles supplémentaires à confirmer avec l&apos;hôte."}
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="rounded-2xl">
                      <CardHeader>
                        <CardTitle className="text-base">
                          Horaires et annulation
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm text-muted-foreground">
                        <p>
                          Check-in:{" "}
                          <span className="font-medium text-foreground">
                            {lodging.check_in_time ?? "Flexible"}
                          </span>
                        </p>
                        <p>
                          Check-out:{" "}
                          <span className="font-medium text-foreground">
                            {lodging.check_out_time ?? "Flexible"}
                          </span>
                        </p>
                        <p>
                          Politique d&apos;annulation:{" "}
                          <span className="font-medium capitalize text-foreground">
                            {experience.cancellationPolicy}
                          </span>
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
                            <Carousel
                              opts={{ loop: room.photoUrls.length > 1 }}
                            >
                              <CarouselContent className="ml-0">
                                {room.photoUrls.map((photoUrl, index) => (
                                  <CarouselItem
                                    key={`${room.id}-${index}`}
                                    className="pl-0"
                                  >
                                    <div className="relative aspect-[4/3] overflow-hidden rounded-xl">
                                      <Image
                                        src={photoUrl}
                                        alt={room.name || "Room"}
                                        fill
                                        className="object-cover"
                                      />
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
                          <h3 className="text-lg font-semibold">
                            {room.name ?? "Chambre"}
                          </h3>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                            {room.description ?? "Description non renseignée."}
                          </p>
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
                          {room.items.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {room.items.map((equip) => (
                                <Badge
                                  key={equip.key}
                                  variant="outline"
                                  className="text-xs"
                                >
                                  {equip.label}
                                </Badge>
                              ))}
                            </div>
                          )}
                          <Separator />
                          <div className="flex items-center justify-between">
                            <p className="text-lg font-semibold">
                              {formatMoney(room.price_cents, room.currency)} /
                              nuit
                            </p>
                            <RoomBookingButton
                              experience={experience}
                              roomId={room.id}
                            />
                          </div>
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
                    <Button
                      asChild
                      variant="outline"
                      className="w-full sm:w-auto"
                    >
                      <a
                        href={mapLinks.externalUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
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

              <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
                {experience.title}
              </h1>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-1 text-foreground">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  <span className="font-semibold">
                    {experience.metrics.rating?.toFixed(1) ?? "Nouveau"}
                  </span>
                  {experience.metrics.reviews > 0 && (
                    <span className="underline underline-offset-2">
                      ({experience.metrics.reviews} avis)
                    </span>
                  )}
                </div>
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {locationLabel}
                </span>
              </div>
            </div>

            <ExperienceGallery images={heroImages} video={experience.video} />
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
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {/* Booking CTA for Mobile */}
          <ExperienceBookingSection
            experience={experience}
            formattedPrice={formattedPrice}
            nightsLabel={nightsLabel}
          />

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
                      <p className="font-medium">
                        {formatDuration(
                          trip?.duration_days ?? null,
                          trip?.duration_hours ?? null,
                        )}
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="rounded-2xl border-muted">
                  <CardContent className="flex items-center gap-3 p-4">
                    <Users className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Capacité max
                      </p>
                      <p className="font-medium">{capacity ?? "Flexible"}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="rounded-2xl border-muted">
                  <CardContent className="flex items-center gap-3 p-4">
                    <Badge
                      className="h-6 rounded-full px-2 text-xs"
                      variant="secondary"
                    >
                      {experience.type}
                    </Badge>
                    <div>
                      <p className="text-xs text-muted-foreground">Type</p>
                      <p className="font-medium capitalize">
                        {experience.type}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <ExperienceDescription description={description} />

              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Équipements</h3>
                {allEquipment.length > 0 ? (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {allEquipment.map((item) => (
                      <div
                        key={item.key}
                        className="flex items-center gap-3 rounded-xl border bg-card p-3"
                      >
                        <Check className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">
                          {item.label}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Aucun équipement renseigné.
                  </p>
                )}
              </div>

              {experience.servicesIncluded.length ||
              experience.servicesExcluded.length ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Card className="rounded-2xl">
                    <CardHeader>
                      <CardTitle className="text-base">
                        Ce qui est inclus
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      {experience.servicesIncluded.length ? (
                        experience.servicesIncluded.map((service) => (
                          <p
                            key={service.key}
                            className="flex items-center gap-2"
                          >
                            <Check className="h-4 w-4 text-emerald-600" />
                            {service.label}
                          </p>
                        ))
                      ) : (
                        <p className="text-muted-foreground">
                          Aucun détail fourni
                        </p>
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
                          <p
                            key={service.key}
                            className="flex items-center gap-2"
                          >
                            <Minus className="h-4 w-4 text-amber-600" />
                            {service.label}
                          </p>
                        ))
                      ) : (
                        <p className="text-muted-foreground">
                          Aucun détail fourni
                        </p>
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
                        <div
                          key={item.id}
                          className="rounded-xl border bg-muted/20 p-3"
                        >
                          <p className="font-medium">{item.title}</p>
                          <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">
                            {item.details}
                          </p>
                          <p className="mt-2 text-xs text-muted-foreground">
                            {item.location_name ?? "Lieu à confirmer"}
                          </p>
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
                      <CardTitle className="text-base">
                        Règles de la maison
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm text-muted-foreground">
                      <p className="flex items-center gap-2">
                        {lodging.non_fumeur ? (
                          <Check className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <X className="h-4 w-4 text-rose-600" />
                        )}
                        Non-fumeur
                      </p>
                      <p className="flex items-center gap-2">
                        {lodging.animaux_acceptes ? (
                          <Check className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <X className="h-4 w-4 text-rose-600" />
                        )}
                        Animaux acceptés
                      </p>
                      <p>
                        <span className="font-medium text-foreground">
                          Séjour minimum:
                        </span>{" "}
                        {lodging.min_stay_nights ?? 1} nuit(s)
                      </p>
                      <p className="whitespace-pre-wrap">
                        {lodging.house_rules ??
                          "Règles supplémentaires à confirmer avec l&apos;hôte."}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="rounded-2xl">
                    <CardHeader>
                      <CardTitle className="text-base">
                        Horaires et annulation
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm text-muted-foreground">
                      <p>
                        Check-in:{" "}
                        <span className="font-medium text-foreground">
                          {lodging.check_in_time ?? "Flexible"}
                        </span>
                      </p>
                      <p>
                        Check-out:{" "}
                        <span className="font-medium text-foreground">
                          {lodging.check_out_time ?? "Flexible"}
                        </span>
                      </p>
                      <p>
                        Politique d&apos;annulation:{" "}
                        <span className="font-medium capitalize text-foreground">
                          {experience.cancellationPolicy}
                        </span>
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
                                <CarouselItem
                                  key={`${room.id}-${index}`}
                                  className="pl-0"
                                >
                                  <div className="relative aspect-[4/3] overflow-hidden rounded-xl">
                                    <Image
                                      src={photoUrl}
                                      alt={room.name || "Room"}
                                      fill
                                      className="object-cover"
                                    />
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
                        <h3 className="text-lg font-semibold">
                          {room.name ?? "Chambre"}
                        </h3>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {room.description ?? "Description non renseignée."}
                        </p>
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
                        <div className="flex items-center justify-between">
                          <p className="text-lg font-semibold">
                            {formatMoney(room.price_cents, room.currency)} /
                            nuit
                          </p>
                          <RoomBookingButton
                            experience={experience}
                            roomId={room.id}
                          />
                        </div>
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
                  <Button
                    asChild
                    variant="outline"
                    className="w-full sm:w-auto"
                  >
                    <a
                      href={mapLinks.externalUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
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
    </div>
  );
}
