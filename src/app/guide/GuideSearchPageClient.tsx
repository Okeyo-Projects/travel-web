"use client";

import { useState } from "react";
import { GuideItemCard } from "@/components/guide/GuideItemCard";
import { GuideSearchFilters } from "@/components/guide/GuideSearchFilters";
import { useSiteI18n } from "@/components/site/site-i18n";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import { useGuideItemsSearch } from "@/hooks/use-guide-items-search";
import type { GuideItemSearchFilters } from "@/types/guide-items";

interface CityOption {
  slug: string;
  name: string;
}

interface GuideItemTypeOption {
  slug: string;
  label: string;
}

interface GuideSearchPageClientProps {
  cities: CityOption[];
  guideTypes: GuideItemTypeOption[];
}

export function GuideSearchPageClient({ cities }: GuideSearchPageClientProps) {
  const { t, locale } = useSiteI18n();
  const [filters, setFilters] = useState<GuideItemSearchFilters>({
    query: "",
    limit: 20,
    minSimilarity: 0.7,
  });
  const [submittedFilters, setSubmittedFilters] =
    useState<GuideItemSearchFilters>(filters);

  const { results, isLoading, isError, error } =
    useGuideItemsSearch(submittedFilters);

  const handleSubmit = () => {
    setSubmittedFilters(filters);
  };

  const cityBySlug = new Map(cities.map((city) => [city.slug, city.name]));

  const hasSubmitted =
    Boolean(submittedFilters.query?.trim()) ||
    Boolean(submittedFilters.citySlug?.trim()) ||
    Boolean(submittedFilters.kinds?.length);

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t("guide.search.title")}
          </h1>
          <p className="text-muted-foreground mt-2">
            {t("guide.search.subtitle")}
          </p>
        </div>

        <GuideSearchFilters
          filters={filters}
          onChange={setFilters}
          onSubmit={handleSubmit}
          cities={cities}
          locale={locale}
          isLoading={isLoading}
        />

        {isError ? (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
            <p className="font-medium">{t("guide.search.errorTitle")}</p>
            <p className="text-sm mt-1">
              {error?.message ?? t("guide.search.errorFallback")}
            </p>
          </div>
        ) : null}

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Spinner className="w-8 h-8" />
          </div>
        ) : hasSubmitted && results.length === 0 ? (
          <Empty className="py-16">
            <EmptyHeader>
              <EmptyTitle>{t("guide.search.emptyTitle")}</EmptyTitle>
              <EmptyDescription>
                {t("guide.search.emptyDescription")}
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent />
          </Empty>
        ) : hasSubmitted ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t("guide.search.resultsCount", { count: results.length })}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {results.map((item) => (
                <GuideItemCard
                  key={item.id}
                  item={item}
                  locale={locale}
                  cityName={cityBySlug.get(item.city_slug)}
                />
              ))}
            </div>
          </div>
        ) : (
          <Empty className="py-16">
            <EmptyHeader>
              <EmptyTitle>{t("guide.search.initialTitle")}</EmptyTitle>
              <EmptyDescription>
                {t("guide.search.initialDescription")}
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent />
          </Empty>
        )}
      </div>
    </div>
  );
}
