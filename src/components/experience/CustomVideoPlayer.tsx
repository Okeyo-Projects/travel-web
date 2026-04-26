"use client";

import Hls from "hls.js";
import {
  Maximize,
  Minimize,
  Play,
  Pause,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useRef, useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ANALYTICS_EVENT } from "@/lib/analytics/events";
import { captureEvent } from "@/lib/analytics/posthog";

function isHlsSrc(src: string) {
  return (
    src.includes(".m3u8") ||
    src.includes("cloudflarestream.com") ||
    src.includes("/playlist.m3u8") ||
    src.includes("stream.mux.com")
  );
}

function attachHls(video: HTMLVideoElement, src: string): Hls | null {
  if (!isHlsSrc(src)) return null;
  if (video.canPlayType("application/vnd.apple.mpegurl")) {
    // Safari supports HLS natively
    video.src = src;
    return null;
  }
  if (!Hls.isSupported()) return null;
  const hls = new Hls();
  hls.loadSource(src);
  hls.attachMedia(video);
  return hls;
}

interface CustomVideoPlayerProps {
  src: string;
}

export function CustomVideoPlayer({ src }: CustomVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const blurVideoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [progress, setProgress] = useState(0);

  // Attach HLS or set src directly
  useEffect(() => {
    const video = videoRef.current;
    const blurVideo = blurVideoRef.current;
    if (!video) return;

    let hlsMain: Hls | null = null;
    let hlsBlur: Hls | null = null;

    if (isHlsSrc(src)) {
      hlsMain = attachHls(video, src);
      if (blurVideo) hlsBlur = attachHls(blurVideo, src);
    } else {
      video.src = src;
      if (blurVideo) blurVideo.src = src;
    }

    return () => {
      hlsMain?.destroy();
      hlsBlur?.destroy();
    };
  }, [src]);

  useEffect(() => {
    const video = videoRef.current;
    const blurVideo = blurVideoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.play().catch(() => setIsPlaying(false));
      blurVideo?.play().catch(() => {});
    } else {
      video.pause();
      blurVideo?.pause();
    }
  }, [isPlaying]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      const progress = (video.currentTime / video.duration) * 100;
      setProgress(progress || 0);
    };

    video.addEventListener("timeupdate", handleTimeUpdate);
    return () => video.removeEventListener("timeupdate", handleTimeUpdate);
  }, []);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = !isPlaying;
    captureEvent(
      next ? ANALYTICS_EVENT.VIDEO_PLAYED : ANALYTICS_EVENT.VIDEO_PAUSED,
      {
        src,
        progress_pct: Math.round(progress),
      },
    );
    setIsPlaying(next);
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      const next = !isMuted;
      videoRef.current.muted = next;
      captureEvent(
        next ? ANALYTICS_EVENT.VIDEO_MUTED : ANALYTICS_EVENT.VIDEO_UNMUTED,
        { src },
      );
      setIsMuted(next);
    }
  };

  const toggleFullscreen = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      await containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    video.currentTime = (percentage / 100) * video.duration;
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative flex justify-center overflow-hidden shadow-sm group",
        isFullscreen
          ? "h-screen w-screen"
          : "rounded-2xl h-[60vh] md:h-[70vh] w-full",
      )}
    >
      {/* Blurred background video */}
      <video
        ref={blurVideoRef}
        muted
        loop
        playsInline
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover blur-2xl scale-110 opacity-80 pointer-events-none"
      />

      {/* Main video */}
      <video
        ref={videoRef}
        muted={isMuted}
        loop
        playsInline
        onClick={togglePlay}
        className="relative h-full w-full object-contain cursor-pointer"
      />

      {/* Play/Pause Overlay Icon (shows when paused) */}
      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-black/40 p-5 rounded-full backdrop-blur-md">
            <Play className="h-10 w-10 text-white ml-1" />
          </div>
        </div>
      )}

      {/* Controls Bar */}
      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        {/* Progress Bar */}
        <div
          className="w-full h-1.5 bg-white/30 rounded-full mb-4 cursor-pointer relative"
          onClick={handleSeek}
        >
          <div
            className="absolute top-0 left-0 h-full bg-primary rounded-full transition-all duration-150 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={togglePlay}
            className="p-1.5 rounded-full text-white hover:bg-white/20 transition-colors focus:outline-none backdrop-blur-sm"
          >
            {isPlaying ? (
              <Pause className="h-5 w-5 fill-white" />
            ) : (
              <Play className="h-5 w-5 fill-white ml-0.5" />
            )}
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleMute}
              className="p-1.5 rounded-full text-white hover:bg-white/20 transition-colors focus:outline-none backdrop-blur-sm"
            >
              {isMuted ? (
                <VolumeX className="h-5 w-5" />
              ) : (
                <Volume2 className="h-5 w-5" />
              )}
            </button>

            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-1.5 rounded-full text-white hover:bg-white/20 transition-colors focus:outline-none backdrop-blur-sm"
            >
              {isFullscreen ? (
                <Minimize className="h-5 w-5" />
              ) : (
                <Maximize className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
