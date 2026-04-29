import { BedDouble, DoorOpen, MapPin, Play, Star, Users } from "lucide-react";
import parse from "html-react-parser";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useSiteI18n } from "@/components/site/site-i18n";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useHlsVideo } from "@/hooks/use-hls-video";
import { ANALYTICS_EVENT } from "@/lib/analytics/events";
import { captureEvent } from "@/lib/analytics/posthog";
import { useImageViewer } from "@/hooks/use-image-viewer";
import { getIntlLocale } from "@/lib/i18n";
import { localizeHref } from "@/lib/routing/locale-path";
import { buildExperienceHref } from "@/lib/routing/slugs";
import { cn } from "@/lib/utils";
import { prepareExperienceRichText } from "@/lib/experience-rich-text";
import { getImageUrl, IMAGE_BLUR_DATA_URL } from "@/utils/functions";

interface RoomInfo {
  name: string;
  type?: string;
  price_mad: number;
  capacity_beds?: number;
  max_persons?: number;
  photos?: string[];
}

interface ExperienceCardProps {
  experience: {
    id: string;
    title: string;
    description?: string;
    type: "lodging" | "trip" | "activity";
    city: string;
    slug?: string | null;
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
    video_hls_url?: string;
    host_name?: string;
    rooms?: RoomInfo[];
    gallery?: string[];
  };
  onSelect?: () => void;
  onBook?: () => void;
}

