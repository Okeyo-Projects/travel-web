"use client";

import { createContext, type ReactNode, useContext } from "react";
import {
  type AppLocale,
  createTranslator,
  getLocaleDirection,
  type LocaleDirection,
  type MessageTree,
  type Translator,
} from "@/lib/i18n";

type TranslationsContextValue = {
  locale: AppLocale;
  dir: LocaleDirection;
  messages: MessageTree;
  t: Translator;
};

const TranslationsContext = createContext<TranslationsContextValue | null>(
  null,
);

interface TranslationsProviderProps {
  children: ReactNode;
  locale: AppLocale;
  messages: MessageTree;
}

export function TranslationsProvider({
  children,
  locale,
  messages,
}: TranslationsProviderProps) {
  const t = createTranslator(messages);

  return (
    <TranslationsContext.Provider
      value={{
        locale,
        dir: getLocaleDirection(locale),
        messages,
        t,
      }}
    >
      {children}
    </TranslationsContext.Provider>
  );
}

export function useTranslations() {
  const context = useContext(TranslationsContext);

  if (!context) {
    throw new Error(
      "useTranslations must be used within a TranslationsProvider.",
    );
  }

  return context;
}

export function useT() {
  return useTranslations().t;
}
