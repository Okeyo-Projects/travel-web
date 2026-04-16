"use client";

import Hls from "hls.js";
import { Maximize, Minimize, Play, Send, Volume2, VolumeX } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ANALYTICS_EVENT } from "@/lib/analytics/events";
import { captureEvent } from "@/lib/analytics/posthog";
import { localizeHref } from "@/lib/routing/locale-path";
import { useT } from "@/providers/translations-provider";

const TYPING_SPEED = 30;
const DELETING_SPEED = 15;
const PAUSE_AFTER_TYPE = 2500;
const PAUSE_AFTER_DELETE = 400;
const HOME_AI_VIDEO_URL =
  "https://customer-zklo0xkkeetv1rh0.cloudflarestream.com/3ef9d259694e7f28399d8fd4a4bccf09/manifest/video.m3u8";
const HOME_AI_VIDEO_POSTER_URL =
  "https://customer-zklo0xkkeetv1rh0.cloudflarestream.com/3ef9d259694e7f28399d8fd4a4bccf09/thumbnails/thumbnail.jpg?time=1s&height=900";

function attachVideoSource(video: HTMLVideoElement, src: string) {
  if (!src.includes(".m3u8")) {
    video.src = src;
    video.load();
    return null;
  }

  if (video.canPlayType("application/vnd.apple.mpegurl")) {
    video.src = src;
    video.load();
    return null;
  }

  if (!Hls.isSupported()) {
    video.src = src;
    video.load();
    return null;
  }

  const hls = new Hls();
  hls.loadSource(src);
  hls.attachMedia(video);
  hls.on(Hls.Events.ERROR, (_event, data) => {
    if (data.fatal) {
      hls.destroy();
    }
  });
  return hls;
}

