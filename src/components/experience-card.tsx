import Image from "next/image"
import Link from "next/link"
import { MapPin, Clock, Moon, Star, Map as MapIcon, Bed, Activity } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import type { ExperienceListItem } from "@/types/experience"
import { getImageUrl } from "@/utils/functions"

interface ExperienceCardProps {
  experience: ExperienceListItem
  className?: string
}

export function ExperienceCard({ experience, className }: ExperienceCardProps) {
  const price = experience.trip?.price_cents
    ? new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: experience.trip.currency ?? "USD",
      }).format(experience.trip.price_cents / 100)
    : experience.lodging?.price_cents
    ? new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: experience.lodging.currency ?? "USD",
      }).format(experience.lodging.price_cents / 100)
    : null

  const locationLabel = experience.region
    ? `${experience.city}, ${experience.region}`
    : experience.city

  const duration = experience.trip?.duration_days
    ? `${experience.trip.duration_days}d`
    : experience.trip?.duration_hours
    ? `${experience.trip.duration_hours}h`
    : null

  const nights = experience.lodging?.min_stay_nights
    ? `${experience.lodging.min_stay_nights} nights min`
    : null

  const TypeIcon =
    experience.type === "trip"
      ? MapIcon
      : experience.type === "lodging"
      ? Bed
      : Activity

  return (
    <Link href={`/experience/${experience.id}`}>
      <Card className={cn("overflow-hidden group h-full hover:shadow-lg transition-shadow duration-300", className)}>
        <div className="relative aspect-[4/3] w-full overflow-hidden">
          {experience.thumbnail_url ? (
            <Image
              src={getImageUrl(experience.thumbnail_url)!}
              alt={experience.title}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center">
              <TypeIcon className="w-12 h-12 text-muted-foreground/50" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          
          <div className="absolute top-3 left-3 flex items-center gap-2">
            <Badge variant="secondary" className="bg-black/40 text-white hover:bg-black/60 backdrop-blur-md border-0">
              <TypeIcon className="w-3 h-3 mr-1" />
              <span className="capitalize">{experience.type}</span>
            </Badge>
          </div>

          {experience.avg_rating && (
            <div className="absolute top-3 right-3">
              <Badge variant="secondary" className="bg-black/40 text-white hover:bg-black/60 backdrop-blur-md border-0 gap-1">
                <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                <span>{experience.avg_rating.toFixed(1)}</span>
                {experience.reviews_count && (
                  <span className="text-white/70 text-xs">({experience.reviews_count})</span>
                )}
              </Badge>
            </div>
          )}

          <div className="absolute bottom-3 left-3 right-3 text-white">
            <h3 className="font-bold text-lg leading-tight mb-1 line-clamp-2">{experience.title}</h3>
            <div className="flex items-center text-sm text-white/90">
              <MapPin className="w-3.5 h-3.5 mr-1" />
              <span className="line-clamp-1">{locationLabel}</span>
            </div>
          </div>
        </div>

        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-4">
            {experience.host?.avatar_url ? (
              <div className="relative w-6 h-6 rounded-full overflow-hidden shrink-0">
                {experience.host.avatar_url && <Image src={getImageUrl(experience.host.avatar_url)!} alt={experience.host.name} fill className="object-cover" />}
              </div>
            ) : (
              <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0">
                <span className="text-[10px] font-bold text-muted-foreground">
                  {experience.host?.name?.slice(0, 2).toUpperCase() ?? "EX"}
                </span>
              </div>
            )}
            <span className="text-sm text-muted-foreground line-clamp-1">
              Hosted by {experience.host?.name ?? "Okeyo Host"}
            </span>
          </div>

          <div className="flex items-end justify-between">
            <div className="flex flex-wrap gap-2">
              {duration && (
                <Badge variant="outline" className="text-xs font-normal text-muted-foreground border-muted-foreground/20">
                  <Clock className="w-3 h-3 mr-1" />
                  {duration}
                </Badge>
              )}
              {nights && (
                <Badge variant="outline" className="text-xs font-normal text-muted-foreground border-muted-foreground/20">
                  <Moon className="w-3 h-3 mr-1" />
                  {nights}
                </Badge>
              )}
            </div>

            <div className="text-right">
              <div className="text-xs text-muted-foreground">From</div>
              <div className="font-bold text-primary text-lg">
                {price ?? "Contact Host"}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
