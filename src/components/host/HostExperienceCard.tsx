"use client";

import { CalendarDays, Eye, Loader2, MapPin, Star, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { useSiteI18n } from "@/components/site/site-i18n";
import { IMAGE_BLUR_DATA_URL } from "@/utils/functions";
import type { HostExperience } from "@/types/host-experiences";

type HostExperienceCardProps = {
  experience: HostExperience;
  onToggleVisibility: (experience: HostExperience) => void;
  busy: boolean;
};

function statusClassName(status: HostExperience["status"]): string {
  switch (status) {
    case "published":
      return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "review":
      return "bg-amber-100 text-amber-700 border-amber-200";
    case "draft":
      return "bg-slate-100 text-slate-700 border-slate-200";
    case "paused":
    case "rejected":
      return "bg-rose-100 text-rose-700 border-rose-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
}

export function HostExperienceCard({
  experience,
  onToggleVisibility,
  busy,
}: HostExperienceCardProps) {
  const { t } = useSiteI18n();

  function statusLabel(status: HostExperience["status"]): string {
    switch (status) {
      case "published": return t("host.experienceCard.statuses.published");
      case "review": return t("host.experienceCard.statuses.review");
      case "draft": return t("host.experienceCard.statuses.draft");
      case "paused":
      case "rejected": return t("host.experienceCard.statuses.archived");
      default: return status;
    }
  }

  function typeLabel(type: HostExperience["type"]): string {
    switch (type) {
      case "lodging": return t("host.experienceCard.types.lodging");
      case "trip": return t("host.experienceCard.types.trip");
      case "activity": return t("host.experienceCard.types.activity");
      default: return type;
    }
  }

  const activeCount = experience.activeBookingsCount;
  const activeBookingsText = activeCount === 1
    ? t("host.experienceCard.activeBookingOne", { count: activeCount })
    : t("host.experienceCard.activeBookingOther", { count: activeCount });

  return (
    <Card className="overflow-hidden border-slate-200 shadow-sm">
      <div className="relative aspect-[16/9] bg-slate-100">
        {experience.thumbnailUrl ? (
          <Image
            src={experience.thumbnailUrl}
            alt={experience.title}
            fill
            placeholder="blur"
            blurDataURL={IMAGE_BLUR_DATA_URL}
            className="object-cover"
            sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-slate-500">
            {t("host.experienceCard.noThumbnail")}
          </div>
        )}
      </div>

      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h3 className="line-clamp-2 text-base font-semibold text-slate-900">
              {experience.title}
            </h3>
            <p className="text-xs uppercase tracking-wide text-slate-500">
              {typeLabel(experience.type)}
            </p>
          </div>
          <Badge className={statusClassName(experience.status)}>
            {statusLabel(experience.status)}
          </Badge>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <MapPin className="size-3.5" />
          <span>{experience.city ?? t("host.experienceCard.locationUnavailable")}</span>
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-2 gap-3 text-sm text-slate-700">
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Star className="size-3.5" />
              {t("host.experienceCard.rating")}
            </div>
            <p className="mt-1 font-medium">
              {experience.avgRating
                ? experience.avgRating.toFixed(1)
                : t("host.experienceCard.noRating")}
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Users className="size-3.5" />
              {t("host.experienceCard.bookings")}
            </div>
            <p className="mt-1 font-medium">{experience.bookingsCount}</p>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
          <CalendarDays className="size-3.5" />
          <span>{activeBookingsText}</span>
        </div>
      </CardContent>

      <CardFooter className="flex flex-wrap gap-2 border-t border-slate-200 bg-slate-50/50">
        <Button asChild variant="outline" size="sm" className="gap-1.5">
          <Link
            href={`/experience/${experience.id}`}
            target="_blank"
            rel="noreferrer"
          >
            <Eye className="size-3.5" />
            {t("host.experienceCard.viewDetails")}
          </Link>
        </Button>

        <Button
          size="sm"
          variant={experience.status === "published" ? "secondary" : "default"}
          onClick={() => onToggleVisibility(experience)}
          disabled={busy}
          className="ml-auto gap-1.5"
        >
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : null}
          {experience.status === "published"
            ? t("host.experienceCard.unpublish")
            : t("host.experienceCard.publish")}
        </Button>
      </CardFooter>
    </Card>
  );
}
