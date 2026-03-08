"use client";

import { Camera } from "lucide-react";
import { useImageViewer } from "@/hooks/use-image-viewer";
import Image from "next/image";
import { Button } from "@/components/ui/button";

interface ExperienceGalleryProps {
  images: string[];
  videoUrl?: string | null;
}

export function ExperienceGallery({ images, videoUrl }: ExperienceGalleryProps) {
  const { openImageViewer, Viewer } = useImageViewer();
  const heroImage = images[0];
  const sideImages = images.slice(1, 5);
  const remainingImageCount = Math.max(images.length - 5, 0);

  if (!images?.length && !videoUrl) {
    return null;
  }

  return (
    <div className="space-y-3">
      {videoUrl ? (
        <div className="relative overflow-hidden rounded-2xl bg-muted shadow-sm">
          <video
            src={videoUrl}
            autoPlay
            muted
            loop
            playsInline
            controls
            className="aspect-video w-full object-cover"
          />
        </div>
      ) : null}

      {heroImage ? (
        <div className="grid grid-cols-1 gap-2 md:grid-cols-4 md:grid-rows-2">
          <button
            type="button"
            className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-muted text-left md:col-span-2 md:row-span-2 md:aspect-auto"
            onClick={() => openImageViewer(images, 0)}
          >
            <Image
              src={heroImage}
              alt="Photo principale"
              fill
              priority
              className="object-cover transition-transform duration-300 hover:scale-[1.02]"
            />
          </button>
          {sideImages.map((imageUrl, index) => {
            const imageIndex = index + 1;
            const isLastVisibleThumb = index === sideImages.length - 1 && remainingImageCount > 0;
            return (
              <button
                key={imageUrl}
                type="button"
                className="relative hidden overflow-hidden rounded-xl bg-muted md:block"
                onClick={() => openImageViewer(images, imageIndex)}
              >
                <Image
                  src={imageUrl}
                  alt={`Photo ${imageIndex + 1}`}
                  fill
                  className="object-cover transition-transform duration-300 hover:scale-[1.03]"
                />
                {isLastVisibleThumb ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/45 text-sm font-semibold text-white">
                    +{remainingImageCount} photos
                  </div>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}

      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          className="gap-2 rounded-full"
          onClick={() => openImageViewer(images, 0)}
          disabled={!images.length}
        >
          <Camera className="h-4 w-4" />
          Show all photos
        </Button>
      </div>
      {Viewer}
    </div>
  );
}
