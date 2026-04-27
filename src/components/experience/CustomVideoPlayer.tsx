"use client";

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
import { useHlsVideo } from "@/hooks/use-hls-video";

interface CustomVideoPlayerProps {
  src: string;
  poster?: string | null;
}

export function CustomVideoPlayer({ src, poster }: CustomVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [progress, setProgress] = useState(0);

  useHlsVideo(videoRef, src);

  useEffect(() => {
    videoRef.current?.play().catch(() => {});
  }, [src]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onTimeUpdate = () => {
      const d = video.duration;
      setProgress(Number.isFinite(d) && d > 0 ? (video.currentTime / d) * 100 : 0);
    };

    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("timeupdate", onTimeUpdate);
    return () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("timeupdate", onTimeUpdate);
    };
  }, []);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    const next = !isPlaying;
    captureEvent(
      next ? ANALYTICS_EVENT.VIDEO_PLAYED : ANALYTICS_EVENT.VIDEO_PAUSED,
      { src, progress_pct: Math.round(progress) },
    );
    if (next) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
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
    const container = containerRef.current;
    if (!container) return;

    try {
      if (!document.fullscreenElement) {
        if (typeof container.requestFullscreen === "function") {
          await container.requestFullscreen();
        }
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // Fullscreen may be unsupported (iOS Safari) or rejected
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
      {/* Blurred backdrop (poster only — avoids decoding the stream twice) */}
      {poster ? (
        <img
          src={poster}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover blur-2xl scale-110 opacity-80 pointer-events-none"
        />
      ) : (
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-black pointer-events-none"
        />
      )}

      {/* Main video */}
      <video
        ref={videoRef}
        muted={isMuted}
        loop
        playsInline
        onClick={togglePlay}
        poster={poster ?? undefined}
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
          role="progressbar"
          aria-label="Seek"
          className="w-full h-1.5 bg-white/30 rounded-full mb-4 cursor-pointer relative"
          onClick={handleSeek}
        >
          <div
            className="absolute top-0 left-0 h-full bg-primary rounded-full transition-all duration-150 ease-linear"
            // eslint-disable-next-line react/forbid-dom-props
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={togglePlay}
            aria-label={isPlaying ? "Pause" : "Play"}
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
              aria-label={isMuted ? "Unmute" : "Mute"}
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
              aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
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
