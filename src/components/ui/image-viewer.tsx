"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { createPortal } from "react-dom";

interface ImageViewerProps {
    images: string[];
    initialIndex?: number;
    onClose: () => void;
}

export function ImageViewer({ images, initialIndex = 0, onClose }: ImageViewerProps) {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Allow switching images
    const handlePrevious = useCallback((e?: React.MouseEvent) => {
        e?.stopPropagation();
        setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
    }, [images.length]);

    const handleNext = useCallback((e?: React.MouseEvent) => {
        e?.stopPropagation();
        setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
    }, [images.length]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
            if (e.key === "ArrowLeft") handlePrevious();
            if (e.key === "ArrowRight") handleNext();
        };
        window.addEventListener("keydown", handleKeyDown);

        // Prevent scrolling behind
        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            document.body.style.overflow = originalOverflow;
        };
    }, [onClose, handlePrevious, handleNext]);

    if (!images || images.length === 0 || !mounted) return null;

    return createPortal(
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-sm"
            onClick={onClose}
        >
            {/* Close Button */}
            <button
                type="button"
                className="absolute top-4 right-4 p-2 text-white bg-white/10 rounded-full hover:bg-white/20 transition-colors z-[101]"
                onClick={onClose}
            >
                <X className="w-6 h-6" />
            </button>

            {/* Main Image Container */}
            <div
                className="relative w-full h-full md:w-4/5 md:h-4/5 flex items-center justify-center p-4 outline-none"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="relative w-full h-full select-none">
                    <Image
                        src={images[currentIndex]}
                        alt={`Image ${currentIndex + 1}`}
                        fill
                        className="object-contain"
                        priority
                        quality={100}
                        unoptimized={images[currentIndex].includes("supabase")}
                    />
                </div>

                {/* Navigation Overlays */}
                {images.length > 1 && (
                    <>
                        <button
                            type="button"
                            className="absolute left-4 md:-left-12 top-1/2 -translate-y-1/2 p-2 text-white bg-white/10 rounded-full hover:bg-white/20 transition-colors"
                            onClick={handlePrevious}
                        >
                            <ChevronLeft className="w-8 h-8" />
                        </button>
                        <button
                            type="button"
                            className="absolute right-4 md:-right-12 top-1/2 -translate-y-1/2 p-2 text-white bg-white/10 rounded-full hover:bg-white/20 transition-colors"
                            onClick={handleNext}
                        >
                            <ChevronRight className="w-8 h-8" />
                        </button>
                    </>
                )}
            </div>

            {/* Image Counter */}
            {images.length > 1 && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-white/10 text-white rounded-full text-sm font-medium tracking-wider">
                    {currentIndex + 1} / {images.length}
                </div>
            )}
        </div>,
        document.body
    );
}
