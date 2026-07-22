"use client";

import {
  BedDouble,
  CalendarDays,
  ChevronRight,
  MapPin,
  Star,
  Verified,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useSiteI18n } from "@/components/site/site-i18n";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useImageViewer } from "@/hooks/use-image-viewer";
import { cn } from "@/lib/utils";
import type { GuideItemChatCardData, GuideItemKind } from "@/types/guide-items";
import { getImageUrl, IMAGE_BLUR_DATA_URL } from "@/utils/functions";
import { ExperienceCard } from "./ExperienceCard";
import type { ExperienceGridItem } from "./ExperienceCardsGrid";
import { GuideItemCard } from "./GuideItemCard";

export interface TripPlanGuideItem {
  id: string;
  kind: GuideItemKind;
  title: string;
  summary: string | null;
  payment: string | null;
  price_range: string | null;
  currency: string;
  address_text: string | null;
  distance_km: number | null;
  rating_avg: number | null;
  reviews_count: number;
  verified: boolean;
  card?: GuideItemChatCardData;
}

export interface TripPlanItem {
  item: TripPlanGuideItem | null;
  slot?: "activity" | "breakfast" | "lunch" | "dinner";
  why: string;
}

export interface TripPlanDay {
  day: number;
  items?: TripPlanItem[];
  slots?: Array<{
    time: string;
    label: "morning" | "lunch" | "afternoon" | "dinner";
    item: TripPlanGuideItem | null;
    why: string;
  }>;
}

export interface TripPlanData {
  success: boolean;
  type: "trip_plan";
  city: string;
  city_slug: string;
  days_requested: number;
  travelers: number | null;
  budget_mad: number | null;
  budget_scope: "total" | "per_person" | "per_day" | "unknown";
  pace: "relaxed" | "balanced" | "full";
  near_text: string | null;
  distance_reference?: "user_location" | null;
  coverage?: "full" | "partial" | "none";
  plan: TripPlanDay[];
  source_items: TripPlanGuideItem[];
  transport_options?: TripPlanGuideItem[];
  note?: string;
  accommodations?: ExperienceGridItem[];
}

interface TripPlanBlockProps {
  plan: TripPlanData;
}

const LABELS = {
  fr: {
    stay: "Hébergement",
    day: "Jour",
    open: "Voir",
    budget: "Budget",
    travelers: "voyageur(s)",
    noItem: "Aucun guide item disponible pour ce créneau.",
    noPlanItem: "Aucune activité disponible pour cette étape.",
    details: "Détails",
    verified: "Vérifié",
    stop: "Étape",
    activityOne: "activité",
    activityOther: "activités",
  },
  en: {
    stay: "Stay",
    day: "Day",
    open: "Open",
    budget: "Budget",
    travelers: "traveler(s)",
    noItem: "No guide item available for this slot.",
    noPlanItem: "No activity available for this stop.",
    details: "Details",
    verified: "Verified",
    stop: "Stop",
    activityOne: "activity",
    activityOther: "activities",
  },
  ar: {
    stay: "الإقامة",
    day: "اليوم",
    open: "عرض",
    budget: "الميزانية",
    travelers: "مسافر",
    noItem: "لا يوجد عنصر دليل متاح لهذا الوقت.",
    noPlanItem: "لا يوجد نشاط متاح لهذه المحطة.",
    details: "التفاصيل",
    verified: "موثق",
    stop: "محطة",
    activityOne: "نشاط",
    activityOther: "أنشطة",
  },
} as const;

