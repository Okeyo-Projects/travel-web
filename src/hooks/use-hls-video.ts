import Hls from "hls.js";
import { type RefObject, useEffect } from "react";

export function isHlsSrc(src: string): boolean {
  return (
    src.includes(".m3u8") ||
    src.includes("cloudflarestream.com") ||
    src.includes("stream.mux.com")
  );
}

export function useHlsVideo(
  videoRef: RefObject<HTMLVideoElement | null>,
  src: string | null | undefined,
): void {
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) {
      // If src was removed, clear the video element to stop buffering
      if (video) {
        video.removeAttribute("src");
        video.load();
      }
      return;
    }

    let hls: Hls | null = null;

    if (isHlsSrc(src)) {
      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = src;
      } else if (Hls.isSupported()) {
        hls = new Hls();
        hls.loadSource(src);
        hls.attachMedia(video);
      } else {
        video.src = src;
      }
    } else {
      video.src = src;
    }

    return () => {
      hls?.destroy();
      hls = null;
      if (video) {
        video.removeAttribute("src");
        video.load();
      }
    };
  }, [src, videoRef]);
}
