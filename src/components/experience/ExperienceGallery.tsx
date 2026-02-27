"use client";

import { useImageViewer } from "@/hooks/use-image-viewer";
import Image from "next/image";

interface ExperienceGalleryProps {
    images: string[];
    videoUrl?: string | null;
}

export function ExperienceGallery({ images, videoUrl }: ExperienceGalleryProps) {
    const { openImageViewer, Viewer } = useImageViewer();

    if (!images?.length && !videoUrl) return null;

    return (
        <div className="flex flex-col gap-4">
            {/* Big Media Area */}
            {videoUrl ? (
                <div className="relative w-full rounded-2xl overflow-hidden bg-muted aspect-video md:aspect-[4/3] lg:aspect-video shadow-sm">
                    <video
                        src={videoUrl}
                        autoPlay
                        muted
                        loop
                        playsInline
                        controls
                        className="w-full h-full object-cover"
                    />
                </div>
            ) : images[0] ? (
                <div
                    className="relative w-full rounded-2xl overflow-hidden cursor-pointer bg-muted transition-transform hover:scale-[1.01] aspect-[4/3] md:aspect-video shadow-sm"
                    onClick={() => openImageViewer(images, 0)}
                >
                    <Image
                        src={images[0]}
                        alt="Main Experience Image"
                        fill
                        className="object-cover"
                        priority
                    />
                </div>
            ) : null}

            {/* Grid of smaller pictures */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {images.slice(videoUrl ? 0 : 1).map((imgUrl, index) => (
                    <div
                        key={index}
                        className="relative w-full rounded-xl overflow-hidden cursor-pointer bg-muted transition-transform hover:scale-[1.02] aspect-square shadow-sm"
                        onClick={() => openImageViewer(images, videoUrl ? index : index + 1)}
                    >
                        <Image
                            src={imgUrl}
                            alt={`Gallery Image ${index + 1}`}
                            fill
                            className="object-cover"
                        />
                    </div>
                ))}
            </div>
            {Viewer}
        </div>
    );
}
