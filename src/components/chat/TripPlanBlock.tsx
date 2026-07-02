"use client";

import { BedDouble, CalendarDays, Clock, MapPin, Star } from "lucide-react";
import { useState } from "react";
import { useSiteI18n } from "@/components/site/site-i18n";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { GuideItemChatCardData, GuideItemKind } from "@/types/guide-items";
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
    open: "Voir la fiche",
    budget: "Budget",
    travelers: "voyageur(s)",
    noItem: "Aucun guide item disponible pour ce créneau.",
    details: "Détails",
    verified: "Vérifié",
  },
  en: {
    stay: "Stay",
    day: "Day",
    open: "Open card",
    budget: "Budget",
    travelers: "traveler(s)",
    noItem: "No guide item available for this slot.",
    details: "Details",
    verified: "Verified",
  },
  ar: {
    stay: "الإقامة",
    day: "اليوم",
    open: "عرض البطاقة",
    budget: "الميزانية",
    travelers: "مسافر",
    noItem: "لا يوجد عنصر دليل متاح لهذا الوقت.",
    details: "التفاصيل",
    verified: "موثق",
  },
} as const;

function formatMad(value: number, locale: string): string {
  return new Intl.NumberFormat(locale === "ar" ? "ar-MA" : locale, {
    style: "currency",
    currency: "MAD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatSlotLabel(label: TripPlanSlotLabel): string {
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function CompactGuideItemPreview({
  item,
  labels,
}: {
  item: TripPlanGuideItem;
  labels: (typeof LABELS)[keyof typeof LABELS];
}) {
  const [open, setOpen] = useState(false);
  const card = item.card;

  return (
    <>
      <button
        type="button"
        className="w-full rounded-lg border bg-background p-3 text-left transition hover:border-primary/40 hover:bg-muted/30"
        onClick={() => card && setOpen(true)}
        disabled={!card}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-sm text-foreground">
                {item.title}
              </span>
              <Badge variant="secondary" className="h-5 rounded-sm text-[11px]">
                {item.kind}
              </Badge>
              {item.verified && (
                <Badge className="h-5 rounded-sm text-[11px]">
                  {labels.verified}
                </Badge>
              )}
            </div>
            {item.summary && (
              <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                {item.summary}
              </p>
            )}
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
              {item.address_text && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="size-3" />
                  {item.address_text}
                </span>
              )}
              {item.distance_km !== null && (
                <span>{item.distance_km.toFixed(1)} km</span>
              )}
              {item.rating_avg !== null && (
                <span className="inline-flex items-center gap-1">
                  <Star className="size-3 fill-current" />
                  {item.rating_avg.toFixed(1)}
                  {item.reviews_count > 0 ? ` (${item.reviews_count})` : ""}
                </span>
              )}
              {(item.payment || item.price_range) && (
                <span>{item.payment || item.price_range}</span>
              )}
            </div>
          </div>
          {card && (
            <span className="shrink-0 text-xs font-medium text-primary">
              {labels.open}
            </span>
          )}
        </div>
      </button>

      {card && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>{card.title}</DialogTitle>
            </DialogHeader>
            <GuideItemCard item={card} />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

function CompactExperiencePreview({
  experience,
  labels,
  locale,
}: {
  experience: ExperienceGridItem;
  labels: (typeof LABELS)[keyof typeof LABELS];
  locale: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="w-full rounded-lg border bg-background p-3 text-left transition hover:border-primary/40 hover:bg-muted/30"
        onClick={() => setOpen(true)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-sm text-foreground">
                {experience.title}
              </span>
              <Badge variant="secondary" className="h-5 rounded-sm text-[11px]">
                {experience.type}
              </Badge>
            </div>
            {experience.description && (
              <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                {experience.description}
              </p>
            )}
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3" />
                {experience.city}
              </span>
              {experience.price_mad > 0 && (
                <span>{formatMad(experience.price_mad, locale)}</span>
              )}
              {typeof experience.rating === "number" && (
                <span className="inline-flex items-center gap-1">
                  <Star className="size-3 fill-current" />
                  {experience.rating.toFixed(1)}
                </span>
              )}
            </div>
          </div>
          <span className="shrink-0 text-xs font-medium text-primary">
            {labels.open}
          </span>
        </div>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{experience.title}</DialogTitle>
          </DialogHeader>
          <ExperienceCard experience={experience} />
        </DialogContent>
      </Dialog>
    </>
  );
}

export function TripPlanBlock({ plan }: TripPlanBlockProps) {
  const { locale, dir } = useSiteI18n();
  const labels = LABELS[locale] ?? LABELS.fr;
  const accommodations = plan.accommodations ?? [];

  return (
    <div
      dir={dir}
      className="space-y-5 rounded-xl border bg-muted/20 p-3 sm:p-4"
    >
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="rounded-sm">
            <CalendarDays className="me-1 size-3" />
            {plan.days_requested} {plan.days_requested === 1 ? "day" : "days"}
          </Badge>
          {plan.travelers !== null && (
            <Badge variant="secondary" className="rounded-sm">
              {plan.travelers} {labels.travelers}
            </Badge>
          )}
          {plan.budget_mad !== null && (
            <Badge variant="secondary" className="rounded-sm">
              {labels.budget}: {formatMad(plan.budget_mad, locale)}
            </Badge>
          )}
        </div>
        {plan.near_text && (
          <p className="text-xs text-muted-foreground">
            <MapPin className="me-1 inline size-3" />
            {plan.near_text}
          </p>
        )}
      </div>

      {accommodations.length > 0 && (
        <section className="space-y-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <BedDouble className="size-4 text-primary" />
            {labels.stay}
          </h3>
          <div className="space-y-2">
            {accommodations.map((experience) => (
              <CompactExperiencePreview
                key={experience.id}
                experience={experience}
                labels={labels}
                locale={locale}
              />
            ))}
          </div>
        </section>
      )}

      <div className="space-y-4">
        {plan.plan.map((day) => (
          <section key={day.day} className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">
              {labels.day} {day.day}
            </h3>
            <div className="space-y-3">
              {day.slots.map((slot, index) => (
                <div
                  key={`${day.day}-${slot.time}-${slot.label}-${index}`}
                  className={cn(
                    "border-border/70 border-s-2 ps-3",
                    !slot.item && "opacity-75",
                  )}
                >
                  <div className="mb-2 space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
                      <Clock className="size-3.5 text-primary" />
                      <span>{slot.time}</span>
                      <span className="text-muted-foreground">·</span>
                      <span>{formatSlotLabel(slot.label)}</span>
                    </div>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {slot.why}
                    </p>
                  </div>
                  {slot.item ? (
                    <CompactGuideItemPreview item={slot.item} labels={labels} />
                  ) : (
                    <div className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
                      {labels.noItem}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      {plan.note && (
        <p className="text-xs leading-relaxed text-muted-foreground">
          {plan.note}
        </p>
      )}
    </div>
  );
}
