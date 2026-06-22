"use client";

import useEmblaCarousel from "embla-carousel-react";
import {
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  RotateCcw,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { useT } from "@/providers/translations-provider";

interface ImageViewerProps {
  images: string[];
  imageAlts?: string[];
  initialIndex?: number;
  onClose: () => void;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.5;

function clampZoom(value: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
}

export function ImageViewer({
  images,
  imageAlts,
  initialIndex = 0,
  onClose,
}: ImageViewerProps) {
  const t = useT();
  const [mounted, setMounted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const activeScrollRef = useRef<HTMLDivElement>(null);
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "center",
    loop: images.length > 1,
    startIndex: initialIndex,
    watchDrag: zoom === MIN_ZOOM,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const resetZoom = useCallback(() => {
    setZoom(MIN_ZOOM);
  }, []);

  const handlePrevious = useCallback(
    (e?: React.MouseEvent) => {
      e?.stopPropagation();
      emblaApi?.scrollPrev();
    },
    [emblaApi],
  );

  const handleNext = useCallback(
    (e?: React.MouseEvent) => {
      e?.stopPropagation();
      emblaApi?.scrollNext();
    },
    [emblaApi],
  );

  const zoomIn = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    setZoom((prev) => clampZoom(prev + ZOOM_STEP));
  }, []);

  const zoomOut = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    setZoom((prev) => clampZoom(prev - ZOOM_STEP));
  }, []);

  useEffect(() => {
    if (!emblaApi) return;

    const updateIndex = () => {
      setCurrentIndex(emblaApi.selectedScrollSnap());
      setZoom(MIN_ZOOM);
    };

    emblaApi.scrollTo(initialIndex, true);
    updateIndex();
    emblaApi.on("select", updateIndex);
    emblaApi.on("reInit", updateIndex);

    return () => {
      emblaApi.off("select", updateIndex);
      emblaApi.off("reInit", updateIndex);
    };
  }, [emblaApi, initialIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }

      if (e.key === "ArrowLeft") {
        handlePrevious();
        return;
      }

      if (e.key === "ArrowRight") {
        handleNext();
        return;
      }

      if (e.key === "+" || e.key === "=") {
        zoomIn();
        return;
      }

      if (e.key === "-") {
        zoomOut();
        return;
      }

      if (e.key === "0") {
        resetZoom();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [handleNext, handlePrevious, onClose, resetZoom, zoomIn, zoomOut]);

  const setActiveScrollNode = useCallback(
    (node: HTMLDivElement | null) => {
      if (!node) return;

      activeScrollRef.current = node;

      if (zoom === MIN_ZOOM) {
        node.scrollTo({ left: 0, top: 0 });
        return;
      }

      node.scrollTo({
        left: Math.max(0, (node.scrollWidth - node.clientWidth) / 2),
        top: Math.max(0, (node.scrollHeight - node.clientHeight) / 2),
      });
    },
    [zoom],
  );

  useEffect(() => {
    setActiveScrollNode(activeScrollRef.current);
  }, [setActiveScrollNode]);

  if (!images || images.length === 0 || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm">
      <button
        type="button"
        aria-label={t("common.close")}
        className="absolute inset-0"
        onClick={onClose}
      />

      <div className="absolute inset-x-4 top-4 z-[101] flex items-center justify-between gap-3">
        <div className="rounded-full bg-white/10 px-4 py-2 text-sm font-medium tracking-wider text-white">
          {currentIndex + 1} / {images.length}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label={t("common.zoomOut")}
            className="rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20 disabled:opacity-50"
            disabled={zoom <= MIN_ZOOM}
            onClick={zoomOut}
          >
            <Minus className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label={t("common.zoomIn")}
            className="rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20 disabled:opacity-50"
            disabled={zoom >= MAX_ZOOM}
            onClick={zoomIn}
          >
            <Plus className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label={t("common.resetZoom")}
            className="rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20 disabled:opacity-50"
            disabled={zoom === MIN_ZOOM}
            onClick={resetZoom}
          >
            <RotateCcw className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label={t("common.close")}
            className="rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
            onClick={onClose}
          >
            <X className="h-6 w-6" />
          </button>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-4 z-[101] flex items-center justify-center">
        <div className="rounded-full bg-white/10 px-4 py-2 text-xs font-medium text-white/90">
          {t("common.imageZoom", { value: `${Math.round(zoom * 100)}%` })}
        </div>
      </div>

      <div className="flex h-full w-full items-center justify-center">
        <div className="relative h-full w-full px-4 pb-16 pt-20 md:px-16">
          <div ref={emblaRef} className="h-full overflow-hidden">
            <div className="flex h-full">
              {images.map((src, index) => (
                <div
                  key={`${src}-${imageAlts?.[index] ?? "image"}`}
                  className="h-full min-w-0 shrink-0 grow-0 basis-full"
                >
                  <div
                    ref={index === currentIndex ? setActiveScrollNode : null}
                    className={cn(
                      "h-full overflow-auto overscroll-contain rounded-2xl",
                      zoom > MIN_ZOOM ? "cursor-grab" : "cursor-default",
                    )}
                    style={{
                      touchAction: zoom > MIN_ZOOM ? "pan-x pan-y" : "auto",
                    }}
                  >
                    <div className="flex min-h-full min-w-full items-center justify-center p-4">
                      {/* biome-ignore lint/performance/noImgElement: Viewer needs native scrollable zoom behavior. */}
                      <img
                        src={src}
                        alt={
                          imageAlts?.[index] ??
                          `${t("common.image")} ${index + 1}`
                        }
                        draggable={false}
                        onDoubleClick={() =>
                          setZoom((prev) =>
                            prev === MIN_ZOOM ? clampZoom(prev + 1) : MIN_ZOOM,
                          )
                        }
                        className="select-none rounded-xl object-contain shadow-2xl"
                        style={{
                          maxHeight: `${zoom * 100}%`,
                          maxWidth: `${zoom * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {images.length > 1 && (
            <>
              <button
                type="button"
                aria-label={t("common.previous")}
                className="absolute left-4 top-1/2 z-[101] -translate-y-1/2 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20 md:left-6"
                onClick={handlePrevious}
              >
                <ChevronLeft className="h-8 w-8" />
              </button>
              <button
                type="button"
                aria-label={t("common.next")}
                className="absolute right-4 top-1/2 z-[101] -translate-y-1/2 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20 md:right-6"
                onClick={handleNext}
              >
                <ChevronRight className="h-8 w-8" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
