"use client"

import { useState } from "react"
import { Search, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ExperienceCard } from "@/components/experience-card"
import { Filters } from "@/components/filters"
import type { ExperienceType, ExperienceSort } from "@/types/experience"
import { useInfiniteExperiences } from "@/hooks/use-experiences"
import { useDebounce } from "@/hooks/use-debounce"

export default function ExplorePage() {
  const [searchQuery, setSearchQuery] = useState("")
  const debouncedSearch = useDebounce(searchQuery, 500)
  
  const [activeType, setActiveType] = useState<ExperienceType | "all">("all")
  const [activeSort, setActiveSort] = useState<ExperienceSort>("newest")
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000])
  const [showFeaturedOnly, setShowFeaturedOnly] = useState(false)

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError
  } = useInfiniteExperiences({
    search: debouncedSearch,
    type: activeType === "all" ? undefined : activeType,
    sort: activeSort,
    priceMin: priceRange[0],
    priceMax: priceRange[1] === 10000 ? undefined : priceRange[1],
    featured: showFeaturedOnly,
    pageSize: 12
  })

  const experiences = data?.pages.flatMap(page => page.items) || []

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="flex flex-col space-y-4">
        <h1 className="text-3xl font-bold tracking-tight">Explorer nos trésors</h1>
        <p className="text-muted-foreground max-w-2xl">
          Découvrez des expériences uniques et des lieux d'exception pour votre prochain voyage.
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center sticky top-20 z-30 bg-background/95 backdrop-blur py-4 -mx-4 px-4 border-b md:border-none md:bg-transparent md:backdrop-blur-none md:static md:p-0">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher une destination, une activité..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 w-full bg-background"
          />
        </div>
        <Filters
          activeType={activeType}
          onTypeChange={setActiveType}
          activeSort={activeSort}
          onSortChange={setActiveSort}
          priceRange={priceRange}
          onPriceRangeChange={setPriceRange}
          showFeaturedOnly={showFeaturedOnly}
          onFeaturedChange={setShowFeaturedOnly}
          onClearFilters={() => {
            setActiveType("all")
            setActiveSort("newest")
            setPriceRange([0, 10000])
            setShowFeaturedOnly(false)
            setSearchQuery("")
          }}
        />
      </div>

      {isError ? (
        <div className="text-center py-24 text-red-500">
          Une erreur est survenue lors du chargement des expériences.
        </div>
      ) : isLoading ? (
        <div className="flex justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {experiences.map((experience) => (
              <ExperienceCard key={experience.id} experience={experience} />
            ))}
          </div>

          {experiences.length === 0 && (
            <div className="text-center py-24">
              <p className="text-muted-foreground text-lg">Aucun résultat trouvé pour votre recherche.</p>
              <Button 
                variant="link"
                onClick={() => {
                  setSearchQuery("")
                  setActiveType("all")
                  setPriceRange([0, 10000])
                }}
                className="mt-2"
              >
                Réinitialiser les filtres
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
  )
}
