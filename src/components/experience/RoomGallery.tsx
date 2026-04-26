"use client";

import { BedDouble } from "lucide-react";
import Image from "next/image";
import { useImageViewer } from "@/hooks/use-image-viewer";

const MAX_VISIBLE_SMALL = 4;
const GRID_THRESHOLD = 2; // need at least 2 photos to show the strip

interface RoomGalleryProps {
  photoUrls: string[];
  name: string | null;
}

export function RoomGallery({ photoUrls, name }: RoomGalleryProps) {
  const { openImageViewer, Viewer } = useImageViewer();
  const alt = name ?? "Room";

  if (!photoUrls.length) {
    return (
      <div className="flex aspect-[4/3] items-center justify-center rounded-xl bg-muted">
        <BedDouble className="h-8 w-8 text-muted-foreground" />
      </div>
    );
  }

  const smallPhotos = photoUrls.slice(1, 1 + MAX_VISIBLE_SMALL);
  const overflow = photoUrls.length - (1 + MAX_VISIBLE_SMALL);
  const showStrip = photoUrls.length >= GRID_THRESHOLD;

  return (
    <div className="space-y-1.5">
      {/* Main image */}
      <button
        type="button"
        className="relative block w-full overflow-hidden rounded-xl aspect-[4/3]"
        onClick={() => openImageViewer(photoUrls, 0)}
      >
        <Image
          src={photoUrls[0]}
          alt={alt}
          fill
          className="object-cover transition-transform duration-300 hover:scale-105"
          unoptimized={photoUrls[0].includes("supabase")}
        />
      </button>

      {/* Thumbnail strip */}
      {showStrip && (
        <div className={`grid gap-1.5 grid-cols-4`}>
          {smallPhotos.map((url, i) => {
            const isLast = i === smallPhotos.length - 1;
            const hasOverflow = overflow > 0 && isLast;
            const globalIndex = i + 1;

            return (
              <button
                key={url}
                type="button"
                className="relative aspect-square overflow-hidden rounded-lg"
                onClick={() => openImageViewer(photoUrls, globalIndex)}
              >
                <Image
                  src={url}
                  alt={`${alt} ${globalIndex + 1}`}
                  fill
                  className="object-cover transition-transform duration-300 hover:scale-105"
                  unoptimized={url.includes("supabase")}
                />
                {hasOverflow && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/55 backdrop-blur-[1px]">
                    <span className="text-white text-sm font-semibold">
                      +{overflow}
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {Viewer}
    </div>
  );
}
