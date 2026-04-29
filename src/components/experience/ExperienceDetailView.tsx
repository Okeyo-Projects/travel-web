import { ExperienceAnalytics } from "@/components/experience/ExperienceAnalytics";
import { ExperienceBookingSection } from "@/components/experience/ExperienceBookingSection";
import { ExperienceDetailHeader } from "@/components/experience/ExperienceDetailHeader";
import { ExperienceGallery } from "@/components/experience/ExperienceGallery";
import { RoomBookingButton } from "@/components/experience/RoomBookingButton";
import { RoomGallery } from "@/components/experience/RoomGallery";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getLowestPricedRoom } from "@/lib/experience-pricing";
import { getLocalizedDescription, type Translator } from "@/lib/i18n";
import type { ExperienceDetail } from "@/types/experience-detail";
import {
  Check,
  Clock3,
  BedDouble,
  MapPin,
  Minus,
  ShieldCheck,
  Star,
  Users,
  X,
} from "lucide-react";

function formatMoney(
  cents: number | null | undefined,
  currency = "MAD",
  t: Translator,
) {
  if (typeof cents !== "number") {
    return t("experienceDetails.info.onRequest");
  }

  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function formatDuration(
  days: number | null,
  hours: number | null,
  t: Translator,
) {
  if (days && days > 0) {
    return `${days} ${days > 1 ? t("experienceDetails.info.nights") : t("experienceDetails.info.night")}`;
  }
  if (hours && hours > 0) {
    return `${hours} ${t("experienceDetails.info.hours")}`;
  }
  return t("experienceDetails.info.flexible");
}

type Language = "en" | "fr" | "ar";

export function ExperienceDetailView({
  experience,
  url,
  t,
  locale = "fr",
}: {
  experience: ExperienceDetail;
  url: string;
  t: Translator;
  locale?: Language;
}) {
  const { host, trip, lodging } = experience;
  const language = locale;

  const shortDesc = getLocalizedDescription(experience, language, "short");
  const longDesc = getLocalizedDescription(experience, language, "long");

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
    return t("experienceDetails.info.photoOf", { number: photoNumber, total });
  });

  const nightsLabel = trip
    ? t("experienceDetails.info.perPerson")
    : t("experienceDetails.info.night");
  const lowestPricedRoom = getLowestPricedRoom(lodging?.rooms);
  const basePrice = trip?.price_cents ?? lowestPricedRoom?.price_cents ?? null;
  const baseCurrency = trip?.currency ?? lowestPricedRoom?.currency ?? "MAD";
  const formattedPrice = formatMoney(basePrice, baseCurrency, t);

  const capacity = trip?.group_size_max
    ? trip.group_size_max
    : lodging?.rooms?.length
      ? lodging.rooms.reduce((acc, room) => acc + (room.max_persons || 0), 0)
      : null;

  const hasRoomsTab = Boolean(lodging?.rooms?.length);

  const allRoomItems = Array.from(
    new Map(
      (lodging?.rooms ?? [])
        .flatMap((room) => room.items)
        .map((item) => [item.key, item]),
    ).values(),
  );
  const allEquipment = [...experience.amenities, ...allRoomItems];

  /* ── Shared section components ────────────────────────────────── */

  const InfoCard = () => (
    <Card className="rounded-2xl border-muted">
      <CardContent className="divide-y p-0">
        <div className="flex items-center gap-3 p-4">
          <Clock3 className="h-5 w-5 shrink-0 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">
              {t("experienceDetails.info.duration")}
            </p>
            <p className="font-medium">
              {formatDuration(
                trip?.duration_days ?? null,
                trip?.duration_hours ?? null,
                t,
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-4">
          <Users className="h-5 w-5 shrink-0 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">
              {t("experienceDetails.info.maxCapacity")}
            </p>
            <p className="font-medium">
              {capacity ?? t("experienceDetails.info.flexible")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-4">
          <div>
            <p className="text-xs text-muted-foreground">
              {t("experienceDetails.typeLabel")}
            </p>
            <p className="font-medium capitalize">{t(`experienceDetails.type.${experience.type}`)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const StayContent = () =>
    lodging ? (
      <div className="space-y-4">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">
              {t("experienceDetails.info.scheduleAndCancellation")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              {t("experienceDetails.info.checkIn")}:{" "}
              <span className="font-medium text-foreground">
                {lodging.check_in_time ?? t("experienceDetails.info.flexible")}
              </span>
            </p>
            <p>
              {t("experienceDetails.info.checkOut")}:{" "}
              <span className="font-medium text-foreground">
                {lodging.check_out_time ??
                  t("experienceDetails.info.flexible")}
              </span>
            </p>
            <p>
              {t("experienceDetails.info.cancellationPolicy")}:{" "}
              <span className="font-medium capitalize text-foreground">
                {t(
                  `experienceDetails.info.cancellationPolicies.${experience.cancellationPolicy}`,
                )}
              </span>
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">
              {t("experienceDetails.info.houseRules")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p className="flex items-center gap-2">
              {lodging.non_fumeur ? (
                <Check className="h-4 w-4 text-emerald-600" />
              ) : (
                <X className="h-4 w-4 text-rose-600" />
              )}
              {t("experienceDetails.info.nonSmoking")}
            </p>
            <p className="flex items-center gap-2">
              {lodging.animaux_acceptes ? (
                <Check className="h-4 w-4 text-emerald-600" />
              ) : (
                <X className="h-4 w-4 text-rose-600" />
              )}
              {t("experienceDetails.info.petsAllowed")}
            </p>
            <p>
              <span className="font-medium text-foreground">
                {t("experienceDetails.info.minStay")}:
              </span>{" "}
              {lodging.min_stay_nights ?? 1}{" "}
              {t("experienceDetails.info.nights")}
            </p>
            {lodging.house_rules && (
              <p className="whitespace-pre-wrap">{lodging.house_rules}</p>
            )}
          </CardContent>
        </Card>
      </div>
    ) : null;

  const EquipmentSection = () => (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">
        {t("experienceDetails.info.amenities")}
      </h2>
      {allEquipment.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {allEquipment.map((item) => (
            <div
              key={item.key}
              className="flex items-center gap-3 rounded-xl border bg-card p-3"
            >
              <Check className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">{item.label}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          {t("experienceDetails.info.noAmenities")}
        </p>
      )}
    </div>
  );

  const ServicesSection = () =>
    experience.servicesIncluded.length || experience.servicesExcluded.length ? (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">
              {t("experienceDetails.info.includedServices")}
            </CardTitle>
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
              <p className="text-muted-foreground">
                {t("experienceDetails.info.noDetails")}
              </p>
            )}
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">
              {t("experienceDetails.servicesExcluded")}
            </CardTitle>
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
              <p className="text-muted-foreground">
                {t("experienceDetails.info.noDetails")}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    ) : null;

  const RoomsContent = () =>
    lodging?.rooms?.length ? (
      <div className="space-y-4">
        {lodging.rooms.map((room) => (
          <Card key={room.id} className="overflow-hidden rounded-2xl">
            <div className="grid grid-cols-1 gap-0 lg:grid-cols-2">
              <div className="bg-muted/30 p-2">
                <RoomGallery photoUrls={room.photoUrls} name={room.name} fallbackUrl={experience.thumbnailUrl} />
              </div>
              <div className="space-y-3 p-4">
                <h2 className="text-lg font-semibold">
                  {room.name ?? t("experienceDetails.info.noDetails")}
                </h2>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {room.description ?? t("experienceDetails.info.noDetails")}
                </p>
                <div className="flex flex-wrap gap-2 text-xs">
                  <Badge variant="secondary" className="gap-1">
                    <Users className="h-3 w-3" />
                    {t("experienceDetails.info.maxPersons", {
                      count: room.max_persons,
                    })}
                  </Badge>
                  <Badge variant="secondary" className="gap-1">
                    <BedDouble className="h-3 w-3" />
                    {room.capacity_beds} {t("experienceDetails.rooms.beds")}
                  </Badge>
                </div>
                {room.items.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {room.items.map((equip) => (
                      <Badge key={equip.key} variant="outline" className="text-xs">
                        {equip.label}
                      </Badge>
                    ))}
                  </div>
                )}
                <Separator />
                <div className="flex items-center justify-between">
                  <p className="text-lg font-semibold">
                    {formatMoney(room.price_cents, room.currency, t)}{" "}
                    /{t("experienceDetails.info.night")}
                  </p>
                  <RoomBookingButton experience={experience} roomId={room.id} />
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    ) : (
      <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
        {t("experienceDetails.info.noRooms")}
      </div>
    );

  const tabTriggerClass =
    "rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none";

  const HostCard = () =>
    host ? (
      <div className="rounded-2xl border bg-card p-5">
        <div className="flex items-center gap-4">
          <Avatar className="h-14 w-14 border">
            <AvatarImage src={host.avatarUrl ?? undefined} alt={host.name} />
            <AvatarFallback>{host.name.slice(0, 1)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm text-muted-foreground">
              {t("experienceDetails.hostedBy")}
            </p>
            <p className="text-lg font-semibold">{host.name}</p>
            {host.verified && (
              <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">
                <ShieldCheck className="h-3.5 w-3.5" />
                {t("experienceDetails.verified")}
              </span>
            )}
          </div>
        </div>
        {shortDesc && (
          <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
            {shortDesc}
          </p>
        )}
      </div>
    ) : null;

  return (
    <div className="min-h-screen bg-background pb-24">
      <ExperienceAnalytics
        experienceId={experience.id}
        type={experience.type}
      />

      <ExperienceDetailHeader
        title={experience.title}
        url={url}
        description={shortDesc}
        locationLabel={locationLabel}
        previewImageUrl={experience.thumbnailUrl}
        experienceId={experience.id}
      />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Title & Meta — rendered once for all breakpoints */}
        <div className="mb-6 space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
            {experience.title}
          </h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-1 text-foreground">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              <span className="font-semibold">
                {experience.metrics.rating?.toFixed(1) ??
                  t("experienceDetails.info.new")}
              </span>
              {experience.metrics.reviews > 0 && (
                <span className="underline underline-offset-2">
                  {t("experienceDetails.reviewCount", {
                    count: experience.metrics.reviews,
                  })}
                </span>
              )}
            </div>
            <span className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              {locationLabel}
            </span>
          </div>
        </div>

        {/* Responsive layout: 1-col on mobile, 2-col on desktop */}
        <div className="lg:grid lg:grid-cols-12 lg:gap-10">
          {/* Gallery — sticky on desktop, full-width on mobile */}
          <div className="mb-6 lg:col-span-5 lg:mb-0">
            <div className="lg:sticky lg:top-24 space-y-4">
              <ExperienceGallery
                images={heroImages}
                video={experience.video}
                imageAlts={imageAlts}
              />
            </div>
          </div>

          {/* Content column */}
          <div className="space-y-6 lg:col-span-7">
            <HostCard />

            <ExperienceBookingSection
              experience={experience}
              formattedPrice={formattedPrice}
              nightsLabel={nightsLabel}
            />

            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-none border-b bg-transparent p-0">
                <TabsTrigger value="overview" className={tabTriggerClass}>
                  {t("experienceDetails.tabs.overview")}
                </TabsTrigger>
                {hasRoomsTab && (
                  <TabsTrigger value="rooms" className={tabTriggerClass}>
                    {t("experienceDetails.tabs.rooms")}
                  </TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="overview" className="mt-5 space-y-6">
                <InfoCard />
                {lodging && <StayContent />}
                <EquipmentSection />
                <ServicesSection />
              </TabsContent>

              {hasRoomsTab && (
                <TabsContent value="rooms" className="mt-5">
                  <RoomsContent />
                </TabsContent>
              )}
            </Tabs>

            {longDesc && (
              <div className="space-y-2 pt-2">
                <h2 className="text-lg font-semibold">
                  {t("experienceDetails.info.about")}
                </h2>
                <div
                  className="prose prose-sm max-w-none text-muted-foreground prose-headings:text-foreground prose-a:text-primary"
                  // Content originates from our own DB (host-entered rich text)
                  dangerouslySetInnerHTML={{ __html: longDesc }}
                />
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
