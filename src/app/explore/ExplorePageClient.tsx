"use client";

import { addDays, format, startOfDay } from "date-fns";
import {
  Calendar,
  Home,
  MapPin,
  Minus,
  Plus,
  Search,
  Users,
} from "lucide-react";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { DateRange } from "react-day-picker";
import { CompactExperienceCard, ExperienceGroup } from "@/components/explore";
import { ExperienceDetailModal } from "@/components/explore/ExperienceDetailModal";
import { FooterSection } from "@/components/home/FooterSection";
import { MarketingHeader } from "@/components/site/MarketingHeader";
import { useSiteI18n } from "@/components/site/site-i18n";
import { Button } from "@/components/ui/button";
import { Calendar as DatePickerCalendar } from "@/components/ui/calendar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { ExploreCategoryGroup } from "@/lib/explore/server";
import { getIntlLocale } from "@/lib/i18n";
import { localizeHref } from "@/lib/routing/locale-path";
import { buildCategorySlug } from "@/lib/routing/slugs";
import type { ExperienceListItem, ExperienceType } from "@/types/experience";

interface ExplorePageClientProps {
  categoryGroups: ExploreCategoryGroup[];
  searchResults: ExperienceListItem[];
  hasMoreSearchResults: boolean;
  testimonialSection?: React.ReactNode;
}

