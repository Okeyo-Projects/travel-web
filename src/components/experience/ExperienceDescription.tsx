"use client";

import parse from "html-react-parser";
import { useMemo, useState } from "react";
import { useSiteI18n } from "@/components/site/site-i18n";
import { Button } from "@/components/ui/button";
import { prepareExperienceRichText } from "@/lib/experience-rich-text";
import { cn } from "@/lib/utils";

interface ExperienceDescriptionProps {
  description: string;
}

export function ExperienceDescription({
  description,
}: ExperienceDescriptionProps) {
  const { t } = useSiteI18n();
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const renderedDescription = useMemo(
    () => prepareExperienceRichText(description),
    [description],
  );
  const showReadMore = renderedDescription.plainText.length > 280;

  return (
    <div className="space-y-2">
      <h2 className="text-xl font-semibold">
        {t("experience.description.about")}
      </h2>
      <div
        className={cn(
          "relative",
          showReadMore &&
            !descriptionExpanded &&
            "max-h-64 overflow-hidden after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-20 after:bg-gradient-to-t after:from-background after:to-transparent",
        )}
      >
        <div className="space-y-3 leading-relaxed text-muted-foreground [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_blockquote]:my-4 [&_blockquote]:border-l-4 [&_blockquote]:border-border [&_blockquote]:pl-4 [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_h1]:mb-3 [&_h1]:text-3xl [&_h1]:font-semibold [&_h2]:mb-3 [&_h2]:text-2xl [&_h2]:font-semibold [&_h3]:mb-2 [&_h3]:text-xl [&_h3]:font-semibold [&_h4]:mb-2 [&_h4]:text-lg [&_h4]:font-semibold [&_h5]:mb-2 [&_h5]:text-base [&_h5]:font-semibold [&_h6]:mb-2 [&_h6]:text-sm [&_h6]:font-semibold [&_hr]:my-4 [&_li]:ml-5 [&_ol]:list-decimal [&_p]:mb-3 [&_pre]:my-4 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-muted [&_pre]:p-4 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_ul]:list-disc">
          {parse(renderedDescription.html)}
        </div>
      </div>
      {showReadMore ? (
        <Button
          variant="link"
          className="h-auto p-0 font-semibold"
          onClick={() => setDescriptionExpanded((state) => !state)}
        >
          {descriptionExpanded
            ? t("experience.description.showLess")
            : t("experience.description.readMore")}
        </Button>
      ) : null}
    </div>
  );
}
