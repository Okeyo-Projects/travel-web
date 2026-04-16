"use client";

import { useEffect, useRef } from "react";

interface HeroBackgroundVideoProps {
  desktopSrc: string;
  mobileSrc: string;
  poster: string;
  title: string;
}

const MOBILE_MEDIA_QUERY = "(max-width: 768px)";

export function HeroBackgroundVideo({
  desktopSrc,
  mobileSrc,
  poster,
  title,
}: HeroBackgroundVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const mediaQuery = window.matchMedia(MOBILE_MEDIA_QUERY);
    let isDisposed = false;
    let loadVersion = 0;
    let cleanupStream = () => {};

    const ensurePlayback = () => {
      void video.play().catch(() => {});
    };

    const setVideoSource = async () => {
      const currentLoadVersion = ++loadVersion;
      cleanupStream();

      const nextSrc = mediaQuery.matches ? mobileSrc : desktopSrc;

      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        if (video.src !== nextSrc) {
          video.src = nextSrc;
          video.load();
        }
        ensurePlayback();
        return;
      }

      if (!nextSrc.includes(".m3u8")) {
        if (video.src !== nextSrc) {
          video.src = nextSrc;
          video.load();
        }
        ensurePlayback();
        return;
      }

      let Hls: typeof import("hls.js").default;
      try {
        ({ default: Hls } = await import("hls.js"));
      } catch {
        if (!isDisposed && currentLoadVersion === loadVersion) {
          video.src = nextSrc;
          video.load();
          ensurePlayback();
        }
        return;
      }

      if (isDisposed || currentLoadVersion !== loadVersion) return;

      if (!Hls.isSupported()) {
        if (video.src !== nextSrc) {
          video.src = nextSrc;
          video.load();
        }
        ensurePlayback();
        return;
      }

      const hls = new Hls();
      hls.loadSource(nextSrc);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, ensurePlayback);
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          hls.destroy();
          cleanupStream = () => {};
        }
      });
      cleanupStream = () => {
        hls.destroy();
      };
    };

    void setVideoSource();

    const handleViewportChange = () => {
      void setVideoSource();
    };

    mediaQuery.addEventListener("change", handleViewportChange);
    video.addEventListener("canplay", ensurePlayback);

    return () => {
      isDisposed = true;
      cleanupStream();
      video.removeEventListener("canplay", ensurePlayback);
      mediaQuery.removeEventListener("change", handleViewportChange);
    };
  }, [desktopSrc, mobileSrc]);

  return (
    <video
      ref={videoRef}
      className="absolute inset-0 h-full w-full object-cover pointer-events-none"
      autoPlay
      muted
      loop
      playsInline
      preload="none"
      poster={poster}
      title={title}
    />
  );
}
