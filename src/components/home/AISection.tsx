"use client";

import { Play, Plus, Send } from "lucide-react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { localizeHref } from "@/lib/routing/locale-path";
import { useT } from "@/providers/translations-provider";

const TYPING_SPEED = 30;
const DELETING_SPEED = 15;
const PAUSE_AFTER_TYPE = 2500;
const PAUSE_AFTER_DELETE = 400;

export function AISection() {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const prompts = useMemo(
    () => [
      t("home.ai.prompts.one"),
      t("home.ai.prompts.two"),
      t("home.ai.prompts.three"),
    ],
    [t],
  );
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [displayedText, setDisplayedText] = useState("");
  const [promptIndex, setPromptIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [userInput, setUserInput] = useState("");

  useEffect(() => {
    const current = prompts[promptIndex];

    if (!isDeleting && displayedText === current) {
      const timeout = setTimeout(() => setIsDeleting(true), PAUSE_AFTER_TYPE);
      return () => clearTimeout(timeout);
    }

    if (isDeleting && displayedText === "") {
      const timeout = setTimeout(() => {
        setIsDeleting(false);
        setPromptIndex((i) => (i + 1) % prompts.length);
      }, PAUSE_AFTER_DELETE);
      return () => clearTimeout(timeout);
    }

    const timeout = setTimeout(
      () => {
        setDisplayedText(
          isDeleting
            ? current.slice(0, displayedText.length - 1)
            : current.slice(0, displayedText.length + 1),
        );
      },
      isDeleting ? DELETING_SPEED : TYPING_SPEED,
    );

    return () => clearTimeout(timeout);
  }, [displayedText, isDeleting, promptIndex, prompts]);

  const handleSend = () => {
    const text = userInput.trim();
    if (!text) return;
    const href = localizeHref(`/chat?q=${encodeURIComponent(text)}`, pathname);
    router.push(href);
  };

  const handlePlay = () => {
    if (!videoRef.current) return;
    videoRef.current.play();
  };

  return (
    <section className="bg-[#08090d] px-4 pb-16 pt-2 sm:px-6 sm:pb-24 m-8">
      <div className="relative mx-auto max-w-[1380px] overflow-hidden rounded-[26px] border border-white/10 bg-gradient-to-br from-[#20131d] via-[#60163d] to-[#a1084e] shadow-[0_24px_80px_rgba(0,0,0,0.55)] sm:rounded-[34px]">
        <Image
          src="/ai-pattern.png"
          alt=""
          aria-hidden="true"
          fill
          sizes="100vw"
          className="pointer-events-none object-cover opacity-40"
          priority={false}
        />

        <div className="relative z-10 px-4 pb-10 pt-10 sm:px-8 sm:pb-14 sm:pt-14 lg:px-20 lg:pb-16 lg:pt-16 xl:px-24">
          <h2 className="mx-auto max-w-[780px] text-center text-3xl font-black leading-[1.1] text-white sm:text-4xl lg:text-5xl">
            {t("home.ai.title")}
          </h2>

          <div className="mx-auto mt-8 max-w-[1020px] rounded-[26px] border border-white/10 bg-gradient-to-br from-black/80 to-[#1a1318]/90 p-4 shadow-[0_16px_45px_rgba(0,0,0,0.5)] sm:p-6">
            {isEditing ? (
              <textarea
                className="h-[150px] w-full resize-none bg-transparent text-base leading-relaxed text-white/85 outline-none placeholder:text-white/75 sm:h-[135px] sm:text-xl"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onBlur={() => {
                  if (!userInput.trim()) setIsEditing(false);
                }}
                placeholder={t("home.ai.placeholder")}
                aria-label={t("home.ai.placeholder")}
              />
            ) : (
              <textarea
                className="h-[150px] w-full resize-none bg-transparent text-base leading-relaxed text-white/85 outline-none placeholder:text-white/75 sm:h-[135px] sm:text-xl"
                value={displayedText}
                onChange={() => {}}
                onFocus={() => setIsEditing(true)}
                aria-label={t("home.ai.placeholder")}
                readOnly
              />
            )}

            <div className="mt-6 flex items-center justify-between">
              <button
                type="button"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/35 text-white/95 transition-colors hover:bg-white/10 sm:h-12 sm:w-12"
                aria-label={t("home.ai.add")}
              >
                <Plus className="h-6 w-6" />
              </button>

              <button
                type="button"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-primary text-white shadow-[0_10px_30px_rgba(255,37,102,0.55)] transition-transform hover:scale-105 sm:h-12 sm:w-12"
                onClick={handleSend}
                aria-label={t("home.ai.send")}
              >
                <Send className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="mt-12 text-center">
            <p className="text-xl font-medium text-primary sm:text-2xl">
              {t("home.ai.howItWorks")}
            </p>
            <h3 className="mt-3 text-3xl font-black leading-tight text-white sm:text-4xl lg:text-5xl">
              {t("home.ai.subtitle")}
            </h3>
          </div>

          <div className="relative mt-8 overflow-hidden rounded-[20px] border border-white/10 bg-gradient-to-r from-[#c20566] to-[#760543] shadow-[0_16px_40px_rgba(0,0,0,0.4)] sm:mt-12 sm:rounded-[24px]">
            <video
              ref={videoRef}
              className="h-full max-h-[500px] w-full object-cover"
              muted
              loop
              playsInline
              preload="metadata"
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            >
              <source src="/ai-video.mp4" type="video/mp4" />
            </video>
            {!isPlaying && (
              <button
                type="button"
                onClick={handlePlay}
                className="absolute inset-0 flex items-center justify-center"
                aria-label={t("home.ai.playDemo")}
              >
                <span className="absolute inline-flex h-20 w-20 rounded-full bg-white/30 animate-ping" />
                <span className="absolute inline-flex h-28 w-28 rounded-full bg-white/20" />
                <span className="relative inline-flex h-16 w-16 items-center justify-center rounded-full bg-white/90 text-black shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
                  <Play className="ml-1 h-7 w-7" />
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