function formatMad(value: number, locale: string): string {
  return new Intl.NumberFormat(locale === "ar" ? "ar-MA" : locale, {
    style: "currency",
    currency: "MAD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatActivityCount(
  count: number,
  labels: (typeof LABELS)[keyof typeof LABELS],
): string {
  return `${count} ${count === 1 ? labels.activityOne : labels.activityOther}`;
}

function hideUntrustedDistanceText(value: string): string {
  return value
    .split(";")
    .map((part) => part.trim())
    .filter((part) => !/\b\d+(?:\.\d+)?\s*km\b.*reference point/i.test(part))
    .join("; ");
}

function kindLabel(
  kind: GuideItemKind,
  t: ReturnType<typeof useSiteI18n>["t"],
): string {
  return t(`chat.guideItemCard.kind.${kind}` as const);
}

function CompactGuideItemPreview({
  item,
  labels,
  locale,
  t,
  showDistance,
}: {
  item: TripPlanGuideItem;
  labels: (typeof LABELS)[keyof typeof LABELS];
  locale: string;
  t: ReturnType<typeof useSiteI18n>["t"];
  showDistance: boolean;
}) {
  const [open, setOpen] = useState(false);
  const card = item.card;
  const [detailCard, setDetailCard] = useState(card ?? null);
  const { openImageViewer, Viewer } = useImageViewer();
  const thumbnailSource =
    card?.hero_image_url ?? card?.gallery_urls?.[0] ?? null;
  const thumbnailSrc = thumbnailSource ? getImageUrl(thumbnailSource) : null;

  useEffect(() => {
    setDetailCard(card ?? null);
  }, [card]);

  useEffect(() => {
    if (!open || !card) return;

    const loadedReviewsCount = detailCard?.reviews?.length ?? 0;
    if (loadedReviewsCount >= card.reviews_count) return;

    const controller = new AbortController();

    void fetch(`/api/guide-items/${card.id}?locale=${locale}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Guide item request failed with ${response.status}`);
        }
        return (await response.json()) as { item?: GuideItemChatCardData };
      })
      .then((payload) => {
        if (payload.item) {
          setDetailCard(payload.item);
        }
      })
      .catch((error: unknown) => {
        if (
          error instanceof Error &&
          (error.name === "AbortError" || controller.signal.aborted)
        ) {
          return;
        }
        console.error("Failed to hydrate guide item modal details:", error);
      });

    return () => {
      controller.abort();
    };
  }, [card, detailCard?.reviews?.length, locale, open]);

  const openImageViewerFromModal = (
    images: string[],
    index: number,
    alts?: string[],
  ) => {
    setOpen(false);
    openImageViewer(images, index, alts);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => card && setOpen(true)}
        disabled={!card}
        className={cn(
          "group flex w-full gap-3 rounded-xl border bg-background p-2.5 text-left transition-all",
          "hover:border-primary/30 hover:shadow-md hover:bg-muted/20",
          card && "active:scale-[0.99]",
          !card && "cursor-not-allowed opacity-70",
        )}
      >
        <div className="relative aspect-square h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-muted sm:h-[72px] sm:w-[72px]">
          {thumbnailSrc ? (
            <Image
              src={thumbnailSrc}
              alt={item.title}
              fill
              placeholder="blur"
              blurDataURL={IMAGE_BLUR_DATA_URL}
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <MapPin className="size-5 text-muted-foreground/60" />
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
          <div className="min-w-0 space-y-1">
            <div className="flex items-start justify-between gap-2">
              <span className="line-clamp-1 font-semibold text-sm text-foreground">
                {item.title}
              </span>
              {card && (
                <ChevronRight className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
              )}
            </div>

            {item.summary && (
              <p className="line-clamp-1 text-xs leading-relaxed text-muted-foreground">
                {item.summary}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Badge variant="secondary" className="h-5 rounded-sm text-[10px]">
              {kindLabel(item.kind, t)}
            </Badge>
            {item.verified && (
              <Badge className="h-5 gap-0.5 rounded-sm text-[10px]">
                <Verified className="size-2.5" />
                {labels.verified}
              </Badge>
            )}

            {item.rating_avg !== null && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-foreground">
                <Star className="size-3 fill-yellow-400 text-yellow-400" />
                {item.rating_avg.toFixed(1)}
                {item.reviews_count > 0 && (
                  <span className="text-muted-foreground">
                    ({item.reviews_count})
                  </span>
                )}
              </span>
            )}

            {(item.payment || item.price_range) && (
              <span className="text-[11px] font-medium text-foreground">
                {item.payment || item.price_range}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
            {item.address_text && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3" />
                <span className="line-clamp-1">{item.address_text}</span>
              </span>
            )}
            {showDistance && item.distance_km !== null && (
              <span>{item.distance_km.toFixed(1)} km</span>
            )}
          </div>
        </div>
      </button>

      {card && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden p-0 sm:max-w-2xl">
            <DialogHeader className="shrink-0 border-b px-6 pt-6 pb-4 pr-14">
              <DialogTitle>{detailCard?.title ?? card.title}</DialogTitle>
            </DialogHeader>
            <div className="overflow-y-auto p-4 sm:p-6">
              <GuideItemCard
                item={detailCard ?? card}
                onOpenImageViewer={openImageViewerFromModal}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
      {Viewer}
    </>
  );
}

function CompactExperiencePreview({
  experience,
  locale,
  showDistance,
}: {
  experience: ExperienceGridItem;
  locale: string;
  showDistance: boolean;
}) {
  const [open, setOpen] = useState(false);
  const thumbnailSrc = experience.thumbnail_url
    ? getImageUrl(experience.thumbnail_url)
    : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group flex w-full gap-3 rounded-xl border bg-background p-2.5 text-left transition-all hover:border-primary/30 hover:shadow-md hover:bg-muted/20 active:scale-[0.99]"
      >
        <div className="relative aspect-square h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-muted sm:h-[72px] sm:w-[72px]">
          {thumbnailSrc ? (
            <Image
              src={thumbnailSrc}
              alt={experience.title}
              fill
              placeholder="blur"
              blurDataURL={IMAGE_BLUR_DATA_URL}
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <BedDouble className="size-5 text-muted-foreground/60" />
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
          <div className="min-w-0 space-y-1">
            <div className="flex items-start justify-between gap-2">
              <span className="line-clamp-1 font-semibold text-sm text-foreground">
                {experience.title}
              </span>
              <ChevronRight className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
            </div>
            {experience.description && (
              <p className="line-clamp-1 text-xs leading-relaxed text-muted-foreground">
                {experience.description}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Badge variant="secondary" className="h-5 rounded-sm text-[10px]">
              {experience.type}
            </Badge>
            {typeof experience.rating === "number" && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-foreground">
                <Star className="size-3 fill-yellow-400 text-yellow-400" />
                {experience.rating.toFixed(1)}
                {experience.reviews_count && experience.reviews_count > 0 && (
                  <span className="text-muted-foreground">
                    ({experience.reviews_count})
                  </span>
                )}
              </span>
            )}
            {experience.price_mad > 0 && (
              <span className="text-[11px] font-medium text-foreground">
                {formatMad(experience.price_mad, locale)}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3" />
              {experience.city}
            </span>
            {showDistance && typeof experience.distance_km === "number" && (
              <span>{experience.distance_km.toFixed(1)} km</span>
            )}
          </div>
        </div>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden p-0 sm:max-w-2xl">
          <DialogHeader className="shrink-0 border-b px-6 pt-6 pb-4 pr-14">
            <DialogTitle>{experience.title}</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto p-4 sm:p-6">
            <ExperienceCard experience={experience} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function TripPlanBlock({ plan }: TripPlanBlockProps) {
  const { locale, dir, t } = useSiteI18n();
  const labels = LABELS[locale] ?? LABELS.fr;
  const accommodations = plan.accommodations ?? [];
  const showDistance = plan.distance_reference === "user_location";

  // Catalog-gap slots (item === null) are completed by the assistant in text;
  // the structured block only displays catalog-backed cards, and disappears
  // entirely when there is nothing to show.
  const visibleDays = plan.plan
    .map((day) => {
      const dayItems = (
        day.items ??
        day.slots?.map((slot) => ({
          item: slot.item,
          why: slot.why,
        })) ??
        []
      ).filter(
        (planItem): planItem is TripPlanItem & { item: TripPlanGuideItem } =>
          Boolean(planItem.item),
      );

      return { day: day.day, items: dayItems };
    })
    .filter((day) => day.items.length > 0);

  if (visibleDays.length === 0 && accommodations.length === 0) {
    return null;
  }

  return (
    <div
      dir={dir}
      className="space-y-5 rounded-2xl border bg-card p-4 shadow-sm sm:p-5"
    >
      <div className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-display text-xl font-semibold capitalize text-foreground sm:text-2xl">
            {plan.city}
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="rounded-full">
              <CalendarDays className="me-1 size-3" />
              {plan.days_requested} {plan.days_requested === 1 ? "day" : "days"}
            </Badge>
            {plan.travelers !== null && (
              <Badge variant="secondary" className="rounded-full">
                {plan.travelers} {labels.travelers}
              </Badge>
            )}
            {plan.budget_mad !== null && (
              <Badge variant="secondary" className="rounded-full">
                {labels.budget}: {formatMad(plan.budget_mad, locale)}
              </Badge>
            )}
          </div>
        </div>

        {plan.near_text && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="inline-flex size-6 items-center justify-center rounded-full bg-muted">
              <MapPin className="size-3" />
            </span>
            {plan.near_text}
          </p>
        )}
      </div>

      {accommodations.length > 0 && (
        <>
          <Separator />
          <section className="space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <span className="inline-flex size-7 items-center justify-center rounded-lg bg-primary/10">
                <BedDouble className="size-4 text-primary" />
              </span>
              {labels.stay}
            </h3>
            <div className="space-y-3">
              {accommodations.map((experience) => (
                <CompactExperiencePreview
                  key={experience.id}
                  experience={experience}
                  locale={locale}
                  showDistance={showDistance}
                />
              ))}
            </div>
          </section>
        </>
      )}

      {visibleDays.length > 0 && (
        <>
          <Separator />

          <div className="space-y-5">
            {visibleDays.map((day) => (
              <section
                key={day.day}
                className="relative rounded-xl border bg-background p-4 shadow-sm sm:p-5"
              >
                <div className="mb-4 flex items-center gap-2">
                  <span className="inline-flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground text-xs font-bold">
                    {day.day}
                  </span>
                  <h3 className="font-display text-base font-semibold text-foreground">
                    {labels.day} {day.day}
                  </h3>
                  <Badge variant="secondary" className="rounded-full">
                    {formatActivityCount(day.items.length, labels)}
                  </Badge>
                </div>

                <div className="relative space-y-4">
                  {day.items.map((planItem, index) => {
                    const whyText = showDistance
                      ? planItem.why
                      : hideUntrustedDistanceText(planItem.why);

                    return (
                      <div
                        key={`${day.day}-${planItem.item.id}-${index}`}
                        className="relative pl-6 sm:pl-7"
                      >
                        <div
                          className={cn(
                            "absolute top-0 bottom-0 w-px bg-primary/15 last-of-type:hidden",
                            dir === "rtl"
                              ? "right-[11px] sm:right-[13px]"
                              : "left-[11px] sm:left-[13px]",
                          )}
                          aria-hidden="true"
                        />
                        <div
                          className={cn(
                            "absolute top-0.5 z-10 flex size-6 items-center justify-center rounded-full border-2 border-primary/20 bg-background shadow-sm",
                            dir === "rtl" ? "right-0" : "left-0",
                          )}
                        >
                          <span className="text-xs font-semibold text-primary">
                            {index + 1}
                          </span>
                        </div>

                        <div className="space-y-2">
                          <Badge
                            variant="secondary"
                            className="rounded-full text-[11px]"
                          >
                            {labels.stop} {index + 1}
                          </Badge>

                          {whyText && (
                            <p className="text-xs leading-relaxed text-muted-foreground">
                              {whyText}
                            </p>
                          )}

                          <CompactGuideItemPreview
                            item={planItem.item}
                            labels={labels}
                            locale={locale}
                            t={t}
                            showDistance={showDistance}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </>
      )}

      {plan.note && (
        <p className="rounded-lg border border-dashed bg-muted/20 p-3 text-xs leading-relaxed text-muted-foreground">
          {plan.note}
        </p>
      )}
    </div>
  );
}
