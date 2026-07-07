"use client";

import {
  BedDouble,
  CalendarDays,
  ChevronRight,
  Clock,
  Compass,
  MapPin,
  Moon,
  Star,
  Sun,
  Utensils,
  Verified,
} from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { useSiteI18n } from "@/components/site/site-i18n";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { GuideItemChatCardData, GuideItemKind } from "@/types/guide-items";
import { getImageUrl, IMAGE_BLUR_DATA_URL } from "@/utils/functions";
import { ExperienceCard } from "./ExperienceCard";
import type { ExperienceGridItem } from "./ExperienceCardsGrid";
import { GuideItemCard } from "./GuideItemCard";

type TripPlanSlotLabel = "morning" | "lunch" | "afternoon" | "dinner";

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

export interface TripPlanSlot {
  time: string;
  label: TripPlanSlotLabel;
  item: TripPlanGuideItem | null;
  why: string;
}

export interface TripPlanDay {
  day: number;
  slots: TripPlanSlot[];
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
    details: "Détails",
    verified: "Vérifié",
    morning: "Matin",
    lunch: "Déjeuner",
    afternoon: "Après-midi",
    dinner: "Dîner",
  },
  en: {
    stay: "Stay",
    day: "Day",
    open: "Open",
    budget: "Budget",
    travelers: "traveler(s)",
    noItem: "No guide item available for this slot.",
    details: "Details",
    verified: "Verified",
    morning: "Morning",
    lunch: "Lunch",
    afternoon: "Afternoon",
    dinner: "Dinner",
  },
  ar: {
    stay: "الإقامة",
    day: "اليوم",
    open: "عرض",
    budget: "الميزانية",
    travelers: "مسافر",
    noItem: "لا يوجد عنصر دليل متاح لهذا الوقت.",
    details: "التفاصيل",
    verified: "موثق",
    morning: "صباح",
    lunch: "غداء",
    afternoon: "بعد الظهر",
    dinner: "عشاء",
  },
} as const;

const SLOT_ICONS: Record<TripPlanSlotLabel, React.ReactNode> = {
  morning: <Sun className="size-3.5" />,
  lunch: <Utensils className="size-3.5" />,
  afternoon: <Compass className="size-3.5" />,
  dinner: <Moon className="size-3.5" />,
};

function formatMad(value: number, locale: string): string {
  return new Intl.NumberFormat(locale === "ar" ? "ar-MA" : locale, {
    style: "currency",
    currency: "MAD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatSlotLabel(
  label: TripPlanSlotLabel,
  labels: (typeof LABELS)[keyof typeof LABELS],
): string {
  return labels[label] ?? label;
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
  t,
}: {
  item: TripPlanGuideItem;
  labels: (typeof LABELS)[keyof typeof LABELS];
  t: ReturnType<typeof useSiteI18n>["t"];
}) {
  const [open, setOpen] = useState(false);
  const card = item.card;
  const thumbnailSource =
    card?.hero_image_url ?? card?.gallery_urls?.[0] ?? null;
  const thumbnailSrc = thumbnailSource ? getImageUrl(thumbnailSource) : null;

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
            {item.distance_km !== null && (
              <span>{item.distance_km.toFixed(1)} km</span>
            )}
          </div>
        </div>
      </button>

      {card && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden p-0 sm:max-w-2xl">
            <DialogHeader className="shrink-0 border-b px-6 pt-6 pb-4 pr-14">
              <DialogTitle>{card.title}</DialogTitle>
            </DialogHeader>
            <div className="overflow-y-auto p-4 sm:p-6">
              <GuideItemCard item={card} />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

function CompactExperiencePreview({
  experience,
  locale,
}: {
  experience: ExperienceGridItem;
  locale: string;
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
            {typeof experience.distance_km === "number" && (
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
                />
              ))}
            </div>
          </section>
        </>
      )}

      <Separator />

      <div className="space-y-5">
        {plan.plan.map((day, _dayIndex) => (
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
            </div>

            <div className="relative space-y-4">
              {day.slots.map((slot, index) => (
                <div
                  key={`${day.day}-${slot.time}-${slot.label}-${index}`}
                  className={cn(
                    "relative pl-6 sm:pl-7",
                    !slot.item && "opacity-80",
                  )}
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
                    <span className="text-primary">
                      {SLOT_ICONS[slot.label]}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant="secondary"
                        className="rounded-full text-[11px]"
                      >
                        <Clock className="me-1 size-3" />
                        {slot.time}
                      </Badge>
                      <span className="text-sm font-medium text-foreground">
                        {formatSlotLabel(slot.label, labels)}
                      </span>
                    </div>

                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {slot.why}
                    </p>

                    {slot.item ? (
                      <CompactGuideItemPreview
                        item={slot.item}
                        labels={labels}
                        t={t}
                      />
                    ) : (
                      <div className="flex items-center gap-2 rounded-lg border border-dashed bg-muted/20 p-3 text-xs text-muted-foreground">
                        <MapPin className="size-3.5" />
                        {labels.noItem}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      {plan.note && (
        <p className="rounded-lg border border-dashed bg-muted/20 p-3 text-xs leading-relaxed text-muted-foreground">
          {plan.note}
        </p>
      )}
    </div>
  );
}
