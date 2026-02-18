import { BedDouble, DoorOpen, MapPin, Play, Star, Users } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getImageUrl } from "@/utils/functions";

interface RoomInfo {
  name: string;
  type?: string;
  price_mad: number;
  capacity_beds?: number;
  max_persons?: number;
}

interface ExperienceCardProps {
  experience: {
    id: string;
    title: string;
    description?: string;
    type: "lodging" | "trip" | "activity";
    city: string;
    region?: string;
    price_mad: number;
    currency?: string;
    rating?: number;
    reviews_count?: number;
    distance_km?: number;
    has_promo?: boolean;
    promo_badge?: string;
    thumbnail_url?: string;
    video_url?: string;
    host_name?: string;
    rooms?: RoomInfo[];
  };
  onSelect?: () => void;
  onBook?: () => void;
}

const typeLabels = {
  lodging: "Hébergement",
  trip: "Voyage",
  activity: "Activité",
};

export function ExperienceCard({
  experience,
  onSelect,
  onBook,
}: ExperienceCardProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPlaying(true);
    setTimeout(() => {
      videoRef.current?.play();
    }, 0);
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="relative aspect-video w-full group bg-muted">
        {isPlaying && experience.video_url ? (
          <video
            ref={videoRef}
            src={experience.video_url}
            className="w-full h-full object-cover"
            controls
            autoPlay
            playsInline
          >
            <track kind="captions" srcLang="fr" label="French captions" />
          </video>
        ) : (
          <>
            {experience.thumbnail_url ? (
              <Image
                src={getImageUrl(experience.thumbnail_url)!}
                alt={experience.title}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="w-full h-full bg-muted flex items-center justify-center">
                <span className="text-muted-foreground">Pas d'image</span>
              </div>
            )}

            {experience.video_url && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover:bg-black/20 transition-all">
                <button
                  type="button"
                  onClick={handlePlay}
                  className="w-16 h-16 rounded-full flex items-center justify-center bg-background/30 backdrop-blur-md border border-white/30 text-white hover:scale-110 transition-transform duration-300 hover:bg-background/40"
                >
                  <Play className="w-8 h-8 fill-white ml-1" />
                </button>
              </div>
            )}

            {experience.has_promo && experience.promo_badge && (
              <Badge className="absolute top-2 right-2 bg-orange-500 hover:bg-orange-600">
                {experience.promo_badge}
              </Badge>
            )}

            <Badge className="absolute top-2 left-2 bg-background/80 backdrop-blur-sm text-foreground">
              {typeLabels[experience.type]}
            </Badge>
          </>
        )}
      </div>

      <CardContent className="p-4 space-y-3">
        <div>
          <h3 className="font-semibold text-lg line-clamp-2">
            {experience.title}
          </h3>
          {experience.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
              {experience.description}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <MapPin className="w-4 h-4" />
            <span>{experience.city}</span>
          </div>

          {experience.rating && (
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span>{experience.rating.toFixed(1)}</span>
              {experience.reviews_count && experience.reviews_count > 0 && (
                <span className="text-xs">({experience.reviews_count})</span>
              )}
            </div>
          )}

          {experience.distance_km !== null &&
            experience.distance_km !== undefined && (
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                <span>{experience.distance_km.toFixed(1)} km</span>
              </div>
            )}
        </div>

        {experience.host_name && (
          <p className="text-xs text-muted-foreground">
            Par {experience.host_name}
          </p>
        )}

        {experience.type === "lodging" &&
          experience.rooms &&
          experience.rooms.length > 0 && (
            <div className="border-t pt-2 space-y-1">
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <DoorOpen className="w-3 h-3" />
                {experience.rooms.length} type
                {experience.rooms.length > 1 ? "s" : ""} de chambre
              </p>
              {experience.rooms.slice(0, 3).map((room) => (
                <div
                  key={`${room.name}-${room.type ?? "room"}`}
                  className="flex items-center justify-between gap-2 text-xs"
                >
                  <span className="flex items-center gap-1 text-muted-foreground min-w-0">
                    <BedDouble className="w-3 h-3" />
                    <span className="truncate">{room.name}</span>
                    {room.max_persons && (
                      <span className="text-[10px]">
                        ({room.max_persons} pers.)
                      </span>
                    )}
                  </span>
                  <span className="font-medium">{room.price_mad} MAD</span>
                </div>
              ))}
            </div>
          )}

        <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-2xl font-bold">{experience.price_mad} MAD</p>
            <p className="text-xs text-muted-foreground">
              {experience.type === "lodging" ? "par nuit" : "par personne"}
            </p>
          </div>

          <div className="flex w-full sm:w-auto gap-2">
            {onSelect && (
              <Button
                variant="outline"
                size="sm"
                onClick={onSelect}
                className="flex-1 sm:flex-none"
              >
                Détails
              </Button>
            )}
            {onBook && (
              <Button
                size="sm"
                onClick={onBook}
                className="flex-1 sm:flex-none"
              >
                Réserver
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
