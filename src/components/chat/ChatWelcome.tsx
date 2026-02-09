"use client";

import { motion } from "framer-motion";
import { Compass, Hotel, Map as MapIcon, Tag } from "lucide-react";

interface ChatWelcomeProps {
  onSelectSuggestion: (suggestion: string) => void;
  disabled?: boolean;
  welcomeTitle?: string;
  welcomeDescription?: string;
  suggestedPrompts?: string[];
}

export function ChatWelcome({
  onSelectSuggestion,
  disabled = false,
  welcomeTitle,
  welcomeDescription,
  suggestedPrompts,
}: ChatWelcomeProps) {
  const defaultSuggestions = [
    {
      icon: Hotel,
      title: "Hébergement Romantique",
      prompt: "Je cherche un riad romantique à Marrakech pour ce weekend.",
      color: "text-rose-500 bg-rose-500/10",
    },
    {
      icon: MapIcon,
      title: "Aventure dans l'Atlas",
      prompt: "Propose-moi une randonnée de 2 jours dans l'Atlas.",
      color: "text-emerald-500 bg-emerald-500/10",
    },
    {
      icon: Compass,
      title: "Activités Locales",
      prompt: "Quelles sont les meilleures activités culturelles à Fès ?",
      color: "text-blue-500 bg-blue-500/10",
    },
    {
      icon: Tag,
      title: "Offres Spéciales",
      prompt: "Montre-moi les offres de dernière minute pour Agadir.",
      color: "text-amber-500 bg-amber-500/10",
    },
  ];

  const iconPalette = [Hotel, MapIcon, Compass, Tag];
  const colorPalette = [
    "text-rose-500 bg-rose-500/10",
    "text-emerald-500 bg-emerald-500/10",
    "text-blue-500 bg-blue-500/10",
    "text-amber-500 bg-amber-500/10",
  ];

  const suggestions =
    Array.isArray(suggestedPrompts) && suggestedPrompts.length > 0
      ? suggestedPrompts.slice(0, 4).map((prompt, index) => ({
          icon: iconPalette[index % iconPalette.length],
          title: `Suggestion ${index + 1}`,
          prompt,
          color: colorPalette[index % colorPalette.length],
        }))
      : defaultSuggestions;

  const title =
    welcomeTitle || "Bonjour, je suis votre Assistant Voyage";
  const description =
    welcomeDescription ||
    "Je peux vous aider à planifier votre séjour au Maroc, trouver des hébergements uniques et réserver des expériences inoubliables.";

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 max-w-4xl mx-auto w-full">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-12"
      >
        <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Compass className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight mb-4">{title}</h1>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto">
          {description}
        </p>
      </motion.div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-3xl"
      >
        {suggestions.map((suggestion) => (
          <motion.button
            key={suggestion.prompt}
            type="button"
            variants={item}
            disabled={disabled}
            onClick={() => onSelectSuggestion(suggestion.prompt)}
            className="group flex items-start gap-4 p-4 rounded-xl border bg-card hover:bg-accent/50 hover:border-primary/30 transition-all text-left disabled:opacity-50 disabled:pointer-events-none"
          >
            <div
              className={`p-3 rounded-lg ${suggestion.color} group-hover:scale-110 transition-transform`}
            >
              <suggestion.icon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">{suggestion.title}</h3>
              <p className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                {suggestion.prompt}
              </p>
            </div>
          </motion.button>
        ))}
      </motion.div>
    </div>
  );
}
