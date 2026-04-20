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

    const setVideoSource = () => {
      const nextSrc = mediaQuery.matches ? mobileSrc : desktopSrc;
      if (video.getAttribute("src") !== nextSrc) {
        video.src = nextSrc;
        video.load();
      }
    };

    const ensurePlayback = () => {
      void video.play().catch(() => {});
    };

    setVideoSource();

    const handleViewportChange = () => {
      setVideoSource();
    };

    mediaQuery.addEventListener("change", handleViewportChange);
    video.addEventListener("canplay", ensurePlayback);

    return () => {
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
