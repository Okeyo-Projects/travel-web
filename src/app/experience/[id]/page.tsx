"use client";

import {
  Bath,
  BedDouble,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Heart,
  Home,
  Info,
  MapPin,
  Mountain,
  Share2,
  ShieldCheck,
  Star,
  Users,
  Utensils,
  Wifi,
  X,
} from "lucide-react";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ExperienceGallery } from "@/components/experience/ExperienceGallery";
import { MarketingHeader } from "@/components/site/MarketingHeader";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBooking } from "@/hooks/use-booking";
import { useExperienceDetail } from "@/hooks/use-experience-detail";
import { cn } from "@/lib/utils";
import type { ExperienceAmenity, ExperienceRoom } from "@/types/experience-detail";

const currencyFormatter = (currency: string) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency });

const amenityIcons = [
  { matcher: /wifi|internet|network/i, icon: Wifi },
  { matcher: /kitchen|food|meal|restaurant/i, icon: Utensils },
  { matcher: /bath|toilet|shower|spa/i, icon: Bath },
  { matcher: /bed|sleep|room/i, icon: BedDouble },
  { matcher: /view|mountain|hiking|outdoor/i, icon: Mountain },
  { matcher: /house|home|stay|lodging/i, icon: Home },
];

function getAmenityIcon(amenity: ExperienceAmenity) {
  const source = `${amenity.key} ${amenity.category} ${amenity.label}`;
  const match = amenityIcons.find((entry) => entry.matcher.test(source));
  return match?.icon ?? Check;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function getMapQuery(
  city: string,
  region: string | null,
  country: string | null,
  address: Record<string, unknown> | null,
) {
  const lat =
    asNumber(address?.lat) ??
    asNumber(address?.latitude) ??
    asNumber(address?.location_lat);
  const lng =
    asNumber(address?.lng) ??
    asNumber(address?.longitude) ??
    asNumber(address?.location_lng);
  if (lat != null && lng != null) {
    return `${lat},${lng}`;
  }
  return [city, region, country].filter(Boolean).join(", ");
}

function RoomImageCarousel({ room }: { room: ExperienceRoom }) {
  const [index, setIndex] = useState(0);
  const photos = room.photoUrls.length ? room.photoUrls : [];
  const hasPhotos = photos.length > 0;
  const currentImage = hasPhotos ? photos[index % photos.length] : null;

  return (
    <article className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div className="relative h-56 bg-muted">
        {currentImage ? (
          <Image
            src={currentImage}
            alt={room.name || "Room image"}
            fill
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <BedDouble className="h-9 w-9" />
          </div>
        )}

        {photos.length > 1 ? (
          <>
            <button
              type="button"
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full border bg-background/90 p-1.5"
              onClick={() => setIndex((prev) => (prev - 1 + photos.length) % photos.length)}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full border bg-background/90 p-1.5"
              onClick={() => setIndex((prev) => (prev + 1) % photos.length)}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        ) : null}
      </div>

      <div className="space-y-3 p-4">
        <h3 className="text-lg font-semibold">{room.name || "Room type"}</h3>
        {room.description ? (
          <p className="line-clamp-2 text-sm text-muted-foreground">{room.description}</p>
        ) : null}
        <div className="flex flex-wrap gap-2 text-xs">
          <Badge variant="outline">{room.max_persons} guests max</Badge>
          <Badge variant="outline">{room.capacity_beds} beds</Badge>
          <Badge variant="outline">{room.total_rooms} rooms total</Badge>
        </div>
        <p className="text-base font-semibold">
          {currencyFormatter(room.currency).format(room.price_cents / 100)}
          <span className="ml-1 text-sm font-normal text-muted-foreground">/ night</span>
        </p>
      </div>
    </article>
  );
}

export default function ExperiencePage() {
  const params = useParams();
  const identifier = params?.id as string;
  const { data, isLoading, isError } = useExperienceDetail(identifier);
  const { openBooking, BookingModal } = useBooking();
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-lg font-medium text-destructive">Failed to load this experience.</p>
        <Button onClick={() => window.location.reload()} variant="outline">
          Retry
        </Button>
      </div>
    );
  }

  const experience = data.transformed;
  const hasRooms = Boolean(experience.lodging?.rooms.length);
  const hasTrip = Boolean(experience.trip);
  const hasStay = Boolean(experience.lodging);
  const locationLabel = [experience.city, experience.region, experience.country]
    .filter(Boolean)
    .join(", ");
  const mapQuery = getMapQuery(
    experience.city,
    experience.region,
    experience.country,
    experience.address,
  );
  const mapUrl = `https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&z=12&output=embed`;
  const totalGuests = hasRooms
    ? experience.lodging?.rooms.reduce((acc, room) => acc + room.max_persons, 0)
    : experience.trip?.group_size_max ?? 1;
  const priceLabel = hasTrip
    ? currencyFormatter(experience.trip?.price_currency || "MAD").format(
        experience.trip?.price_per_person || 0,
      )
    : hasRooms && experience.lodging?.rooms[0]
      ? currencyFormatter(experience.lodging.rooms[0].currency).format(
          experience.lodging.rooms[0].price_cents / 100,
        )
      : "On request";
  const tabs = [
    { id: "overview", label: "Overview", visible: true },
    { id: "itinerary", label: "Itinerary", visible: hasTrip },
    { id: "stay", label: "Stay", visible: hasStay },
    { id: "rooms", label: "Rooms", visible: hasRooms },
    { id: "location", label: "Location", visible: true },
    { id: "reviews", label: "Reviews", visible: true },
  ].filter((tab) => tab.visible);
  const galleryImages = useMemo(() => {
    const mediaImages = experience.gallery
      .map((media) => media.url)
      .filter((url): url is string => Boolean(url));
    if (
      experience.thumbnailUrl &&
      !mediaImages.some((image) => image === experience.thumbnailUrl)
    ) {
      mediaImages.unshift(experience.thumbnailUrl);
    }
    return mediaImages;
  }, [experience.gallery, experience.thumbnailUrl]);

  const description = experience.longDescription || experience.shortDescription;
  const shortDescription =
    description.length > 300 && !descriptionExpanded
      ? `${description.slice(0, 300).trim()}...`
      : description;

  const onShare = async () => {
    const shareUrl = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: experience.title, url: shareUrl });
        return;
      } catch {
        // fall through to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link copied to clipboard");
    } catch {
      toast.error("Unable to copy link");
    }
  };

  return (
    <div className="min-h-screen bg-background pb-28">
      <div className="bg-[#1a1a1a] px-5 py-4 shadow-sm sm:px-8">
        <div className="mx-auto max-w-[1280px]">
          <MarketingHeader />
        </div>
      </div>

      <div className="sticky top-0 z-40 border-b bg-background/90 px-4 py-2 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => window.history.back()}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={onShare}>
              <Share2 className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSaved((prev) => !prev)}
              className={cn(saved && "text-rose-600")}
            >
              <Heart className={cn("h-5 w-5", saved && "fill-current")} />
            </Button>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 py-6 md:px-6 lg:px-8">
        <div className="mb-4 hidden items-center justify-between lg:flex">
          <Button variant="ghost" className="gap-1" onClick={() => window.history.back()}>
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="gap-2" onClick={onShare}>
              <Share2 className="h-4 w-4" />
              Share
            </Button>
            <Button
              variant="outline"
              className={cn("gap-2", saved && "text-rose-600")}
              onClick={() => setSaved((prev) => !prev)}
            >
              <Heart className={cn("h-4 w-4", saved && "fill-current")} />
              {saved ? "Saved" : "Save"}
            </Button>
          </div>
        </div>

        <header className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {experience.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="capitalize">
                {tag}
              </Badge>
            ))}
          </div>
          <h1 className="text-3xl font-bold tracking-tight lg:text-4xl">{experience.title}</h1>
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span className="inline-flex items-center gap-1 font-semibold">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              {experience.metrics.rating?.toFixed(1) || "New"}
            </span>
            <span className="text-muted-foreground underline">
              {experience.metrics.reviews} reviews
            </span>
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              {locationLabel}
            </span>
          </div>
          {experience.host ? (
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border p-4">
              <Avatar className="h-12 w-12">
                <AvatarImage src={experience.host.avatarUrl || undefined} />
                <AvatarFallback>{experience.host.name.slice(0, 1).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="space-y-0.5">
                <p className="font-medium">Hosted by {experience.host.name}</p>
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  {experience.host.verified ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-700">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Verified host
                    </span>
                  ) : null}
                  <span>Response rate {experience.host.responseRate ?? "--"}%</span>
                  <span>Response time {experience.host.responseTimeHours ?? "--"}h</span>
                </div>
              </div>
            </div>
          ) : null}
        </header>

        <div className="mt-6 grid grid-cols-1 gap-8 xl:grid-cols-12">
          <section className="space-y-6 xl:col-span-8">
            <ExperienceGallery images={galleryImages} videoUrl={experience.video?.url} />

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="h-auto w-full flex-wrap justify-start gap-1 rounded-xl bg-muted/40 p-1">
                {tabs.map((tab) => (
                  <TabsTrigger key={tab.id} value={tab.id} className="rounded-lg">
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value="overview" className="space-y-6 pt-5">
                <div className="grid gap-3 sm:grid-cols-3">
                  <Card>
                    <CardContent className="flex items-center gap-3 p-4">
                      <CalendarDays className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-xs text-muted-foreground">Type</p>
                        <p className="font-medium capitalize">{experience.type}</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="flex items-center gap-3 p-4">
                      <Users className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-xs text-muted-foreground">Guests</p>
                        <p className="font-medium">Up to {totalGuests}</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="flex items-center gap-3 p-4">
                      <Clock3 className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-xs text-muted-foreground">Duration</p>
                        <p className="font-medium">
                          {experience.trip?.duration_days
                            ? `${experience.trip.duration_days} day(s)`
                            : experience.trip?.duration_hours
                              ? `${experience.trip.duration_hours} hour(s)`
                              : "Flexible"}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <section className="space-y-3">
                  <h2 className="text-xl font-semibold">About this experience</h2>
                  <p className="leading-7 text-muted-foreground">{shortDescription}</p>
                  {description.length > 300 ? (
                    <Button
                      variant="link"
                      className="h-auto p-0"
                      onClick={() => setDescriptionExpanded((prev) => !prev)}
                    >
                      {descriptionExpanded ? "Read less" : "Read more"}
                    </Button>
                  ) : null}
                </section>

                {experience.amenities.length ? (
                  <section className="space-y-3">
                    <h2 className="text-xl font-semibold">Amenities</h2>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {experience.amenities.map((amenity) => {
                        const Icon = getAmenityIcon(amenity);
                        return (
                          <div
                            key={amenity.key}
                            className="flex items-center gap-3 rounded-xl border px-3 py-2"
                          >
                            <Icon className="h-4 w-4 text-primary" />
                            <span className="text-sm">{amenity.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                ) : null}

                {(experience.servicesIncluded.length || experience.servicesExcluded.length) && (
                  <section className="grid gap-4 md:grid-cols-2">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">What is included</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        {experience.servicesIncluded.length ? (
                          experience.servicesIncluded.map((service) => (
                            <p key={service.key} className="inline-flex items-center gap-2">
                              <Check className="h-3.5 w-3.5 text-emerald-600" />
                              {service.label}
                            </p>
                          ))
                        ) : (
                          <p className="text-muted-foreground">No specific inclusions listed.</p>
                        )}
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">What is not included</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        {experience.servicesExcluded.length ? (
                          experience.servicesExcluded.map((service) => (
                            <p key={service.key} className="inline-flex items-center gap-2">
                              <X className="h-3.5 w-3.5 text-rose-600" />
                              {service.label}
                            </p>
                          ))
                        ) : (
                          <p className="text-muted-foreground">No exclusions listed.</p>
                        )}
                      </CardContent>
                    </Card>
                  </section>
                )}
              </TabsContent>

              <TabsContent value="itinerary" className="space-y-4 pt-5">
                {experience.trip?.itinerary.length ? (
                  experience.trip.itinerary.map((item, idx) => (
                    <Card key={item.id}>
                      <CardHeader>
                        <CardTitle className="text-base">
                          Day {item.day_number ?? idx + 1}: {item.title}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm text-muted-foreground">
                        <p>{item.details}</p>
                        {item.location_name ? (
                          <p className="inline-flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            {item.location_name}
                          </p>
                        ) : null}
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <p className="text-muted-foreground">No itinerary published yet.</p>
                )}
              </TabsContent>

              <TabsContent value="stay" className="space-y-4 pt-5">
                {experience.lodging ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">House rules</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <p>{experience.lodging.house_rules || "Please respect the property and neighbors."}</p>
                        <p>Smoking: {experience.lodging.non_fumeur ? "Not allowed" : "Allowed"}</p>
                        <p>Pets: {experience.lodging.animaux_acceptes ? "Allowed" : "Not allowed"}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Stay policies</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <p>Check-in: {experience.lodging.check_in_time || "Flexible"}</p>
                        <p>Check-out: {experience.lodging.check_out_time || "Flexible"}</p>
                        <p>Minimum stay: {experience.lodging.min_stay_nights || 1} night(s)</p>
                        <p className="capitalize">Cancellation: {experience.cancellationPolicy}</p>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <p className="text-muted-foreground">Stay details are unavailable for this experience.</p>
                )}
              </TabsContent>

              <TabsContent value="rooms" className="space-y-4 pt-5">
                {experience.lodging?.rooms.length ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    {experience.lodging.rooms.map((room) => (
                      <RoomImageCarousel room={room} key={room.id} />
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No rooms configured yet.</p>
                )}
              </TabsContent>

              <TabsContent value="location" className="space-y-4 pt-5">
                <div className="rounded-2xl border">
                  <iframe
                    src={mapUrl}
                    className="h-[320px] w-full rounded-2xl"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title="Experience map"
                  />
                </div>
                <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  {locationLabel}
                </p>
              </TabsContent>

              <TabsContent value="reviews" className="pt-5">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Guest feedback</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-muted-foreground">
                    <p>
                      Reviews integration is in progress. Current rating:{" "}
                      {experience.metrics.rating?.toFixed(1) || "New"} ({experience.metrics.reviews}{" "}
                      reviews)
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {experience.host ? (
              <section className="rounded-2xl border p-6">
                <h2 className="mb-4 text-xl font-semibold">Meet your host</h2>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-14 w-14">
                      <AvatarImage src={experience.host.avatarUrl || undefined} />
                      <AvatarFallback>{experience.host.name.slice(0, 1).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{experience.host.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {experience.host.city || "Local host"}
                        {experience.host.country ? `, ${experience.host.country}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm">
                    <p>{experience.host.totalExperiences || 0} experiences</p>
                    <p>{experience.host.totalBookings || 0} bookings</p>
                    <p>{experience.host.avgRating?.toFixed(1) || "New"} host rating</p>
                  </div>
                </div>
                {experience.host.bio ? (
                  <>
                    <Separator className="my-4" />
                    <p className="text-sm leading-7 text-muted-foreground">{experience.host.bio}</p>
                  </>
                ) : null}
                <Button className="mt-4" variant="outline">
                  Contact host
                </Button>
              </section>
            ) : null}
          </section>

          <aside className="hidden xl:col-span-4 xl:block">
            <div className="sticky top-24">
              <Card className="rounded-2xl border shadow-md">
                <CardHeader className="space-y-2">
                  <CardTitle className="text-2xl">
                    {priceLabel}
                    <span className="ml-1 text-sm font-normal text-muted-foreground">
                      / {hasTrip ? "person" : "night"}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <label className="rounded-xl border p-2 text-xs">
                      Check in
                      <input type="date" className="mt-1 block w-full bg-transparent text-sm outline-none" />
                    </label>
                    <label className="rounded-xl border p-2 text-xs">
                      Check out
                      <input type="date" className="mt-1 block w-full bg-transparent text-sm outline-none" />
                    </label>
                  </div>
                  <label className="block rounded-xl border p-2 text-xs">
                    Guests
                    <select className="mt-1 block w-full bg-transparent text-sm outline-none">
                      {Array.from({ length: Math.max(totalGuests, 1) }, (_, i) => i + 1).map(
                        (count) => (
                          <option key={count} value={count}>
                            {count} guest{count > 1 ? "s" : ""}
                          </option>
                        ),
                      )}
                    </select>
                  </label>
                  <Button className="w-full" size="lg" onClick={() => openBooking(experience)}>
                    Reserve
                  </Button>
                  <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Info className="h-3.5 w-3.5" />
                    You will not be charged yet.
                  </p>
                </CardContent>
              </Card>
            </div>
          </aside>
        </div>
      </main>

      <div className="fixed bottom-16 left-0 right-0 z-50 border-t bg-background/95 px-4 py-3 backdrop-blur sm:bottom-0 xl:hidden">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground">From</p>
            <p className="text-lg font-semibold">{priceLabel}</p>
          </div>
          <Button size="lg" className="rounded-full px-8" onClick={() => openBooking(experience)}>
            Reserve
          </Button>
        </div>
      </div>

      <BookingModal />
    </div>
  );
}
