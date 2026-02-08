"use client";

import { Bike, Calendar, Loader2, MapPin, Search, Users } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { ExperienceCard } from "@/components/experience-card";
import { ExperienceGroup } from "@/components/explore";
import { FooterSection } from "@/components/home/FooterSection";
import { TestimonialSection } from "@/components/home/TestimonialSection";
import { MarketingHeader } from "@/components/site/MarketingHeader";
import { Button } from "@/components/ui/button";
import { useDebounce } from "@/hooks/use-debounce";
import { useInfiniteExperiences } from "@/hooks/use-experiences";
import { useAllCategoryGroups } from "@/hooks/use-experiences-by-category";
import type { ExperienceSort, ExperienceType } from "@/types/experience";

export default function ExplorePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [locationQuery, setLocationQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 500);

  const [activeType, setActiveType] = useState<ExperienceType | "all">("all");
  const [activeSort] = useState<ExperienceSort>("newest");

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
      search: debouncedSearch || locationQuery,
      type: activeType === "all" ? undefined : activeType,
      sort: activeSort,
      pageSize: 12,
    },
    // Only enable search when user has entered a query
    !!(debouncedSearch || locationQuery),
  );

  const searchResults = searchData?.pages.flatMap((page) => page.items) || [];

  const handleSearch = () => {
    if (locationQuery) {
      setSearchQuery(locationQuery);
    }
  };

  const showSearchResults =
    debouncedSearch.length > 0 || locationQuery.length > 0;

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
            <button
              type="button"
              className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 rounded-full transition-colors flex-1 justify-center min-w-0"
            >
              <Bike className="w-5 h-5 text-[#ff2566] shrink-0" />
              <div className="text-left min-w-0 hidden sm:block">
                <p className="text-xs text-gray-400">Activity</p>
                <p className="text-sm text-white">All Activity</p>
              </div>
            </button>

            {/* Divider */}
            <div className="w-px h-8 bg-white/10" />

            {/* When */}
            <button
              type="button"
              className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 rounded-full transition-colors flex-1 justify-center min-w-0"
            >
              <Calendar className="w-5 h-5 text-[#ff2566] shrink-0" />
              <div className="text-left min-w-0 hidden sm:block">
                <p className="text-xs text-gray-400">When</p>
                <p className="text-sm text-white">Choose a Date</p>
              </div>
            </button>

            {/* Divider */}
            <div className="w-px h-8 bg-white/10" />

            {/* Guests */}
            <button
              type="button"
              className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 rounded-full transition-colors flex-1 justify-center min-w-0"
            >
              <Users className="w-5 h-5 text-[#ff2566] shrink-0" />
              <div className="text-left min-w-0 hidden sm:block">
                <p className="text-xs text-gray-400">Guests</p>
                <p className="text-sm text-white">1 guest</p>
              </div>
            </button>

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
                Résultats pour &quot;{debouncedSearch || locationQuery}&quot;
              </h2>
              <Button
                variant="ghost"
                onClick={() => {
                  setSearchQuery("");
                  setLocationQuery("");
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
                    // Could navigate to a category-specific page
                    console.log("More clicked for", group.categoryTitle);
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

      {/* Custom CSS for hiding scrollbar */}
      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
