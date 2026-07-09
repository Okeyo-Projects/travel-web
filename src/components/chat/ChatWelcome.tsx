"use client";

import { motion } from "framer-motion";
import { Compass } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSiteI18n } from "@/components/site/site-i18n";

const MESSAGE_DELAY_MS = 300;

export function ChatWelcome() {
  const { t, dir } = useSiteI18n();
  const [isVisible, setIsVisible] = useState(false);
  const welcomeParagraphs = useMemo(
    () => [
      t("chat.welcome.greeting"),
      t("chat.welcome.intro"),
      t("chat.welcome.description"),
      t("chat.welcome.itinerary"),
      t("chat.welcome.closing"),
      t("chat.welcome.testPrompt"),
    ],
    [t],
  );

  useEffect(() => {
    setIsVisible(false);

    const timeoutId = window.setTimeout(() => {
      setIsVisible(true);
    }, MESSAGE_DELAY_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, []);

  return (
    <div
      dir={dir}
      className="w-full max-w-3xl mx-auto px-3 py-4 sm:px-4 sm:py-6"
    >
      {isVisible ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="flex items-start gap-3 sm:gap-4"
        >
          <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary shadow-sm sm:h-8 sm:w-8">
            <Compass className="h-4 w-4 text-primary-foreground" />
          </div>

          <div className="flex-1 space-y-4 overflow-hidden">
            <div className="space-y-3">
              <div
                dir="auto"
                className="prose prose-neutral max-w-none break-words text-[15px] sm:text-base dark:prose-invert"
              >
                <div className="space-y-3">
                  {welcomeParagraphs.map((paragraph) => (
                    <p key={paragraph} className="leading-relaxed text-base">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      ) : null}
    </div>
  );
}
