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
import { IMAGE_BLUR_DATA_URL } from "@/utils/functions";
import type { HostExperience } from "@/types/host-experiences";

type HostExperienceCardProps = {
  experience: HostExperience;
  onToggleVisibility: (experience: HostExperience) => void;
  busy: boolean;
};

function statusCopy(status: HostExperience["status"]) {
  switch (status) {
    case "published":
      return {
        label: "Published",
        className: "bg-emerald-100 text-emerald-700 border-emerald-200",
      };
    case "review":
      return {
        label: "In review",
        className: "bg-amber-100 text-amber-700 border-amber-200",
      };
    case "draft":
      return {
        label: "Draft",
        className: "bg-slate-100 text-slate-700 border-slate-200",
      };
    case "paused":
    case "rejected":
      return {
        label: "Archived",
        className: "bg-rose-100 text-rose-700 border-rose-200",
      };
    default:
      return {
        label: status,
        className: "bg-slate-100 text-slate-700 border-slate-200",
      };
  }
}

function typeCopy(type: HostExperience["type"]) {
  switch (type) {
    case "lodging":
      return "Lodging";
    case "trip":
      return "Trip";
    case "activity":
      return "Activity";
    default:
      return type;
  }
}

function pluralize(value: number, singular: string, plural: string) {
  return `${value} ${value === 1 ? singular : plural}`;
}

export function HostExperienceCard({
  experience,
  onToggleVisibility,
  busy,
}: HostExperienceCardProps) {
  const status = statusCopy(experience.status);

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
            No thumbnail
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
              {typeCopy(experience.type)}
            </p>
          </div>
          <Badge className={status.className}>{status.label}</Badge>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <MapPin className="size-3.5" />
          <span>{experience.city ?? "Location unavailable"}</span>
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-2 gap-3 text-sm text-slate-700">
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Star className="size-3.5" />
              Rating
            </div>
            <p className="mt-1 font-medium">
              {experience.avgRating
                ? experience.avgRating.toFixed(1)
                : "No rating"}
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Users className="size-3.5" />
              Bookings
            </div>
            <p className="mt-1 font-medium">{experience.bookingsCount}</p>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
          <CalendarDays className="size-3.5" />
          <span>
            {pluralize(
              experience.activeBookingsCount,
              "active booking",
              "active bookings",
            )}
          </span>
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
            View details
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
          {experience.status === "published" ? "Unpublish" : "Publish"}
        </Button>
      </CardFooter>
    </Card>
  );
}
