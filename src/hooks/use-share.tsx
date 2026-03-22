"use client";

import {
  Check,
  Copy,
  Facebook,
  Link2,
  type LucideIcon,
  MapPin,
  MessageCircle,
  Share2,
  Twitter,
  X,
} from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { ANALYTICS_EVENT } from "@/lib/analytics/events";
import { captureEvent } from "@/lib/analytics/posthog";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { SharePlatform } from "@/types/social";

type ShareTarget = {
  platform: Exclude<SharePlatform, "link" | "other">;
  label: string;
  subtitle: string;
  icon: LucideIcon;
  iconClassName: string;
  href: string;
};

type UseShareOptions = {
  title: string;
  url: string;
  description?: string | null;
  locationLabel?: string | null;
  previewImageUrl?: string | null;
  experienceId?: string | null;
  source?: string;
};

type ShareDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string | null;
  locationLabel?: string | null;
  previewImageUrl?: string | null;
  shareUrl: string;
  copied: boolean;
  shareTargets: ShareTarget[];
  onCopy: () => void | Promise<void>;
  onShareTarget: (target: ShareTarget) => void;
};

function ShareDialog({
  open,
  onOpenChange,
  title,
  description,
  locationLabel,
  previewImageUrl,
  shareUrl,
  copied,
  shareTargets,
  onCopy,
  onShareTarget,
}: ShareDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] flex-col gap-0 overflow-hidden border-0 p-0 shadow-2xl sm:max-h-[calc(100dvh-2rem)] sm:max-w-xl"
      >
        <div className="relative shrink-0 overflow-hidden bg-slate-950 px-4 pb-4 pt-4 text-white sm:px-5 sm:pb-5 sm:pt-5">
          {previewImageUrl ? (
            <Image
              src={previewImageUrl}
              alt={title}
              fill
              className="object-cover opacity-30"
            />
          ) : (
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(251,113,133,0.45),_transparent_42%),radial-gradient(circle_at_bottom_right,_rgba(59,130,246,0.35),_transparent_38%),linear-gradient(135deg,_#0f172a,_#020617)]" />
          )}

          <div className="absolute inset-0 bg-gradient-to-br from-slate-950/95 via-slate-950/80 to-rose-950/60" />

          <div className="relative flex items-start justify-between gap-3 sm:gap-4">
            <div className="flex min-w-0 items-start gap-4">
              <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-[20px] border border-white/15 bg-white/10">
                {previewImageUrl ? (
                  <Image
                    src={previewImageUrl}
                    alt={title}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-white/10">
                    <Share2 className="h-6 w-6 text-white/70" />
                  </div>
                )}
              </div>

              <div className="min-w-0 space-y-2 pr-1">
                <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-white/55">
                  Share Experience
                </p>
                <DialogTitle className="line-clamp-2 text-xl leading-tight font-semibold text-white sm:text-2xl">
                  {title}
                </DialogTitle>
                {locationLabel ? (
                  <div className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-sm text-white/80 backdrop-blur">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{locationLabel}</span>
                  </div>
                ) : null}
              </div>
            </div>

            <DialogClose className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white/70 transition-colors hover:bg-white/15 hover:text-white">
              <X className="h-4 w-4" />
              <span className="sr-only">Close share modal</span>
            </DialogClose>
          </div>
        </div>

        <div className="min-h-0 space-y-5 overflow-y-auto p-4 sm:p-5">
          <div className="space-y-1">
            <DialogDescription className="text-sm leading-6 text-slate-500">
              {description?.trim()
                ? description
                : "Send it to someone, post it to social media, or copy the link for later."}
            </DialogDescription>
          </div>

          <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 sm:grid-cols-3">
            {shareTargets.map((target) => {
              const Icon = target.icon;

              return (
                <Button
                  key={target.platform}
                  type="button"
                  variant="outline"
                  className="h-auto w-full min-w-0 flex-col items-start rounded-2xl border-slate-200 px-4 py-4 text-left shadow-none transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50"
                  onClick={() => onShareTarget(target)}
                >
                  <span
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-2xl",
                      target.iconClassName,
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="mt-3 text-sm font-semibold text-slate-900">
                    {target.label}
                  </span>
                  <span className="mt-1 text-xs text-slate-500">
                    {target.subtitle}
                  </span>
                </Button>
              );
            })}
          </div>

          <div className="space-y-2 pb-1">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-slate-700">
                Direct link
              </span>
              <span className="hidden text-xs text-slate-400 sm:inline">
                Anyone with the link can view it
              </span>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-2">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl bg-white px-3 py-3 ring-1 ring-slate-100">
                  <Link2 className="h-4 w-4 shrink-0 text-slate-400" />
                  <span className="truncate text-sm text-slate-600">
                    {shareUrl}
                  </span>
                </div>

                <Button
                  type="button"
                  className="h-11 w-full rounded-xl bg-slate-900 px-4 text-white hover:bg-slate-800 sm:w-auto"
                  onClick={onCopy}
                >
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

