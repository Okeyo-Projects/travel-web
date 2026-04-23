"use client";

import { Camera } from "lucide-react";
import { CustomVideoPlayer } from "@/components/experience/CustomVideoPlayer";
import { Button } from "@/components/ui/button";
import { useImageViewer } from "@/hooks/use-image-viewer";
import { useT } from "@/providers/translations-provider";

interface ExperienceGalleryProps {
  images: string[];
  video?: {
    url: string | null;
    hlsUrl: string | null;
  } | null;
  imageAlts?: string[];
}

export function ExperienceGallery({
  images,
  video,
  imageAlts,
}: ExperienceGalleryProps) {
  const { openImageViewer, Viewer } = useImageViewer();
  const t = useT();

  const videoUrl = video?.hlsUrl ?? video?.url ?? null;

  if (!images?.length && !videoUrl) {
    return null;
  }

  return (
    <div className="space-y-3">
      {videoUrl ? <CustomVideoPlayer src={videoUrl} /> : null}

      {images.length > 0 && (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            className="gap-2 rounded-full"
            onClick={() => openImageViewer(images, 0, imageAlts)}
          >
            <Camera className="h-4 w-4" />
            {t("experienceGallery.viewPhotos", { count: images.length })}
          </Button>
        </div>
      )}
      {Viewer}
    </div>
  );
}
