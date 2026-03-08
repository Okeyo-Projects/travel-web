"use client";

import { formatDistanceToNow } from "date-fns";
import {
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Heart,
  MapPin,
  MessageCircle,
  Send,
  Share2,
  Star,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useRequiredAuth } from "@/hooks/use-required-auth";
import { useExperienceSocial } from "@/hooks/use-social";
import { localizeHref } from "@/lib/routing/locale-path";
import { buildExperienceSlug } from "@/lib/routing/slugs";
import { cn } from "@/lib/utils";
import type { ExperienceListItem } from "@/types/experience";
import { getImageUrl } from "@/utils/functions";

type ExperienceDetailModalProps = {
  open: boolean;
  experiences: ExperienceListItem[];
  startIndex: number;
  onClose: () => void;
};

type ModalMediaItem =
  | { type: "video"; src: string }
  | { type: "image"; src: string };

function formatPrice(experience: ExperienceListItem) {
  const cents =
    experience.trip?.price_cents ??
    experience.lodging?.price_cents ??
    experience.rooms?.find((room) => room.price_cents)?.price_cents;

  return cents != null ? `${Math.round(cents / 100)} MAD` : "Sur demande";
}

export function ExperienceDetailModal({
  open,
  experiences,
  startIndex,
  onClose,
}: ExperienceDetailModalProps) {
  const [activeIndex, setActiveIndex] = useState(startIndex);
  const [comment, setComment] = useState("");
  const pathname = usePathname();
  const { requireAuth } = useRequiredAuth();

  useEffect(() => {
    if (open) {
      setActiveIndex(startIndex);
    }
  }, [open, startIndex]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") {
        setActiveIndex((value) => Math.min(experiences.length - 1, value + 1));
      }
      if (event.key === "ArrowLeft") {
        setActiveIndex((value) => Math.max(0, value - 1));
      }
    };

    window.addEventListener("keydown", onKeydown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeydown);
    };
  }, [open, onClose, experiences.length]);

  const currentExperience = experiences[activeIndex];

  const mediaItems = useMemo<ModalMediaItem[]>(() => {
    if (!currentExperience) return [];
    const items: ModalMediaItem[] = [];

    if (currentExperience.video_url || currentExperience.video_hls_url) {
      items.push({
        type: "video",
        src: currentExperience.video_url ?? currentExperience.video_hls_url ?? "",
      });
    }

    const thumbnail = currentExperience.thumbnail_url
      ? getImageUrl(currentExperience.thumbnail_url)
      : null;
    if (thumbnail) {
      items.push({ type: "image", src: thumbnail });
    }

    for (const room of currentExperience.rooms ?? []) {
      for (const image of room.photo_urls ?? []) {
        if (!items.some((item) => item.src === image)) {
          items.push({ type: "image", src: image });
        }
      }
    }

    return items;
  }, [currentExperience]);

  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  useEffect(() => {
    setActiveMediaIndex(0);
  }, [currentExperience?.id]);

  const social = useExperienceSocial(currentExperience?.id ?? null);

  if (!open || !currentExperience) {
    return null;
  }

  const slug = buildExperienceSlug({
    title: currentExperience.title,
    id: currentExperience.id,
  });
  const detailsHref = localizeHref(`/experience/${slug}`, pathname);
  const bookingHref = localizeHref(`/experience/${slug}?booking=1`, pathname);

  const currentMedia = mediaItems[activeMediaIndex];
  const locationLabel = currentExperience.region
    ? `${currentExperience.city}, ${currentExperience.region}`
    : currentExperience.city;
  const likesCount = social.likesCount;
  const reviewText =
    currentExperience.avg_rating != null
      ? `${currentExperience.avg_rating.toFixed(1)}${currentExperience.reviews_count ? ` (${currentExperience.reviews_count})` : ""}`
      : "Nouveau";

  const handleShare = async () => {
    const url = typeof window !== "undefined" ? `${window.location.origin}${detailsHref}` : detailsHref;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Lien copié");
      void social.trackShare.mutateAsync("link").catch(() => undefined);
    } catch {
      toast.error("Impossible de copier le lien");
    }
  };

  return (
    <div className="fixed inset-0 z-[130] bg-black/70 backdrop-blur-sm">
      <button
        type="button"
        className="absolute inset-0"
        onClick={onClose}
        aria-label="Close detail modal"
      />

      <div className="absolute inset-0 flex items-center justify-center p-0 md:p-4">
        <div className="relative h-full w-full overflow-hidden bg-white md:h-[92vh] md:max-w-6xl md:rounded-3xl">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 z-40 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="grid h-full grid-cols-1 md:grid-cols-[minmax(0,1.2fr)_minmax(360px,1fr)]">
            <div className="relative flex h-[42vh] items-center justify-center bg-black md:h-full">
              {currentMedia?.type === "video" ? (
                <video
                  key={currentMedia.src}
                  src={currentMedia.src}
                  autoPlay
                  muted
                  loop
                  playsInline
                  controls
                  className="h-full w-full object-cover md:object-contain"
                />
              ) : currentMedia?.src ? (
                <Image
                  src={currentMedia.src}
                  alt={currentExperience.title}
                  fill
                  className="object-cover md:object-contain"
                />
              ) : (
                <div className="text-sm text-white/70">Media unavailable</div>
              )}

              {mediaItems.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setActiveMediaIndex((value) => Math.max(0, value - 1))
                    }
                    disabled={activeMediaIndex === 0}
                    className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/55 p-2 text-white disabled:opacity-40"
                    aria-label="Previous media"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setActiveMediaIndex((value) =>
                        Math.min(mediaItems.length - 1, value + 1),
                      )
                    }
                    disabled={activeMediaIndex === mediaItems.length - 1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/55 p-2 text-white disabled:opacity-40"
                    aria-label="Next media"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              )}
            </div>

            <div className="flex h-[58vh] flex-col md:h-full">
              <div className="flex flex-1 flex-col overflow-y-auto p-5 md:p-6">
                <div className="space-y-3">
                  <h2 className="text-2xl font-semibold text-gray-900">
                    {currentExperience.title}
                  </h2>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {locationLabel}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                      {reviewText}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-gray-600">
                    {currentExperience.short_description}
                  </p>
                </div>

                <div className="mt-5 grid grid-cols-4 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="gap-2"
                    onClick={() =>
                      requireAuth(
                        async () =>
                          social.toggleLike.mutateAsync(social.likedByUser),
                        { mode: "login" },
                      )
                    }
                  >
                    <Heart
                      className={cn(
                        "h-4 w-4 transition-transform",
                        social.likedByUser &&
                          "fill-rose-500 text-rose-500 scale-110",
                      )}
                    />
                    <span>{likesCount}</span>
                  </Button>
                  <Button type="button" variant="outline" className="gap-2">
                    <MessageCircle className="h-4 w-4" />
                    <span>{social.comments.length}</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="gap-2"
                    onClick={handleShare}
                  >
                    <Share2 className="h-4 w-4" />
                    <span>Share</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="gap-2"
                    onClick={() =>
                      requireAuth(
                        async () =>
                          social.toggleSave.mutateAsync(social.savedByUser),
                        { mode: "login" },
                      )
                    }
                  >
                    <Bookmark
                      className={cn(
                        "h-4 w-4",
                        social.savedByUser && "fill-gray-900 text-gray-900",
                      )}
                    />
                    <span>Save</span>
                  </Button>
                </div>

                <div className="mt-5 rounded-xl border bg-gray-50 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">À partir de</span>
                    <span className="text-xl font-semibold text-gray-900">
                      {formatPrice(currentExperience)}
                    </span>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button asChild className="flex-1">
                      <Link href={bookingHref}>Book now</Link>
                    </Button>
                    <Button asChild variant="outline" className="flex-1">
                      <Link href={detailsHref}>View details</Link>
                    </Button>
                  </div>
                </div>

                <div className="mt-5">
                  <h3 className="text-sm font-semibold text-gray-900">
                    Comments
                  </h3>
                  <div className="mt-3 space-y-3">
                    {social.commentsLoading ? (
                      <p className="text-sm text-gray-500">Loading comments...</p>
                    ) : social.comments.length === 0 ? (
                      <p className="text-sm text-gray-500">
                        No comments yet. Start the conversation.
                      </p>
                    ) : (
                      social.comments.map((item) => (
                        <div
                          key={item.id}
                          className="rounded-lg border border-gray-200 p-3"
                        >
                          <div className="mb-2 flex items-center gap-2">
                            <Avatar className="h-7 w-7">
                              <AvatarImage src={item.author?.avatar_url ?? undefined} />
                              <AvatarFallback>
                                {(item.author?.display_name ?? "U").slice(0, 1)}
                              </AvatarFallback>
                            </Avatar>
                            <p className="text-xs font-medium text-gray-800">
                              {item.author?.display_name ?? "Utilisateur"}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatDistanceToNow(new Date(item.created_at), {
                                addSuffix: true,
                              })}
                            </p>
                          </div>
                          <p className="text-sm text-gray-700">{item.text}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="border-t p-4">
                <div className="flex items-center gap-2">
                  <input
                    value={comment}
                    onChange={(event) => setComment(event.target.value)}
                    placeholder="Add a comment..."
                    className="h-10 flex-1 rounded-full border border-gray-200 px-4 text-sm outline-none focus:border-[#ff2566]"
                  />
                  <Button
                    type="button"
                    size="icon"
                    onClick={() =>
                      requireAuth(
                        async () => {
                          await social.addComment.mutateAsync(comment);
                          setComment("");
                        },
                        { mode: "login" },
                      )
                    }
                    disabled={!comment.trim() || social.addComment.isPending}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setActiveIndex((value) => Math.max(0, value - 1))}
            disabled={activeIndex === 0}
            className="absolute left-4 top-1/2 hidden -translate-y-1/2 rounded-full bg-black/55 p-2 text-white disabled:opacity-40 md:block"
            aria-label="Previous experience"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={() =>
              setActiveIndex((value) => Math.min(experiences.length - 1, value + 1))
            }
            disabled={activeIndex === experiences.length - 1}
            className="absolute right-4 top-1/2 hidden -translate-y-1/2 rounded-full bg-black/55 p-2 text-white disabled:opacity-40 md:block"
            aria-label="Next experience"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </div>
      </div>
    </div>
  );
}