async function copyToClipboard(value: string) {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  if (typeof document === "undefined") {
    throw new Error("Clipboard is not available");
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "absolute";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();

  const successful = document.execCommand("copy");
  document.body.removeChild(textarea);

  if (!successful) {
    throw new Error("Copy command failed");
  }
}

export function useShare({
  title,
  url,
  description,
  locationLabel,
  previewImageUrl,
  experienceId,
  source = "unknown",
}: UseShareOptions) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const copiedResetRef = useRef<number | null>(null);
  const { user } = useAuth();
  const supabase = createClient();

  useEffect(() => {
    return () => {
      if (copiedResetRef.current !== null) {
        window.clearTimeout(copiedResetRef.current);
      }
    };
  }, []);

  const shareUrl = useMemo(() => {
    if (typeof window === "undefined") {
      return url;
    }

    try {
      return new URL(url, window.location.origin).toString();
    } catch {
      return url;
    }
  }, [url]);

  const shareTargets = useMemo<ShareTarget[]>(() => {
    const encodedUrl = encodeURIComponent(shareUrl);
    const tweetText = encodeURIComponent(title);
    const whatsappText = encodeURIComponent(`${title}\n${shareUrl}`);

    return [
      {
        platform: "whatsapp",
        label: "WhatsApp",
        subtitle: "Send fast",
        icon: MessageCircle,
        iconClassName: "bg-emerald-100 text-emerald-600",
        href: `https://wa.me/?text=${whatsappText}`,
      },
      {
        platform: "facebook",
        label: "Facebook",
        subtitle: "Post link",
        icon: Facebook,
        iconClassName: "bg-blue-100 text-blue-600",
        href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      },
      {
        platform: "twitter",
        label: "X",
        subtitle: "Share now",
        icon: Twitter,
        iconClassName: "bg-slate-900 text-white",
        href: `https://twitter.com/intent/tweet?text=${tweetText}&url=${encodedUrl}`,
      },
    ];
  }, [shareUrl, title]);

  const trackShare = useCallback(
    async (platform: SharePlatform) => {
      captureEvent(ANALYTICS_EVENT.EXPERIENCE_SHARED, {
        experience_id: experienceId,
        method: platform,
        source,
      });

      if (!user || !experienceId) {
        return;
      }

      const { error } = await supabase.from("social_shares").insert({
        user_id: user.id,
        experience_id: experienceId,
        platform,
      });

      if (error) {
        throw error;
      }
    },
    [experienceId, source, supabase, user],
  );

  const openShare = useCallback(() => {
    setOpen(true);
  }, []);

  const closeShare = useCallback(() => {
    setOpen(false);
  }, []);

  const handleCopy = useCallback(async () => {
    try {
      await copyToClipboard(shareUrl);
      setCopied(true);

      if (copiedResetRef.current !== null) {
        window.clearTimeout(copiedResetRef.current);
      }

      copiedResetRef.current = window.setTimeout(() => {
        setCopied(false);
      }, 2200);

      toast.success("Lien copié");
      void trackShare("link").catch(() => undefined);
    } catch {
      toast.error("Impossible de copier le lien");
    }
  }, [shareUrl, trackShare]);

  const handleShareTarget = useCallback(
    (target: ShareTarget) => {
      window.open(target.href, "_blank", "noopener,noreferrer");
      setOpen(false);
      void trackShare(target.platform).catch(() => undefined);
    },
    [trackShare],
  );

  const shareDialog = (
    <ShareDialog
      open={open}
      onOpenChange={setOpen}
      title={title}
      description={description}
      locationLabel={locationLabel}
      previewImageUrl={previewImageUrl}
      shareUrl={shareUrl}
      copied={copied}
      shareTargets={shareTargets}
      onCopy={handleCopy}
      onShareTarget={handleShareTarget}
    />
  );

  return {
    openShare,
    closeShare,
    isShareOpen: open,
    shareUrl,
    shareDialog,
  };
}
