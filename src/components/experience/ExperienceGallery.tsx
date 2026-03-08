"use client";

import { Camera, PlayCircle } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useImageViewer } from "@/hooks/use-image-viewer";

interface ExperienceGalleryProps {
  images: string[];
  videoUrl?: string | null;
}

export function ExperienceGallery({ images, videoUrl }: ExperienceGalleryProps) {
  const { openImageViewer, Viewer } = useImageViewer();
  const photoCount = images.length;

  if (!photoCount && !videoUrl) {
    return null;
  }

  const openAt = (index: number) => openImageViewer(images, index);
  const desktopPreview = images.slice(1, 5);

  return (
    <section className="space-y-3">
      <div className="relative overflow-hidden rounded-3xl border bg-muted">
        <div className="grid gap-2 p-2 md:grid-cols-12 md:grid-rows-2">
          <button
            type="button"
            onClick={() => openAt(0)}
            className="relative col-span-full min-h-64 overflow-hidden rounded-2xl md:col-span-7 md:row-span-2 md:min-h-[420px]"
          >
            {images[0] ? (
              <Image
                src={images[0]}
                alt="Main experience photo"
                fill
                className="object-cover transition-transform duration-300 hover:scale-105"
                priority
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-zinc-900/80 text-white">
                <PlayCircle className="h-12 w-12" />
              </div>
            )}
          </button>

          {desktopPreview.map((image, index) => (
            <button
              type="button"
              key={image}
              onClick={() => openAt(index + 1)}
              className="relative hidden min-h-[205px] overflow-hidden rounded-2xl md:block md:col-span-5"
            >
              <Image
                src={image}
                alt={`Experience photo ${index + 2}`}
                fill
                className="object-cover transition-transform duration-300 hover:scale-105"
              />
            </button>
          ))}
        </div>

        {videoUrl ? (
          <div className="pointer-events-none absolute left-4 top-4 rounded-full bg-black/50 px-3 py-1.5 text-xs font-medium text-white">
            Video available
          </div>
        ) : null}

        {photoCount > 0 ? (
          <Button
            type="button"
            size="sm"
            className="absolute bottom-5 right-5 gap-2 rounded-full"
            onClick={() => openAt(0)}
          >
            <Camera className="h-4 w-4" />
            Show all photos ({photoCount})
          </Button>
        ) : null}
      </div>

      {photoCount > 1 ? (
        <div className="flex gap-2 overflow-x-auto pb-1 md:hidden">
          {images.slice(0, 5).map((image, index) => (
            <button
              type="button"
              key={image}
              onClick={() => openAt(index)}
              className="relative h-20 w-28 shrink-0 overflow-hidden rounded-xl border"
            >
              <Image
                src={image}
                alt={`Experience photo ${index + 1}`}
                fill
                className="object-cover"
              />
            </button>
          ))}
        </div>
      ) : null}

      {Viewer}
    </section>
  );
}
