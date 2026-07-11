"use client";

import parse from "html-react-parser";
import {
  Building2,
  ExternalLink,
  Globe,
  Mail,
  MapPin,
  Navigation,
  Pause,
  Phone,
  Play,
  Square,
  Star,
  User,
  Verified,
  Volume2,
  VolumeX,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useSiteI18n } from "@/components/site/site-i18n";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useGeoDistance } from "@/hooks/use-geo-distance";
import { useHlsVideo } from "@/hooks/use-hls-video";
import { useImageViewer } from "@/hooks/use-image-viewer";
import { ANALYTICS_EVENT } from "@/lib/analytics/events";
import { captureEvent } from "@/lib/analytics/posthog";
import { type AppLocale, getIntlLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { GuideItemChatCardData, GuideItemKind } from "@/types/guide-items";
import { getImageUrl } from "@/utils/functions";

interface GuideItemCardProps {
  item: GuideItemChatCardData;
  onSelect?: () => void;
  onShare?: () => void;
  onOpenImageViewer?: (
    images: string[],
    index: number,
    alts?: string[],
  ) => void;
}

interface VideoThumbnailPreviewProps {
  src: string;
  alt: string;
}

const GUIDE_ITEM_VIDEO_PLAY_EVENT = "travel-guide-item-video-play";

function getSourceLabel(sourceUrl: string): string {
  try {
    const url = new URL(sourceUrl);
    if (url.hostname.includes("instagram.com")) {
      const handle = url.pathname.split("/").filter(Boolean)[0];
      if (handle) return `@${handle}`;
    }

    return url.hostname.replace(/^www\./, "");
  } catch {
    return sourceUrl;
  }
}

function getPlatformLabel(platform: string): string {
  return platform
    .split(/[_-]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function formatReviewDate(value: string, locale: AppLocale): string {
  if (!value) return "";

  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? `${value}T00:00:00Z`
    : value;
  const date = new Date(normalized);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(getIntlLocale(locale), {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function getMetadataText(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  if (Array.isArray(value)) {
    const items = value.filter(
      (entry): entry is string =>
        typeof entry === "string" && entry.trim().length > 0,
    );
    return items.length > 0 ? items.join(" • ") : null;
  }

  if (value && typeof value === "object") {
    const summary = (value as Record<string, unknown>).summary;
    if (typeof summary === "string" && summary.trim()) {
      return summary.trim();
    }

    const today = (value as Record<string, unknown>).today;
    if (typeof today === "string" && today.trim()) {
      return today.trim();
    }
  }

  return null;
}

function getWhatsAppHref(phone: string, message: string): string {
  const digits = phone.replace(/\D+/g, "");
  const encodedMessage = encodeURIComponent(message);
  return digits
    ? `https://wa.me/${digits}?text=${encodedMessage}`
    : `https://wa.me/?text=${encodedMessage}`;
}

function InlineGuideItemVideoCard({
  src,
  alt,
  title,
  locale,
  isRtl,
  playLabel,
  pauseLabel,
  stopLabel,
  muteLabel,
  unmuteLabel,
  captionsLabel,
}: VideoThumbnailPreviewProps & {
  title: string;
  locale: AppLocale;
  isRtl: boolean;
  playLabel: string;
  pauseLabel: string;
  stopLabel: string;
  muteLabel: string;
  unmuteLabel: string;
  captionsLabel: string;
}) {
  const videoInstanceId = useId();
  const videoRef = useRef<HTMLVideoElement>(null);
  const shouldAutoPlayRef = useRef(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [hasFrame, setHasFrame] = useState(false);

  useHlsVideo(videoRef, src);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const tryRevealFirstFrame = () => {
      if (video.currentTime > 0) {
        setHasFrame(true);
        return;
      }

      const seekTime =
        Number.isFinite(video.duration) && video.duration > 0.1 ? 0.1 : 0;

      if (seekTime === 0) {
        setHasFrame(true);
        return;
      }

      try {
        video.currentTime = seekTime;
      } catch {
        setHasFrame(true);
      }
    };

    const handleSeeked = () => {
      setHasFrame(true);
      video.pause();
    };

    const handleError = () => {
      setHasFrame(false);
    };

    video.pause();
    video.addEventListener("loadeddata", tryRevealFirstFrame);
    video.addEventListener("canplay", tryRevealFirstFrame);
    video.addEventListener("seeked", handleSeeked);
    video.addEventListener("error", handleError);

    return () => {
      video.removeEventListener("loadeddata", tryRevealFirstFrame);
      video.removeEventListener("canplay", tryRevealFirstFrame);
      video.removeEventListener("seeked", handleSeeked);
      video.removeEventListener("error", handleError);
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => {
      setIsPlaying(true);
      shouldAutoPlayRef.current = false;
      window.dispatchEvent(
        new CustomEvent(GUIDE_ITEM_VIDEO_PLAY_EVENT, {
          detail: { id: videoInstanceId },
        }),
      );
      captureEvent(ANALYTICS_EVENT.VIDEO_PLAYED, {
        src,
        context: "chat_guide_item_card",
      });
    };

    const handlePause = () => {
      setIsPlaying(false);
      captureEvent(ANALYTICS_EVENT.VIDEO_PAUSED, {
        src,
        context: "chat_guide_item_card",
      });
    };

    const handleCanPlay = () => {
      if (!shouldAutoPlayRef.current) return;
      void video.play().catch(() => {
        setIsPlaying(false);
      });
    };

    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("canplay", handleCanPlay);

    return () => {
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("canplay", handleCanPlay);
    };
  }, [src, videoInstanceId]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleOtherVideoPlay = (event: Event) => {
      const detail = (event as CustomEvent<{ id?: string }>).detail;
      if (detail?.id === videoInstanceId) return;

      shouldAutoPlayRef.current = false;
      video.pause();
    };

    window.addEventListener(GUIDE_ITEM_VIDEO_PLAY_EVENT, handleOtherVideoPlay);

    return () => {
      window.removeEventListener(
        GUIDE_ITEM_VIDEO_PLAY_EVENT,
        handleOtherVideoPlay,
      );
    };
  }, [videoInstanceId]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = isMuted;
  }, [isMuted]);

  const handlePlayToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      shouldAutoPlayRef.current = true;
      void video.play().catch(() => {
        setIsPlaying(false);
      });
      return;
    }

    shouldAutoPlayRef.current = false;
    video.pause();
  };

  const handleStop = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const video = videoRef.current;
    if (!video) return;

    shouldAutoPlayRef.current = false;
    video.pause();

    const resetTime =
      Number.isFinite(video.duration) && video.duration > 0.1 ? 0.1 : 0;

    try {
      video.currentTime = resetTime;
      setHasFrame(true);
    } catch {
      setHasFrame(false);
    }
  };

  const handleMuteToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setIsMuted((prev) => {
      const next = !prev;
      captureEvent(
        next ? ANALYTICS_EVENT.VIDEO_MUTED : ANALYTICS_EVENT.VIDEO_UNMUTED,
        {
          src,
          context: "chat_guide_item_card",
        },
      );
      return next;
    });
  };

  return (
    <div className="relative h-full w-full overflow-hidden rounded-lg bg-muted group">
      <video
        ref={videoRef}
        className={cn(
          "absolute inset-0 h-full w-full transition-opacity duration-300",
          isPlaying ? "object-contain opacity-100" : "object-cover opacity-100",
        )}
        aria-label={alt}
        playsInline
        preload="auto"
        loop
        onLoadedData={(event) => {
          const video = event.currentTarget;

          if (video.currentTime > 0) {
            setHasFrame(true);
            return;
          }

          const seekTime =
            Number.isFinite(video.duration) && video.duration > 0.1 ? 0.1 : 0;

          if (seekTime === 0) {
            setHasFrame(true);
            return;
          }

          try {
            video.currentTime = seekTime;
          } catch {
            setHasFrame(true);
          }
        }}
        onSeeked={() => {
          setHasFrame(true);
        }}
        onError={() => {
          setHasFrame(false);
          captureEvent(ANALYTICS_EVENT.VIDEO_ERROR, {
            src,
            context: "chat_guide_item_card",
          });
        }}
      >
        <track kind="captions" srcLang={locale} label={captionsLabel} />
      </video>

      {!hasFrame && (
        <div className="absolute inset-0 flex h-full w-full items-center justify-center bg-muted">
          <Play className="h-8 w-8 text-muted-foreground" />
        </div>
      )}

      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/10 transition-all group-hover:bg-black/20 pointer-events-none z-10">
          <button
            type="button"
            onClick={handlePlayToggle}
            aria-label={playLabel}
            className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full border border-white/30 bg-background/30 text-white backdrop-blur-md transition-transform duration-300 hover:scale-105 hover:bg-background/40"
          >
            <Play
              className={cn(
                "h-7 w-7 fill-current",
                isRtl ? "mr-0.5" : "ml-0.5",
              )}
            />
          </button>
        </div>
      )}

      {isPlaying && (
        <button
          type="button"
          className="absolute inset-0 z-10 cursor-pointer"
          aria-label={pauseLabel}
          onClick={handlePlayToggle}
        />
      )}

      <div className="absolute bottom-2 right-2 z-20 flex items-center gap-2">
        <button
          type="button"
          onClick={handlePlayToggle}
          aria-label={isPlaying ? pauseLabel : playLabel}
          className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md transition-colors hover:bg-black/80"
        >
          {isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play
              className={cn(
                "h-4 w-4 fill-current",
                isRtl ? "mr-0.5" : "ml-0.5",
              )}
            />
          )}
        </button>

        <button
          type="button"
          onClick={handleStop}
          aria-label={stopLabel}
          className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md transition-colors hover:bg-black/80"
        >
          <Square className="h-4 w-4 fill-current" />
        </button>

        <button
          type="button"
          onClick={handleMuteToggle}
          aria-label={isMuted ? unmuteLabel : muteLabel}
          className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md transition-colors hover:bg-black/80"
        >
          {isMuted ? (
            <VolumeX className="h-4 w-4" />
          ) : (
            <Volume2 className="h-4 w-4" />
          )}
        </button>
      </div>

      <div className="absolute left-2 top-2 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-md">
        {title}
      </div>
    </div>
  );
}

