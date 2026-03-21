"use client";

import { Search, Sparkles } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";
import { useSiteI18n } from "@/components/site/site-i18n";
import { SupportMarkdown } from "@/components/support/SupportMarkdown";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { resolveMessageValue } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  SUPPORT_CATEGORY_OPTIONS,
  SUPPORT_FAQ_ITEMS,
  type SupportFaqFilter,
} from "@/types/support";

type SupportFaqProps = {
  formHref?: string;
};

export function SupportFaq({ formHref = "#report-an-issue" }: SupportFaqProps) {
  const { messages, t } = useSiteI18n();
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<SupportFaqFilter>("all");
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

  const localizedCategories = useMemo(
    () =>
      SUPPORT_CATEGORY_OPTIONS.map((option) => ({
        value: option.value,
        label: t(`support.faq.categories.${option.value}`),
      })),
    [t],
  );

  const localizedFaqs = useMemo(
    () =>
      SUPPORT_FAQ_ITEMS.map((item) => {
        const keywordsValue = resolveMessageValue(
          messages,
          `support.faq.items.${item.id}.keywords`,
        );
        const keywords =
          keywordsValue && typeof keywordsValue === "object"
            ? Object.values(keywordsValue).filter(
                (value): value is string => typeof value === "string",
              )
            : [];

        return {
          ...item,
          question: t(`support.faq.items.${item.id}.question`),
          answer: t(`support.faq.items.${item.id}.answer`),
          keywords,
        };
      }),
    [messages, t],
  );

  const filteredFaqs = useMemo(() => {
    return localizedFaqs.filter((item) => {
      const matchesCategory =
        activeCategory === "all" || item.category === activeCategory;

      if (!matchesCategory) {
        return false;
      }

      if (!deferredQuery) {
        return true;
      }

      const haystack = [item.question, item.answer, ...item.keywords]
        .join(" ")
        .toLowerCase();

      return haystack.includes(deferredQuery);
    });
  }, [activeCategory, deferredQuery, localizedFaqs]);

  const resultsLabel =
    filteredFaqs.length === 1
      ? t("support.faq.results.one", { count: filteredFaqs.length })
      : t("support.faq.results.other", { count: filteredFaqs.length });

  return (
    <section className="space-y-6 rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)] sm:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <span className="inline-flex items-center gap-2 rounded-full bg-[#fff1f5] px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-[#d12d61]">
            <Sparkles className="size-3.5" />
            {t("support.faq.eyebrow")}
          </span>
          <div className="space-y-2">
            <h2 className="text-3xl font-semibold tracking-tight text-slate-950">
              {t("support.faq.title")}
            </h2>
            <p className="max-w-2xl text-sm leading-6 text-slate-600">
              {t("support.faq.description")}
            </p>
          </div>
        </div>

        <div className="relative w-full max-w-md">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("support.faq.searchPlaceholder")}
            className="h-12 rounded-full border-slate-200 bg-slate-50 pl-11 text-sm shadow-none"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {localizedCategories.map((option) => {
          const isActive = option.value === activeCategory;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setActiveCategory(option.value)}
              className={cn(
                "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "border-[#d12d61] bg-[#d12d61] text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-sm text-slate-500">
        {resultsLabel}
      </div>

      {filteredFaqs.length > 0 ? (
        <Accordion type="single" collapsible className="space-y-3">
          {filteredFaqs.map((item) => (
            <AccordionItem
              key={item.id}
              value={item.id}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white px-5"
            >
              <AccordionTrigger className="gap-6 py-5 text-left text-base font-semibold text-slate-950 hover:no-underline">
                {item.question}
              </AccordionTrigger>
              <AccordionContent className="pb-5">
                <SupportMarkdown content={item.answer} />
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      ) : (
        <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
          <h3 className="text-lg font-semibold text-slate-950">
            {t("support.faq.emptyTitle")}
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {t("support.faq.emptyDescription")}
          </p>
          <Button
            asChild
            className="mt-5 rounded-full bg-[#d12d61] px-6 hover:bg-[#b82755]"
          >
            <a href={formHref}>{t("support.faq.emptyCta")}</a>
          </Button>
        </div>
      )}
    </section>
  );
}
