import { useState, useCallback } from "react";
import { ImageViewer } from "@/components/ui/image-viewer";

export function useImageViewer() {
    const [isOpen, setIsOpen] = useState(false);
    const [images, setImages] = useState<string[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);

    const openImageViewer = useCallback((newImages: string[], index: number = 0) => {
        setImages(newImages);
        setCurrentIndex(index);
        setIsOpen(true);
    }, []);

    const closeImageViewer = useCallback(() => {
        setIsOpen(false);
    }, []);

    const Viewer = isOpen ? (
        <ImageViewer
            images={images}
            initialIndex={currentIndex}
            onClose={closeImageViewer}
        />
    ) : null;

    return {
        openImageViewer,
        closeImageViewer,
        Viewer,
    };
}