export function GuideItemCard({ item, onOpenImageViewer }: GuideItemCardProps) {
  const { locale, t, dir } = useSiteI18n();
  const isRtl = dir === "rtl";
  const { openImageViewer: openLocalImageViewer, Viewer } = useImageViewer();
  const {
    isRequesting,
    requestPermission,
    getDistanceKm,
    errorReason: locationErrorReason,
  } = useGeoDistance();

  const [visibleReviewsCount, setVisibleReviewsCount] = useState(3);
  const [expandedReviewKeys, setExpandedReviewKeys] = useState<string[]>([]);
  const lastLocationErrorRef = useRef<string | null>(null);

  const kindLabels: Record<GuideItemKind, string> = {
    restaurant: t("chat.guideItemCard.kind.restaurant"),
    transport: t("chat.guideItemCard.kind.transport"),
    wellness: t("chat.guideItemCard.kind.wellness"),
    shopping: t("chat.guideItemCard.kind.shopping"),
    museum: t("chat.guideItemCard.kind.museum"),
    activity: t("chat.guideItemCard.kind.activity"),
    other: t("chat.guideItemCard.kind.other"),
  };

  const galleryImages = useMemo(
    () =>
      item.gallery_urls
        .map((url) => getImageUrl(url))
        .filter((url): url is string => Boolean(url)),
    [item.gallery_urls],
  );
  const menuImages = useMemo(
    () =>
      (item.menu_image_urls ?? [])
        .map((url) => getImageUrl(url))
        .filter((url): url is string => Boolean(url)),
    [item.menu_image_urls],
  );
  const videoGallery = item.video_gallery_url ?? [];
  const allVideos = useMemo(() => {
    const main = item.video_url ? [item.video_url] : [];
    return [...new Set([...main, ...videoGallery])];
  }, [item.video_url, videoGallery]);

  const distanceKm = useMemo(() => {
    if (
      item.lat == null ||
      item.lng == null ||
      typeof item.lat !== "number" ||
      typeof item.lng !== "number"
    ) {
      return null;
    }
    return getDistanceKm(item.lat, item.lng);
  }, [item.lat, item.lng, getDistanceKm]);

  useEffect(() => {
    if (!item.id) return;
    setVisibleReviewsCount(3);
    setExpandedReviewKeys([]);
  }, [item.id]);

  useEffect(() => {
    if (!locationErrorReason) {
      lastLocationErrorRef.current = null;
      return;
    }

    const errorMessage = t(`chat.location.errors.${locationErrorReason}`);
    if (lastLocationErrorRef.current === errorMessage) return;

    lastLocationErrorRef.current = errorMessage;
    toast.error(errorMessage);
  }, [locationErrorReason, t]);

  const galleryAlts = galleryImages.map((_, i) =>
    t("chat.guideItemCard.galleryAlt", { title: item.title, count: i + 1 }),
  );
  const menuImageAlts = menuImages.map((_, i) =>
    t("chat.guideItemCard.menuImageAlt", { title: item.title, count: i + 1 }),
  );

  const hasVideos = allVideos.length > 0;
  const sourceLabel = item.source_url ? getSourceLabel(item.source_url) : null;
  const contactAuthor =
    item.author_name ?? t("chat.guideItemCard.authorFallback");
  const whatsappMessage = t("chat.guideItemCard.whatsappMessage", {
    author: contactAuthor,
    title: item.title,
  });
  const openingHoursText = getMetadataText(
    item.metadata?.opening_hours ??
      item.metadata?.hours ??
      item.metadata?.hours_text,
  );
  const reviews = item.reviews?.filter((review) => review.content) ?? [];
  const visibleReviews = reviews.slice(0, visibleReviewsCount);
  const remainingReviewsCount = Math.max(
    0,
    reviews.length - visibleReviews.length,
  );

  const toggleExpandedReview = (reviewKey: string) => {
    setExpandedReviewKeys((prev) =>
      prev.includes(reviewKey)
        ? prev.filter((key) => key !== reviewKey)
        : [...prev, reviewKey],
    );
  };

  const openCardImageViewer = onOpenImageViewer ?? openLocalImageViewer;

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      {hasVideos && (
        <div className="px-4 pt-4">
          <div className="flex gap-3 overflow-x-auto snap-x scrollbar-hide">
            {allVideos.map((url, i) => (
              <div
                key={`${item.id}-video-${url}`}
                className="aspect-[9/16] w-[50vw] shrink-0 snap-start sm:w-[300px]"
              >
                <InlineGuideItemVideoCard
                  src={url}
                  alt={t("chat.guideItemCard.videoAlt", {
                    title: item.title,
                    count: i + 1,
                  })}
                  title={item.title}
                  locale={locale}
                  isRtl={isRtl}
                  playLabel={t("chat.guideItemCard.playVideo", {
                    title: item.title,
                  })}
                  pauseLabel={t("chat.guideItemCard.pauseVideo")}
                  stopLabel={t("chat.guideItemCard.stopVideo")}
                  muteLabel={t("chat.guideItemCard.muteVideo")}
                  unmuteLabel={t("chat.guideItemCard.unmuteVideo")}
                  captionsLabel={t("chat.guideItemCard.captionsLabel")}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Image gallery */}
      {galleryImages.length > 0 && (
        <div className="flex gap-2 p-4 pb-0 overflow-x-auto snap-x scrollbar-hide">
          {galleryImages.map((imgUrl, i) => (
            <button
              type="button"
              key={`${item.id}-img-${imgUrl}`}
              className="relative w-16 h-16 rounded-md overflow-hidden flex-shrink-0 snap-start bg-muted cursor-pointer"
              aria-label={t("chat.guideItemCard.openGalleryImage", {
                title: item.title,
                count: i + 1,
              })}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                openCardImageViewer(galleryImages, i, galleryAlts);
              }}
            >
              <Image
                src={imgUrl}
                alt={t("chat.guideItemCard.galleryAlt", {
                  title: item.title,
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
            {item.title}
          </h3>
          {item.summary && (
            <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 mt-1">
              {item.summary}
            </p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant="secondary">
              {kindLabels[item.kind_slug] ?? item.kind_slug}
            </Badge>
            {item.verified && (
              <Badge variant="secondary" className="gap-1">
                <Verified className="h-3 w-3" />
                {t("chat.guideItemCard.verified")}
              </Badge>
            )}
            {item.rating_avg != null && (
              <span className="inline-flex items-center gap-1 rounded-full border bg-muted/40 px-2.5 py-1 text-xs font-medium text-foreground">
                <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                {item.rating_avg.toFixed(1)}
                {item.reviews_count > 0 && (
                  <span className="text-muted-foreground">
                    ({item.reviews_count})
                  </span>
                )}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {(item.author_name || item.author_avatar_url) && (
            <div className="flex items-center gap-2 rounded-full border bg-muted/40 px-2.5 py-1">
              {item.author_avatar_url ? (
                <Image
                  src={getImageUrl(item.author_avatar_url) ?? ""}
                  alt={item.author_name ?? ""}
                  width={24}
                  height={24}
                  className="rounded-full object-cover"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                  <User className="w-3 h-3" />
                </div>
              )}
              <span>
                {t("chat.guideItemCard.authorPrefix", {
                  author:
                    item.author_name ?? t("chat.guideItemCard.authorFallback"),
                })}
              </span>
            </div>
          )}

          {item.agence_name && (
            <div className="inline-flex items-center gap-1 rounded-full border bg-muted/40 px-2.5 py-1">
              <Building2 className="h-3.5 w-3.5" />
              <span>{item.agence_name}</span>
            </div>
          )}

          {item.source_platforms?.map((platform) => (
            <Badge key={platform} variant="outline" className="text-[10px]">
              {getPlatformLabel(platform)}
            </Badge>
          ))}

          {sourceLabel && item.source_url && (
            <Link
              href={item.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-full border bg-muted/40 px-2.5 py-1 hover:text-foreground"
            >
              <Globe className="h-3.5 w-3.5" />
              <span>{sourceLabel}</span>
              <ExternalLink className="h-3 w-3" />
            </Link>
          )}
        </div>

        {item.description && (
          <div className="text-xs sm:text-sm text-muted-foreground line-clamp-4">
            {parse(item.description)}
          </div>
        )}

        <div className="rounded-xl border bg-muted/30 p-3 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2 text-xs sm:text-sm text-muted-foreground">
              <div className="mt-0.5 rounded-md bg-background p-1.5">
                <MapPin className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <p className="font-medium text-foreground">{item.city_slug}</p>
                {item.address_text && (
                  <p className="line-clamp-2">{item.address_text}</p>
                )}
              </div>
            </div>

            {distanceKm != null ? (
              <div className="inline-flex items-center gap-1 rounded-full bg-background px-2.5 py-1 text-xs text-foreground">
                <Navigation className="w-3.5 h-3.5" />
                <span>
                  {t("chat.guideItemCard.distanceKm", {
                    value: distanceKm.toFixed(1),
                  })}
                </span>
              </div>
            ) : item.lat != null && item.lng != null ? (
              <button
                type="button"
                onClick={requestPermission}
                disabled={isRequesting}
                className="inline-flex items-center gap-1 rounded-full bg-background px-2.5 py-1 text-xs text-primary hover:underline disabled:opacity-50 disabled:no-underline"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>{t("chat.guideItemCard.showDistance")}</span>
              </button>
            ) : null}
          </div>

          {openingHoursText && (
            <div className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">
                {t("chat.guideItemCard.hours")}:
              </span>{" "}
              {openingHoursText}
            </div>
          )}
        </div>

        {(item.contact_email || (item.contact_phones?.length ?? 0) > 0) && (
          <div className="space-y-2">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              {t("chat.guideItemCard.contact")}
            </p>
            <div className="flex flex-wrap gap-2">
              {item.contact_email && (
                <Link
                  href={`mailto:${item.contact_email}`}
                  className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  <Mail className="h-3.5 w-3.5" />
                  <span>{item.contact_email}</span>
                </Link>
              )}
              {item.contact_phones?.map((phone) => (
                <Link
                  key={phone}
                  href={getWhatsAppHref(phone, whatsappMessage)}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={t("chat.guideItemCard.openWhatsApp", {
                    phone,
                  })}
                  className="inline-flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-3 py-1.5 text-xs text-green-700 transition-colors hover:bg-green-100 hover:text-green-800"
                >
                  <Phone className="h-3.5 w-3.5" />
                  <span>{phone}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {(item.price_range || item.payment) && (
          <div className="rounded-xl border bg-muted/30 p-3">
            {item.price_range && (
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                    {t("chat.guideItemCard.price")}
                  </p>
                  <p className="text-xl sm:text-2xl font-bold">
                    {item.price_range}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">{item.currency}</p>
              </div>
            )}

            {item.payment && (
              <p
                className={cn(
                  "text-xs text-muted-foreground",
                  item.price_range && "mt-2",
                )}
              >
                <span className="font-medium text-foreground">
                  {t("chat.guideItemCard.payment")}:
                </span>{" "}
                {item.payment}
              </p>
            )}
          </div>
        )}

        {menuImages.length > 0 && (
          <div className="space-y-2">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              {t("chat.guideItemCard.menu")}
            </p>
            <div className="flex gap-2 overflow-x-auto snap-x scrollbar-hide">
              {menuImages.map((imgUrl, i) => (
                <button
                  type="button"
                  key={`${item.id}-menu-${imgUrl}`}
                  className="relative h-28 w-24 shrink-0 snap-start overflow-hidden rounded-lg border bg-muted"
                  aria-label={t("chat.guideItemCard.openMenuImage", {
                    title: item.title,
                    count: i + 1,
                  })}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    openCardImageViewer(menuImages, i, menuImageAlts);
                  }}
                >
                  <Image
                    src={imgUrl}
                    alt={t("chat.guideItemCard.menuImageAlt", {
                      title: item.title,
                      count: i + 1,
                    })}
                    fill
                    className="object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        {item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {item.tags.slice(0, 6).map((tag) => (
              <Badge
                key={tag}
                variant="outline"
                className="text-[10px] px-2 py-0"
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {(item.rating_avg != null ||
          visibleReviews.length > 0 ||
          item.reviews_count > 0) && (
          <div className="space-y-3 rounded-xl border bg-muted/20 p-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  {t("chat.guideItemCard.reviews")}
                </p>
                {item.rating_avg != null ? (
                  <div className="mt-1 flex items-end gap-2">
                    <span className="text-3xl font-semibold leading-none">
                      {item.rating_avg.toFixed(1)}
                    </span>
                    <div className="pb-1">
                      <div className="flex items-center gap-0.5 text-yellow-500">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={cn(
                              "h-3.5 w-3.5",
                              star <= Math.round(item.rating_avg ?? 0)
                                ? "fill-current"
                                : "",
                            )}
                          />
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {t("chat.guideItemCard.reviewsCount", {
                          count: item.reviews_count,
                        })}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t("chat.guideItemCard.reviewsCount", {
                      count: item.reviews_count,
                    })}
                  </p>
                )}
              </div>

              {item.verified && (
                <Badge variant="secondary" className="gap-1">
                  <Verified className="w-3 h-3" />
                  {t("chat.guideItemCard.verified")}
                </Badge>
              )}
            </div>

            {visibleReviews.map((review, index) => {
              const reviewKey = `${item.id}-review-${review.name}-${review.created_at}-${index}`;
              const isReviewExpanded = expandedReviewKeys.includes(reviewKey);
              const canExpandReview = review.content.trim().length > 180;

              return (
                <div
                  key={reviewKey}
                  className="rounded-lg border bg-background/80 p-3 space-y-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      {review.user_image ? (
                        <Image
                          src={getImageUrl(review.user_image) ?? ""}
                          alt={review.name}
                          width={32}
                          height={32}
                          className="h-8 w-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                          <User className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}

                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                          {review.name}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {[
                            review.source,
                            formatReviewDate(review.created_at, locale),
                          ]
                            .filter(Boolean)
                            .join(" • ")}
                        </p>
                      </div>
                    </div>

                    {review.note != null && (
                      <div className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs font-medium">
                        <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                        <span>{review.note.toFixed(1)}</span>
                      </div>
                    )}
                  </div>

                  <p
                    className={cn(
                      "text-sm text-muted-foreground",
                      !isReviewExpanded && "line-clamp-4",
                    )}
                  >
                    {review.content}
                  </p>

                  {canExpandReview && (
                    <button
                      type="button"
                      onClick={() => toggleExpandedReview(reviewKey)}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      {isReviewExpanded
                        ? t("chat.guideItemCard.readLess")
                        : t("chat.guideItemCard.readMore")}
                    </button>
                  )}

                  {review.tags && review.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {review.tags.slice(0, 4).map((tag) => (
                        <Badge
                          key={tag}
                          variant="outline"
                          className="text-[10px] px-2 py-0"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {remainingReviewsCount > 0 && (
              <button
                type="button"
                onClick={() =>
                  setVisibleReviewsCount((prev) =>
                    Math.min(prev + 3, reviews.length),
                  )
                }
                className="w-full rounded-lg border border-dashed px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-background/70"
              >
                {t("chat.guideItemCard.showMoreReviews", {
                  count: Math.min(3, remainingReviewsCount),
                })}
              </button>
            )}
          </div>
        )}

        <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex w-full sm:w-auto gap-2">
            {/* {onSelect ? (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect();
                }}
                className="flex-1 sm:flex-none"
              >
                {t("chat.guideItemCard.details")}
              </Button>
            ) : (
              <Button
                asChild
                variant="outline"
                size="sm"
                className="flex-1 sm:flex-none"
              >
                <Link
                  href={detailHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                >
                  {t("chat.guideItemCard.details")}
                </Link>
              </Button>
            )}

            {onShare && (
              <Button
                size="sm"
                variant="secondary"
                onClick={(e) => {
                  e.stopPropagation();
                  onShare();
                }}
                className="flex-1 sm:flex-none"
              >
                <Share2 className="w-4 h-4" />
              </Button>
            )} */}
          </div>
        </div>
      </CardContent>
      {!onOpenImageViewer && Viewer}
    </Card>
  );
}
