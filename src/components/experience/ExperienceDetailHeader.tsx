"use client";

import { ChevronLeft, Share2 } from "lucide-react";
import { MarketingHeader } from "@/components/site/MarketingHeader";
import { Button } from "@/components/ui/button";
import { useShare } from "@/hooks/use-share";

interface ExperienceDetailHeaderProps {
  title: string;
  url: string;
  description?: string | null;
  locationLabel?: string | null;
  previewImageUrl?: string | null;
  experienceId?: string | null;
}

export function ExperienceDetailHeader({
  title,
  url,
  description,
  locationLabel,
  previewImageUrl,
  experienceId,
}: ExperienceDetailHeaderProps) {
  const share = useShare({
    title,
    url,
    description,
    locationLabel,
    previewImageUrl,
    experienceId,
    source: "experience_detail_page",
  });

  return (
    <>
      <div className="bg-[#19181b] px-4 py-4 shadow-sm sm:px-8">
        <div className="mx-auto max-w-7xl">
          <MarketingHeader />
        </div>
      </div>

      <div className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => window.history.back()}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={share.openShare}>
              <Share2 className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="hidden items-center justify-between lg:flex mt-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <Button
          variant="ghost"
          className="gap-2"
          onClick={() => window.history.back()}
        >
          <ChevronLeft className="h-4 w-4" />
          Retour
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2" onClick={share.openShare}>
            <Share2 className="h-4 w-4" />
            Partager
          </Button>
        </div>
      </div>

      {share.shareDialog}
    </>
  );
}
