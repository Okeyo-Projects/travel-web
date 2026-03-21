"use client";

import dynamic from "next/dynamic";
import { Camera } from "lucide-react";
import { useImageViewer } from "@/hooks/use-image-viewer";
import { Button } from "@/components/ui/button";

const CustomVideoPlayer = dynamic(
  () => import("./CustomVideoPlayer").then((m) => m.CustomVideoPlayer),
  { ssr: false },
);

interface ExperienceGalleryProps {
  images: string[];
  videoUrl?: string | null;
}

export function ExperienceGallery({ images, videoUrl }: ExperienceGalleryProps) {
  const { openImageViewer, Viewer } = useImageViewer();

  if (!images?.length && !videoUrl) {
    return null;
  }

  return (
    <div className="space-y-3">
      {videoUrl ? (
        <CustomVideoPlayer src={videoUrl} />
      ) : null}

      {images.length > 0 && (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            className="gap-2 rounded-full"
            onClick={() => openImageViewer(images, 0)}
          >
            <Camera className="h-4 w-4" />
            Voir les {images.length} photos
          </Button>
        </div>
      )}
      {Viewer}
    </div>
  );
}
