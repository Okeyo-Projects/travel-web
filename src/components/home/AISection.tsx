"use client";

import { Play, Plus, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const PROMPTS = [
  "Je veux une auberge de jeunesse paisible avec vue sur les montagnes, idéale pour travailler à distance et rencontrer d'autres voyageurs, budget max 400 dhs / nuit.",
  "Trouve-moi un riad authentique à Marrakech pour 2 personnes, avec piscine, proche de la médina, pour un week-end romantique.",
  "Je cherche un hébergement en bord de mer à Agadir, idéal pour une famille avec 2 enfants, cuisine disponible, moins de 800 dhs / nuit.",
];

const TYPING_SPEED = 30;
const DELETING_SPEED = 15;
const PAUSE_AFTER_TYPE = 2500;
const PAUSE_AFTER_DELETE = 400;

export function AISection() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [displayedText, setDisplayedText] = useState("");
  const [promptIndex, setPromptIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [userInput, setUserInput] = useState("");

  useEffect(() => {
    const current = PROMPTS[promptIndex];

    if (!isDeleting && displayedText === current) {
      const timeout = setTimeout(() => setIsDeleting(true), PAUSE_AFTER_TYPE);
      return () => clearTimeout(timeout);
    }

    if (isDeleting && displayedText === "") {
      const timeout = setTimeout(() => {
        setIsDeleting(false);
        setPromptIndex((i) => (i + 1) % PROMPTS.length);
      }, PAUSE_AFTER_DELETE);
      return () => clearTimeout(timeout);
    }

    const timeout = setTimeout(
      () => {
        setDisplayedText(
          isDeleting ? current.slice(0, displayedText.length - 1) : current.slice(0, displayedText.length + 1),
        );
      },
      isDeleting ? DELETING_SPEED : TYPING_SPEED,
    );

    return () => clearTimeout(timeout);
  }, [displayedText, isDeleting, promptIndex]);

  const handlePlay = () => {
    if (!videoRef.current) return;
    videoRef.current.play();
  };

  return (
    <section className="bg-[#08090d] px-4 pb-16 pt-2 sm:px-6 sm:pb-24 m-8">
      <div className="relative mx-auto max-w-[1380px] overflow-hidden rounded-[26px] border border-white/10 bg-gradient-to-br from-[#20131d] via-[#60163d] to-[#a1084e] shadow-[0_24px_80px_rgba(0,0,0,0.55)] sm:rounded-[34px]">
        <img
          src="/ai-pattern.png"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute left-0 top-0 h-auto w-full opacity-40"
        />

        <div className="relative z-10 px-4 pb-10 pt-10 sm:px-8 sm:pb-14 sm:pt-14 lg:px-20 lg:pb-16 lg:pt-16 xl:px-24">
          <h2 className="mx-auto max-w-[780px] text-center text-3xl font-black leading-[1.1] text-white sm:text-4xl lg:text-5xl">
            Décrivez votre voyage, l&apos;IA s&apos;occupe du reste. En
            Headline.
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
                placeholder="Décrivez votre voyage idéal..."
                aria-label="AI prompt input"
                autoFocus
              />
            ) : (
              <textarea
                className="h-[150px] w-full resize-none bg-transparent text-base leading-relaxed text-white/85 outline-none placeholder:text-white/75 sm:h-[135px] sm:text-xl"
                value={displayedText}
                onChange={() => {}}
                onFocus={() => setIsEditing(true)}
                aria-label="AI prompt input"
                readOnly
              />
            )}

            <div className="mt-6 flex items-center justify-between">
              <button
                type="button"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/35 text-white/95 transition-colors hover:bg-white/10 sm:h-12 sm:w-12"
                aria-label="Add"
              >
                <Plus className="h-6 w-6" />
              </button>

              <button
                type="button"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-primary text-white shadow-[0_10px_30px_rgba(255,37,102,0.55)] transition-transform hover:scale-105 sm:h-12 sm:w-12"
                aria-label="Send"
              >
                <Send className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="mt-12 text-center">
            <p className="text-xl font-medium text-primary sm:text-2xl">
              How It Works
            </p>
            <h3 className="mt-3 text-3xl font-black leading-tight text-white sm:text-4xl lg:text-5xl">
              Let the AI Build Your Journey
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
                aria-label="Play AI demo"
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