export function ExplorePageClient({
  categoryGroups,
  searchResults,
  hasMoreSearchResults,
  testimonialSection,
}: ExplorePageClientProps) {
  const { locale, t } = useSiteI18n();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const qParam = searchParams.get("q") ?? "";
  const typeParam = (searchParams.get("type") ?? "all") as
    | ExperienceType
    | "all";
  const dateFromParam = searchParams.get("dateFrom") ?? "";
  const dateToParam = searchParams.get("dateTo") ?? "";
  const guestsParam = Math.max(
    1,
    Number(searchParams.get("guests") ?? "1") || 1,
  );
  const pageParam = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);

  const [locationInput, setLocationInput] = useState(qParam);
  const [activeSearchIndex, setActiveSearchIndex] = useState<number | null>(
    null,
  );

  useEffect(() => {
    setLocationInput(qParam);
  }, [qParam]);

  const activeType = typeParam;
  const dateFrom = dateFromParam || undefined;
  const dateRange: DateRange | undefined = dateFromParam
    ? {
        from: new Date(dateFromParam),
        to: dateToParam ? new Date(dateToParam) : undefined,
      }
    : undefined;
  const guestsCount = guestsParam;

  const updateParams = (
    updates: Record<string, string | null>,
    options?: { resetPage?: boolean },
  ) => {
    const params = new URLSearchParams(searchParams.toString());

    if (options?.resetPage !== false) {
      params.delete("page");
    }

    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }

    const query = params.toString();
    router.replace(`${pathname}${query ? `?${query}` : ""}`, {
      scroll: false,
    });
  };

  const formatDateLabel = (value: Date) =>
    new Intl.DateTimeFormat(getIntlLocale(locale), {
      day: "2-digit",
      month: "short",
    }).format(value);

  const dateLabel = dateRange?.from
    ? dateRange.to
      ? `${formatDateLabel(dateRange.from)} - ${formatDateLabel(dateRange.to)}`
      : formatDateLabel(dateRange.from)
    : t("explore.filters.date.empty");

  const activityLabel =
    activeType === "all"
      ? t("explore.filters.activity.options.all")
      : activeType === "lodging"
        ? t("explore.filters.activity.options.lodging")
        : "";

  const guestsLabel =
    guestsCount === 1
      ? t("explore.filters.guests.countOne", { count: guestsCount })
      : t("explore.filters.guests.countOther", { count: guestsCount });

  const hasSearchText = qParam.length > 0;
  const hasActiveFilters =
    activeType !== "all" || Boolean(dateFrom) || guestsCount > 1;
  const showSearchResults = hasSearchText || hasActiveFilters;

  const handleSearch = () => {
    updateParams({ q: locationInput.trim() || null });
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="relative h-[400px] sm:h-[500px]">
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=2000&q=80"
            alt={t("explore.hero.imageAlt")}
            fill
            className="w-full h-full object-cover"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-black/40" />
        </div>

        <div className="relative z-10 mx-auto flex h-full w-full max-w-[1280px] flex-col px-5 pt-5 sm:px-8 sm:pt-8">
          <MarketingHeader />
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <h1 className="mb-3 text-3xl font-bold text-white sm:text-4xl md:text-5xl">
              {t("explore.hero.title")}
            </h1>
            <p className="max-w-2xl text-sm text-white/80 sm:text-base">
              {t("explore.hero.description")}
            </p>
            <div className="hidden max-w-2xl pt-4 text-sm text-white/60 lg:block">
              <p>
                Découvrez une sélection unique d&apos;expériences de voyage au
                Maroc. Que vous cherchiez un riad authentique à Marrakech, une
                aventure dans le désert, ou un séjour paisible dans les
                montagnes de l&apos;Atlas, notre assistant IA vous aide à
                trouver le séjour idéal adapté à vos envies et votre budget.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-20 -mt-8 px-4">
        <div className="mx-auto max-w-5xl">
          <div className="flex items-center rounded-full bg-[#1a1a1a] p-2 shadow-2xl">
            <div className="flex min-w-0 flex-[2] items-center gap-3 rounded-full px-4 py-3 transition-colors hover:bg-white/5">
              <MapPin className="h-5 w-5 shrink-0 text-[#ff2566]" />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-gray-400">
                  {t("explore.filters.location.label")}
                </p>
                <input
                  type="text"
                  placeholder={t("explore.filters.location.placeholder")}
                  value={locationInput}
                  onChange={(e) => setLocationInput(e.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      handleSearch();
                    }
                  }}
                  className="w-full border-none bg-transparent p-0 text-sm text-white outline-none placeholder:text-gray-500"
                />
              </div>
            </div>

            <div className="h-8 w-px bg-white/10" />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-center justify-center gap-3 rounded-full px-4 py-3 transition-colors hover:bg-white/5"
                >
                  <Home className="h-5 w-5 shrink-0 text-[#ff2566]" />
                  <div className="hidden min-w-0 text-left sm:block">
                    <p className="text-xs text-gray-400">
                      {t("explore.filters.activity.label")}
                    </p>
                    <p className="text-sm text-white">{activityLabel}</p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-44">
                <DropdownMenuItem onClick={() => updateParams({ type: null })}>
                  {t("explore.filters.activity.options.all")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => updateParams({ type: "lodging" })}
                >
                  {t("explore.filters.activity.options.lodging")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="h-8 w-px bg-white/10" />

            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-center justify-center gap-3 rounded-full px-4 py-3 transition-colors hover:bg-white/5"
                >
                  <Calendar className="h-5 w-5 shrink-0 text-[#ff2566]" />
                  <div className="hidden min-w-0 text-left sm:block">
                    <p className="text-xs text-gray-400">
                      {t("explore.filters.date.label")}
                    </p>
                    <p className="text-sm text-white">{dateLabel}</p>
                  </div>
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-auto p-3">
                <DatePickerCalendar
                  mode="range"
                  selected={dateRange}
                  onSelect={(range) =>
                    updateParams({
                      dateFrom: range?.from
                        ? format(range.from, "yyyy-MM-dd")
                        : null,
                      dateTo: range?.to ? format(range.to, "yyyy-MM-dd") : null,
                    })
                  }
                  disabled={(date) => startOfDay(date) < startOfDay(new Date())}
                  numberOfMonths={1}
                />
                {dateRange?.from && (
                  <div className="mt-2 flex justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        updateParams({ dateFrom: null, dateTo: null })
                      }
                    >
                      {t("explore.filters.date.clear")}
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>

            <div className="h-8 w-px bg-white/10" />

            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-center justify-center gap-3 rounded-full px-4 py-3 transition-colors hover:bg-white/5"
                >
                  <Users className="h-5 w-5 shrink-0 text-[#ff2566]" />
                  <div className="hidden min-w-0 text-left sm:block">
                    <p className="text-xs text-gray-400">
                      {t("explore.filters.guests.label")}
                    </p>
                    <p className="text-sm text-white">{guestsLabel}</p>
                  </div>
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-56">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">
                      {t("explore.filters.guests.title")}
                    </p>
                    <p className="text-xs text-gray-500">
                      {t("explore.filters.guests.hint")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() =>
                        updateParams({
                          guests:
                            guestsCount > 2 ? String(guestsCount - 1) : null,
                        })
                      }
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-6 text-center text-sm font-medium">
                      {guestsCount}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() =>
                        updateParams({ guests: String(guestsCount + 1) })
                      }
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            <div className="ml-2 hidden h-8 w-px bg-white/10 sm:block" />

            <button
              type="button"
              onClick={handleSearch}
              className="ml-2 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#ff2566] transition-colors hover:bg-[#e0205a]"
            >
              <Search className="h-5 w-5 text-white" />
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-16">
        {showSearchResults ? (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">
                {qParam
                  ? t("explore.results.titleWithQuery", { query: qParam })
                  : t("explore.results.titleFiltered")}
              </h2>
              <Button
                variant="ghost"
                onClick={() => {
                  setLocationInput("");
                  router.replace(pathname, { scroll: false });
                }}
                className="text-gray-600 hover:text-gray-900"
              >
                {t("explore.results.clearSearch")}
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {searchResults.map((experience, index) => (
                <CompactExperienceCard
                  key={experience.id}
                  experience={experience}
                  onOpenDetails={() => setActiveSearchIndex(index)}
                />
              ))}
            </div>

            <ExperienceDetailModal
              open={activeSearchIndex !== null}
              experiences={searchResults}
              startIndex={activeSearchIndex ?? 0}
              onClose={() => setActiveSearchIndex(null)}
            />

            {searchResults.length === 0 && (
              <div className="py-24 text-center">
                <Search className="mx-auto mb-4 h-16 w-16 text-gray-300" />
                <p className="text-lg text-gray-500">
                  {t("explore.results.empty")}
                </p>
                <Button
                  variant="link"
                  onClick={() => {
                    setLocationInput("");
                    router.replace(pathname, { scroll: false });
                  }}
                  className="mt-2 text-[#ff2566]"
                >
                  {t("explore.results.reset")}
                </Button>
              </div>
            )}

            {hasMoreSearchResults && (
              <div className="flex justify-center py-8">
                <Button
                  variant="outline"
                  onClick={() =>
                    updateParams(
                      { page: String(pageParam + 1) },
                      { resetPage: false },
                    )
                  }
                >
                  {t("explore.results.loadMore")}
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            {categoryGroups.map((group) => (
              <ExperienceGroup
                key={group.categoryId}
                title={group.categoryTitle}
                subtitle={
                  group.experiences.length === 1
                    ? t("explore.browse.groupSubtitle.one", {
                        count: group.experiences.length,
                      })
                    : t("explore.browse.groupSubtitle.other", {
                        count: group.experiences.length,
                      })
                }
                imageUrl={group.categoryAsset}
                experiences={group.experiences}
                onMoreClick={() => {
                  router.push(
                    localizeHref(
                      `/explore/region/${buildCategorySlug({
                        title: group.categoryTitle,
                        slug: group.categorySlug,
                      })}`,
                      pathname,
                    ),
                  );
                }}
              />
            ))}

            {categoryGroups.length === 0 && (
              <div className="py-24 text-center">
                <p className="text-lg text-gray-500">
                  {t("explore.browse.empty")}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {!showSearchResults && testimonialSection}
      <FooterSection />
    </div>
  );
}
