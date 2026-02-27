"use client";

import { addDays, format } from "date-fns";
import {
  Bike,
  Calendar,
  Loader2,
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
import { ExperienceCard } from "@/components/experience-card";
import { ExperienceGroup } from "@/components/explore";
import { FooterSection } from "@/components/home/FooterSection";
import { TestimonialSection } from "@/components/home/TestimonialSection";
import { MarketingHeader } from "@/components/site/MarketingHeader";
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
import { useCategories } from "@/hooks/use-categories";
import { useDebounce } from "@/hooks/use-debounce";
import { useInfiniteExperiences } from "@/hooks/use-experiences";
import { useAllCategoryGroups } from "@/hooks/use-experiences-by-category";
import { localizeHref } from "@/lib/routing/locale-path";
import { buildCategorySlug } from "@/lib/routing/slugs";
import type { ExperienceSort, ExperienceType } from "@/types/experience";

export default function ExplorePage() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const categoryQuery = searchParams.get("category");
  const { data: categories } = useCategories();
  const [searchQuery, setSearchQuery] = useState("");
  const [locationQuery, setLocationQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 500);

  const [activeType, setActiveType] = useState<ExperienceType | "all">("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [guestsCount, setGuestsCount] = useState(1);
  const [activeSort] = useState<ExperienceSort>("newest");

  const dateFrom = dateRange?.from
    ? format(dateRange.from, "yyyy-MM-dd")
    : undefined;
  const dateTo = dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : undefined;
  const dateLabel = dateRange?.from
    ? dateRange.to
      ? `${format(dateRange.from, "dd MMM")} - ${format(dateRange.to, "dd MMM")}`
      : format(dateRange.from, "dd MMM")
    : "Choose a Date";
  const activityLabel =
    activeType === "all"
      ? "All Activity"
      : activeType === "lodging"
        ? "Stays"
        : activeType === "trip"
          ? "Trips"
          : "Activities";
  const guestsLabel = `${guestsCount} guest${guestsCount > 1 ? "s" : ""}`;
  const hasSearchText = debouncedSearch.length > 0 || locationQuery.length > 0;
  const hasActiveFilters =
    activeType !== "all" || Boolean(dateFrom) || guestsCount > 1;

  // Fetch category groups for the browse view (when not searching)
  const { data: categoryGroups, isLoading: isLoadingGroups } =
    useAllCategoryGroups(8);

  // Fetch experiences for search results
  const {
    data: searchData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isLoadingSearch,
    isError: isSearchError,
  } = useInfiniteExperiences(
    {
      search: debouncedSearch || locationQuery || undefined,
      type: activeType === "all" ? undefined : activeType,
      guests: guestsCount > 1 ? guestsCount : undefined,
      dateFrom,
      dateTo,
      sort: activeSort,
      pageSize: 12,
    },
    // Enable search with either query text or active filters
    hasSearchText || hasActiveFilters,
  );

  const searchResults = searchData?.pages.flatMap((page) => page.items) || [];

  const handleSearch = () => {
    setSearchQuery(locationQuery.trim());
  };

  const showSearchResults = hasSearchText || hasActiveFilters;

  useEffect(() => {
    if (!categoryQuery || !categories || categories.length === 0) {
      return;
    }

    const category = categories.find((item) => item.id === categoryQuery);
    if (!category) {
      return;
    }

    router.replace(
      localizeHref(
        `/explore/category/${buildCategorySlug({
          title: category.title,
        })}`,
        pathname,
      ),
    );
  }, [categoryQuery, categories, pathname, router]);

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section with Background Image */}
      <div className="relative h-[400px] sm:h-[500px]">
        {/* Background Image */}
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=2000&q=80"
            alt="Travel promotion"
            fill
            className="w-full h-full object-cover"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-black/40" />
        </div>

        {/* Content */}
        <div className="relative z-10 mx-auto flex h-full w-full max-w-[1280px] flex-col px-5 pt-5 sm:px-8 sm:pt-8">
          <MarketingHeader />
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-3">
              Travel With Our Royal Service
            </h1>
            <p className="text-white/80 text-sm sm:text-base max-w-2xl">
              Lorem Ipsum Dolor Sit Amet, Consectetur Adipiscing Elit, Sed Do
              Eiusmod Tempor Incididunt Ut Labore Et Dolore Magna Aliqua. Ut
              Enim Ad Minim Veniam, Quis No
            </p>
          </div>
        </div>
      </div>

      {/* Search Section - Below the image */}
      <div className="relative z-20 -mt-8 px-4">
        <div className="max-w-5xl mx-auto">
          {/* Dark Search Bar */}
          <div className="bg-[#1a1a1a] rounded-full p-2 flex items-center shadow-2xl">
            {/* Location - Twice as big (flex-2) */}
            <div className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 rounded-full transition-colors flex-[2] min-w-0">
              <MapPin className="w-5 h-5 text-[#ff2566] shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-400">Location</p>
                <input
                  type="text"
                  placeholder="Search for places..."
                  value={locationQuery}
                  onChange={(e) => setLocationQuery(e.target.value)}
                  className="w-full bg-transparent text-sm text-white placeholder-gray-500 outline-none border-none p-0"
                />
              </div>
            </div>

            {/* Divider */}
            <div className="w-px h-8 bg-white/10" />

            {/* Activity */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 rounded-full transition-colors flex-1 justify-center min-w-0"
                >
                  <Bike className="w-5 h-5 text-[#ff2566] shrink-0" />
                  <div className="text-left min-w-0 hidden sm:block">
                    <p className="text-xs text-gray-400">Activity</p>
                    <p className="text-sm text-white">{activityLabel}</p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-44">
                <DropdownMenuItem onClick={() => setActiveType("all")}>
                  All Activity
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveType("lodging")}>
                  Stays
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveType("trip")}>
                  Trips
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveType("activity")}>
                  Activities
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Divider */}
            <div className="w-px h-8 bg-white/10" />

            {/* When */}
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 rounded-full transition-colors flex-1 justify-center min-w-0"
                >
                  <Calendar className="w-5 h-5 text-[#ff2566] shrink-0" />
                  <div className="text-left min-w-0 hidden sm:block">
                    <p className="text-xs text-gray-400">When</p>
                    <p className="text-sm text-white">{dateLabel}</p>
                  </div>
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-auto p-3">
                <DatePickerCalendar
                  mode="range"
                  selected={dateRange}
                  onSelect={setDateRange}
                  disabled={(date) => date < addDays(new Date(), -1)}
                  numberOfMonths={1}
                />
                {dateRange?.from && (
                  <div className="mt-2 flex justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setDateRange(undefined)}
                    >
                      Clear
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>

            {/* Divider */}
            <div className="w-px h-8 bg-white/10" />

            {/* Guests */}
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 rounded-full transition-colors flex-1 justify-center min-w-0"
                >
                  <Users className="w-5 h-5 text-[#ff2566] shrink-0" />
                  <div className="text-left min-w-0 hidden sm:block">
                    <p className="text-xs text-gray-400">Guests</p>
                    <p className="text-sm text-white">{guestsLabel}</p>
                  </div>
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-56">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Guests</p>
                    <p className="text-xs text-gray-500">
                      Used for capacity filtering
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() =>
                        setGuestsCount((value) => Math.max(1, value - 1))
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
                      onClick={() => setGuestsCount((value) => value + 1)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Divider */}
            <div className="w-px h-8 bg-white/10 hidden sm:block" />

            {/* Search Button */}
            <button
              type="button"
              onClick={handleSearch}
              className="w-12 h-12 bg-[#ff2566] hover:bg-[#e0205a] rounded-full flex items-center justify-center transition-colors shrink-0 ml-2"
            >
              <Search className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-16">
        {showSearchResults ? (
          /* Search Results View */
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">
                {debouncedSearch || locationQuery
                  ? `Résultats pour "${debouncedSearch || locationQuery}"`
                  : "Résultats filtrés"}
              </h2>
              <Button
                variant="ghost"
                onClick={() => {
                  setSearchQuery("");
                  setLocationQuery("");
                  setActiveType("all");
                  setDateRange(undefined);
                  setGuestsCount(1);
                }}
                className="text-gray-600 hover:text-gray-900"
              >
                Effacer la recherche
              </Button>
            </div>

            {isSearchError ? (
              <div className="text-center py-24 text-red-500">
                Une erreur est survenue lors de la recherche.
              </div>
            ) : isLoadingSearch ? (
              <div className="flex justify-center py-24">
                <Loader2 className="h-8 w-8 animate-spin text-[#ff2566]" />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {searchResults.map((experience) => (
                    <ExperienceCard
                      key={experience.id}
                      experience={experience}
                    />
                  ))}
                </div>

                {searchResults.length === 0 && (
                  <div className="text-center py-24">
                    <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg">
                      Aucun résultat trouvé pour votre recherche.
                    </p>
                    <Button
                      variant="link"
                      onClick={() => {
                        setSearchQuery("");
                        setLocationQuery("");
                        setActiveType("all");
                        setDateRange(undefined);
                        setGuestsCount(1);
                      }}
                      className="mt-2 text-[#ff2566]"
                    >
                      Réinitialiser la recherche
                    </Button>
                  </div>
                )}

                {hasNextPage && (
                  <div className="flex justify-center py-8">
                    <Button
                      variant="outline"
                      onClick={() => fetchNextPage()}
                      disabled={isFetchingNextPage}
                    >
                      {isFetchingNextPage ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Chargement...
                        </>
                      ) : (
                        "Voir plus"
                      )}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          /* Browse View - Category Groups */
          <div className="space-y-8">
            {isLoadingGroups ? (
              <div className="flex justify-center py-24">
                <Loader2 className="h-8 w-8 animate-spin text-[#ff2566]" />
              </div>
            ) : (
              categoryGroups?.map((group) => (
                <ExperienceGroup
                  key={group.categoryId}
                  title={group.categoryTitle}
                  subtitle={`${group.experiences.length} expériences`}
                  imageUrl={group.categoryAsset}
                  experiences={group.experiences}
                  onMoreClick={() => {
                    router.push(
                      localizeHref(
                        `/explore/category/${buildCategorySlug({
                          title: group.categoryTitle,
                        })}`,
                        pathname,
                      ),
                    );
                  }}
                />
              ))
            )}

            {!isLoadingGroups &&
              (!categoryGroups || categoryGroups.length === 0) && (
                <div className="text-center py-24">
                  <p className="text-gray-500 text-lg">
                    Aucune expérience disponible pour le moment.
                  </p>
                </div>
              )}
          </div>
        )}
      </div>

      {/* Testimonial Section */}
      {!showSearchResults && <TestimonialSection />}

      {/* Footer Section */}
      <FooterSection />
    </div>
  );
}