export function AISection() {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const prompts = useMemo(
    () => [
      t("home.ai.prompts.one"),
      t("home.ai.prompts.two"),
      t("home.ai.prompts.three"),
    ],
    [t],
  );
  const videoContainerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const pendingPlayRef = useRef(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [displayedText, setDisplayedText] = useState("");
  const [promptIndex, setPromptIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [userInput, setUserInput] = useState("");

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    setIsVideoReady(false);

    const flushPendingPlay = () => {
      setIsVideoReady(true);

      if (!pendingPlayRef.current) return;

      pendingPlayRef.current = false;
      void video.play().catch(() => {
        setIsPlaying(false);
      });
    };

    const handleVideoError = () => {
      pendingPlayRef.current = false;
      setIsVideoReady(false);
      setIsPlaying(false);
    };

    video.addEventListener("loadedmetadata", flushPendingPlay);
    video.addEventListener("canplay", flushPendingPlay);
    video.addEventListener("error", handleVideoError);

    const hls = attachVideoSource(video, HOME_AI_VIDEO_URL);

    return () => {
      pendingPlayRef.current = false;
      video.removeEventListener("loadedmetadata", flushPendingPlay);
      video.removeEventListener("canplay", flushPendingPlay);
      video.removeEventListener("error", handleVideoError);
      hls?.destroy();
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = isMuted;
  }, [isMuted]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === videoContainerRef.current);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    const current = prompts[promptIndex];

    if (!isDeleting && displayedText === current) {
      const timeout = setTimeout(() => setIsDeleting(true), PAUSE_AFTER_TYPE);
      return () => clearTimeout(timeout);
    }

    if (isDeleting && displayedText === "") {
      const timeout = setTimeout(() => {
        setIsDeleting(false);
        setPromptIndex((i) => (i + 1) % prompts.length);
      }, PAUSE_AFTER_DELETE);
      return () => clearTimeout(timeout);
    }

    const timeout = setTimeout(
      () => {
        setDisplayedText(
          isDeleting
            ? current.slice(0, displayedText.length - 1)
            : current.slice(0, displayedText.length + 1),
        );
      },
      isDeleting ? DELETING_SPEED : TYPING_SPEED,
    );

    return () => clearTimeout(timeout);
  }, [displayedText, isDeleting, promptIndex, prompts]);

  const handleSend = () => {
    const text = userInput.trim();
    if (!text) {
      router.push(localizeHref("/chat", pathname));
      return;
    }

    captureEvent(ANALYTICS_EVENT.HOME_AI_PROMPT_SUBMITTED, {
      prompt_length: text.length,
      source: "home_ai_section",
    });

    const href = localizeHref(`/chat?q=${encodeURIComponent(text)}`, pathname);
    router.push(href);
  };

  const handlePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    pendingPlayRef.current = true;

    if (!isVideoReady && video.readyState < 2) {
      return;
    }

    void video
      .play()
      .then(() => {
        pendingPlayRef.current = false;
      })
      .catch(() => {
        setIsPlaying(false);
      });
  };

  const handleToggleMute = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setIsMuted((current) => !current);
  };

  const handleToggleFullscreen = async (
    event: React.MouseEvent<HTMLButtonElement>,
  ) => {
    event.stopPropagation();

    const container = videoContainerRef.current;
    if (!container) return;

    try {
      if (document.fullscreenElement === container) {
        await document.exitFullscreen();
        return;
      }

      await container.requestFullscreen();
    } catch {
      setIsFullscreen(document.fullscreenElement === container);
    }
  };

  const handleVideoClick = () => {
    const video = videoRef.current;
    if (!video || !isPlaying) return;

    video.pause();
  };

  return (
    <section className="bg-[#08090d] px-4 pb-16 pt-2 sm:px-6 sm:pb-24 m-8">
      <div className="relative mx-auto max-w-[1380px] overflow-hidden rounded-[26px] border border-white/10 bg-gradient-to-br from-[#20131d] via-[#60163d] to-[#a1084e] shadow-[0_24px_80px_rgba(0,0,0,0.55)] sm:rounded-[34px]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-40"
          style={{ backgroundImage: "url('/ai-pattern.png')" }}
        />

        <div className="relative z-10 px-4 pb-10 pt-10 sm:px-8 sm:pb-14 sm:pt-14 lg:px-20 lg:pb-16 lg:pt-16 xl:px-24">
          <h2 className="mx-auto max-w-[780px] text-center text-3xl font-black leading-[1.1] text-white sm:text-4xl lg:text-5xl">
            {t("home.ai.title")}
          </h2>

          <div className="mx-auto mt-8 max-w-[1020px] rounded-[26px] border border-white/10 bg-gradient-to-br from-black/80 to-[#1a1318]/90 p-4 shadow-[0_16px_45px_rgba(0,0,0,0.5)] sm:p-6">
            {isEditing ? (
              <textarea
                className="h-[150px] w-full resize-none bg-transparent text-base leading-relaxed text-white/85 outline-none placeholder:text-white/75 sm:h-[135px] sm:text-xl"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onBlur={() => {
                  if (!userInput.trim()) setIsEditing(false);
                }}
                placeholder={t("home.ai.placeholder")}
                aria-label={t("home.ai.placeholder")}
              />
            ) : (
              <textarea
                className="h-[150px] w-full resize-none bg-transparent text-base leading-relaxed text-white/85 outline-none placeholder:text-white/75 sm:h-[135px] sm:text-xl"
                value={displayedText}
                onChange={() => {}}
                onFocus={() => setIsEditing(true)}
                aria-label={t("home.ai.placeholder")}
                readOnly
              />
            )}

            <div className="mt-6 flex items-center justify-end">
              <button
                type="button"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-primary text-white shadow-[0_10px_30px_rgba(255,37,102,0.55)] transition-transform hover:scale-105 sm:h-12 sm:w-12"
                onClick={handleSend}
                aria-label={t("home.ai.send")}
              >
                <Send className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="mt-12 text-center">
            <p className="text-xl font-medium text-primary sm:text-2xl">
              {t("home.ai.howItWorks")}
            </p>
            <h3 className="mt-3 text-3xl font-black leading-tight text-white sm:text-4xl lg:text-5xl">
              {t("home.ai.subtitle")}
            </h3>
          </div>

          <div className="relative mt-8 overflow-hidden rounded-[20px] border border-white/10 bg-gradient-to-r from-[#c20566] to-[#760543] shadow-[0_16px_40px_rgba(0,0,0,0.4)] sm:mt-12 sm:rounded-[24px]">
            <div
              ref={videoContainerRef}
              className="relative flex h-auto items-center justify-center bg-black/35"
            >
              <video
                ref={videoRef}
                className="h-full w-full object-contain"
                muted={isMuted}
                loop
                playsInline
                preload="metadata"
                poster={HOME_AI_VIDEO_POSTER_URL}
                onClick={handleVideoClick}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
              />

              {isPlaying && (
                <button
                  type="button"
                  onClick={handleToggleMute}
                  className="absolute right-4 top-4 z-20 inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-black/45 text-white backdrop-blur-md transition-colors hover:bg-black/60 sm:h-12 sm:w-12"
                  aria-label={t(isMuted ? "home.ai.unmute" : "home.ai.mute")}
                >
                  {isMuted ? (
                    <VolumeX className="h-5 w-5" />
                  ) : (
                    <Volume2 className="h-5 w-5" />
                  )}
                </button>
              )}

              {isPlaying && (
                <button
                  type="button"
                  onClick={handleToggleFullscreen}
                  className="absolute bottom-4 right-4 z-20 inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-black/45 text-white backdrop-blur-md transition-colors hover:bg-black/60 sm:h-12 sm:w-12"
                  aria-label={t(
                    isFullscreen
                      ? "home.ai.exitFullscreen"
                      : "home.ai.fullscreen",
                  )}
                >
                  {isFullscreen ? (
                    <Minimize className="h-5 w-5" />
                  ) : (
                    <Maximize className="h-5 w-5" />
                  )}
                </button>
              )}

              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/35 to-transparent" />

              {!isPlaying && (
                <button
                  type="button"
                  onClick={handlePlay}
                  className="absolute inset-0 z-10 flex items-center justify-center"
                  aria-label={t("home.ai.playDemo")}
                >
                  <span className="absolute inline-flex h-20 w-20 rounded-full bg-white/30 animate-ping" />
                  <span className="absolute inline-flex h-28 w-28 rounded-full bg-white/20" />
                  <span className="relative inline-flex h-16 w-16 items-center justify-center rounded-full bg-white/90 text-black shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
                    <Play className="ml-1 h-7 w-7" />
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