export function ExperienceCard({
  experience,
  onSelect,
  onBook,
}: ExperienceCardProps) {
  const { locale, t, dir } = useSiteI18n();
  const isRtl = dir === "rtl";
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { openImageViewer, Viewer } = useImageViewer();
  const pathname = usePathname();
  const experienceHref = localizeHref(
    buildExperienceHref({ title: experience.title, id: experience.id, slug: experience.slug, region: experience.region, city: experience.city }),
    pathname,
  );
  const intlLocale = getIntlLocale(locale);
  const galleryImages = experience.gallery ?? [];
  const thumbnailSrc = experience.thumbnail_url
    ? getImageUrl(experience.thumbnail_url)
    : null;
  const typeLabels = {
    lodging: t("chat.experienceCard.type.lodging"),
    trip: t("chat.experienceCard.type.trip"),
    activity: t("chat.experienceCard.type.activity"),
  };
  const formatMad = (value: number) =>
    new Intl.NumberFormat(intlLocale, {
      style: "currency",
      currency: "MAD",
      maximumFractionDigits: 0,
    }).format(value);

  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsPlaying((prev) => !prev);
  };

  useHlsVideo(
    videoRef,
    experience.video_hls_url ?? experience.video_url ?? null,
  );

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      void video.play().catch(() => {
        setIsPlaying(false);
      });
    } else {
      video.pause();
    }
  }, [isPlaying]);

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div
        className={`mx-auto sm:mx-4 rounded-t-lg sm:rounded-sm overflow-hidden relative w-[50vw] sm:w-[300px] group bg-muted ${experience.video_url ? "aspect-[9/16]" : "aspect-video"}`}
      >
        {(experience.video_hls_url || experience.video_url) && (
          <video
            ref={videoRef}
            className={cn(
              "w-full h-full object-contain",
              isPlaying ? "block" : "hidden",
            )}
            playsInline
            loop
            muted
            preload="none"
            onError={() => {
              captureEvent(ANALYTICS_EVENT.VIDEO_ERROR, {
                src: experience.video_hls_url ?? experience.video_url,
                context: "chat_experience_card",
              });
            }}
          >
            <track
              kind="captions"
              srcLang={locale}
              label={t("chat.experienceCard.captionsLabel")}
            />
          </video>
        )}
        <div
          className={cn(
            "absolute inset-0 transition-opacity duration-300",
            isPlaying ? "opacity-0" : "opacity-100",
          )}
        >
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
            <div className="w-full h-full bg-muted flex items-center justify-center">
              <span className="text-muted-foreground">
                {t("chat.experienceCard.noImage")}
              </span>
            </div>
          )}
        </div>

        {!isPlaying && (experience.video_hls_url || experience.video_url) && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover:bg-black/20 transition-all pointer-events-none z-10">
            <button
              type="button"
              onClick={handlePlay}
              className="pointer-events-auto w-16 h-16 rounded-full flex items-center justify-center bg-background/30 backdrop-blur-md border border-white/30 text-white hover:scale-110 transition-transform duration-300 hover:bg-background/40"
            >
              <Play
                className={cn("w-8 h-8 fill-white", isRtl ? "mr-1" : "ml-1")}
              />
            </button>
          </div>
        )}

        {/* Click area to toggle video playback when playing */}
        {isPlaying && (
          <button
            type="button"
            className="absolute inset-0 z-10 cursor-pointer"
            aria-label={t("chat.experienceCard.pauseVideo")}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handlePlay(e);
            }}
          />
        )}

        {experience.has_promo && experience.promo_badge && (
          <Badge
            className={cn(
              "absolute top-2 bg-orange-500 hover:bg-orange-600 z-20",
              isRtl ? "left-2" : "right-2",
            )}
          >
            {experience.promo_badge}
          </Badge>
        )}

        <Badge
          className={cn(
            "absolute top-2 bg-background/80 backdrop-blur-sm text-foreground z-20",
            isRtl ? "right-2" : "left-2",
          )}
        >
          {typeLabels[experience.type]}
        </Badge>
      </div>

      {/* Horizontal Gallery */}
      {galleryImages.length > 0 && (
        <div className="flex gap-2 p-4 pb-0 overflow-x-auto snap-x scrollbar-hide">
          {galleryImages.map((imgUrl, i) => (
            <button
              type="button"
              key={`${experience.id}-${imgUrl}`}
              className="relative w-16 h-16 rounded-md overflow-hidden flex-shrink-0 snap-start bg-muted cursor-pointer"
              aria-label={t("chat.experienceCard.openGalleryImage", {
                title: experience.title,
                count: i + 1,
              })}
              onClick={() => openImageViewer(galleryImages, i)}
            >
              <Image
                src={imgUrl}
                alt={t("chat.experienceCard.galleryAlt", {
                  title: experience.title,
                  count: i + 1,
                })}
                fill
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}

      <CardContent className="p-4 space-y-3">
        <div>
          <h3 className="font-semibold text-base sm:text-lg line-clamp-2">
            {experience.title}
          </h3>
          {experience.description && (
            <div className="text-xs sm:text-sm text-muted-foreground line-clamp-2 mt-1">
              {parse(prepareExperienceRichText(experience.description).html)}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-3 sm:gap-x-4 gap-y-1 text-xs sm:text-sm text-muted-foreground">
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
            {t("chat.experienceCard.hostPrefix", {
              host: experience.host_name,
            })}
          </p>
        )}

        {experience.type === "lodging" &&
          experience.rooms &&
          experience.rooms.length > 0 && (
            <div className="border-t pt-2 space-y-1">
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <DoorOpen className="w-3 h-3" />
                {experience.rooms.length === 1
                  ? t("chat.experienceCard.roomTypesCount.one", {
                      count: experience.rooms.length,
                    })
                  : t("chat.experienceCard.roomTypesCount.other", {
                      count: experience.rooms.length,
                    })}
              </p>
              {experience.rooms.slice(0, 3).map((room) => {
                const roomPhotos = room.photos ?? [];

                return (
                  <div
                    key={`${room.name}-${room.type ?? "room"}`}
                    className="flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="flex items-center gap-2 text-muted-foreground min-w-0">
                      {roomPhotos.length > 0 ? (
                        <button
                          type="button"
                          className="relative w-8 h-8 flex-shrink-0 rounded overflow-hidden bg-muted cursor-pointer"
                          aria-label={t("chat.experienceCard.openRoomPhoto", {
                            room: room.name,
                          })}
                          onClick={() => openImageViewer(roomPhotos, 0)}
                        >
                          <Image
                            src={roomPhotos[0]}
                            alt={room.name}
                            fill
                            className="object-cover"
                          />
                        </button>
                      ) : (
                        <BedDouble className="w-4 h-4 flex-shrink-0" />
                      )}
                      <span className="truncate flex-1">{room.name}</span>
                      {room.max_persons && (
                        <span className="text-[10px] flex-shrink-0">
                          ({room.max_persons}{" "}
                          {t("chat.experienceCard.guestAbbr")})
                        </span>
                      )}
                    </div>
                    <span className="font-medium flex-shrink-0">
                      {formatMad(room.price_mad)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

        <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xl sm:text-2xl font-bold">
              {formatMad(experience.price_mad)}
            </p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              {experience.type === "lodging"
                ? t("chat.experienceCard.pricePerNight")
                : t("chat.experienceCard.pricePerPerson")}
            </p>
          </div>

          <div className="flex w-full sm:w-auto gap-2">
            {onSelect ? (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect();
                }}
                className="flex-1 sm:flex-none"
              >
                {t("chat.experienceCard.details")}
              </Button>
            ) : (
              <Button
                asChild
                variant="outline"
                size="sm"
                className="flex-1 sm:flex-none"
              >
                <Link
                  href={experienceHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                >
                  {t("chat.experienceCard.details")}
                </Link>
              </Button>
            )}
            {onBook && (
              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onBook();
                }}
                className="flex-1 sm:flex-none"
              >
                {t("chat.experienceCard.book")}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
      {Viewer}
    </Card>
  );
}
